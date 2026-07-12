'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

// Dictée « pousse-pour-parler » : on enregistre tant que le bouton est maintenu,
// au relâchement l'audio part vers NOTRE STT (Deepgram Nova-3 via /api/stt).
// Indépendant du navigateur (MediaRecorder = capture seule, la transcription est côté serveur).
export function usePushToTalk(onText: (text: string) => void) {
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false) // transcription en cours
  const [supported, setSupported] = useState(false)
  const mrRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const onTextRef = useRef(onText)
  onTextRef.current = onText

  useEffect(() => {
    setSupported(
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined',
    )
  }, [])

  const start = useCallback(async () => {
    if (recording || busy) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : ''
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const type = mr.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        if (blob.size < 1200) { setBusy(false); return } // trop court → on ignore
        setBusy(true)
        try {
          const r = await fetch('/api/stt', { method: 'POST', headers: { 'Content-Type': type }, body: blob })
          const d = r.ok ? await r.json().catch(() => null) : null
          const text = (d?.text ?? '').trim()
          if (text) onTextRef.current(text)
        } catch { /* réseau/STT KO → silencieux */ }
        setBusy(false)
      }
      mr.start()
      mrRef.current = mr
      setRecording(true)
    } catch { /* micro refusé ou indisponible */ }
  }, [recording, busy])

  const stop = useCallback(() => {
    const mr = mrRef.current
    if (mr && mr.state !== 'inactive') mr.stop()
    setRecording(false)
  }, [])

  return { supported, recording, busy, start, stop }
}
