'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

// Dictée « pousse-pour-parler » temps réel : on enregistre tant que le bouton est maintenu,
// l'audio streame en direct vers NOTRE STT (Deepgram Nova-3 via un WebSocket relayé par le service),
// les mots s'affichent au fil de la parole. Repli sur POST /api/stt si le WebSocket échoue.
type Opts = { getBase: () => string; onText: (full: string) => void }

export function usePushToTalk({ getBase, onText }: Opts) {
  const [supported, setSupported] = useState(false)
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false) // fin de flux : on attend le dernier segment

  const optsRef = useRef<Opts>({ getBase, onText })
  optsRef.current = { getBase, onText }

  const mrRef = useRef<MediaRecorder | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const baseRef = useRef('')
  const finalsRef = useRef<string[]>([])
  const interimRef = useRef('')
  const chunksRef = useRef<Blob[]>([])
  // Mobile : le WS s'ouvre APRÈS le 1er chunk (réseau lent) — on met en file au lieu de perdre
  // l'entête du conteneur (sans elle, Deepgram ne peut pas décoder le flux).
  const queueRef = useRef<Blob[]>([])
  const stopPendingRef = useRef(false)
  const mimeRef = useRef('audio/webm')

  useEffect(() => {
    setSupported(
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined' &&
      typeof WebSocket !== 'undefined',
    )
  }, [])

  // Recompose le champ : base figée (au démarrage) + segments finalisés + segment en cours.
  const compose = useCallback(() => {
    const live = [...finalsRef.current, interimRef.current].join(' ').replace(/\s+/g, ' ').trim()
    const base = baseRef.current
    optsRef.current.onText(base ? (live ? base + ' ' + live : base) : live)
  }, [])

  // Repli « prerecorded » : tout l'audio enregistré part en un POST (pas de WS, ou flux resté muet).
  const postFallback = useCallback(async () => {
    const blob = new Blob(chunksRef.current, { type: mimeRef.current })
    if (blob.size < 1200) { setBusy(false); return }
    setBusy(true)
    try {
      const r = await fetch('/api/stt', { method: 'POST', headers: { 'Content-Type': mimeRef.current }, body: blob })
      const d = r.ok ? await r.json().catch(() => null) : null
      const t = (d?.text ?? '').trim()
      if (t) { finalsRef.current = [t]; interimRef.current = ''; compose() }
    } catch { /* ignore */ }
    setBusy(false)
  }, [compose])

  const start = useCallback(async () => {
    if (recording || busy) return
    baseRef.current = optsRef.current.getBase()
    finalsRef.current = []
    interimRef.current = ''
    chunksRef.current = []
    queueRef.current = []
    stopPendingRef.current = false

    // Ticket d'accès au WebSocket (échoue en silence → repli POST)
    let ticket = ''
    try {
      const r = await fetch('/api/stt/ticket', { method: 'POST' })
      if (r.ok) ticket = (await r.json()).ticket || ''
    } catch { /* repli POST */ }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : ''
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      mimeRef.current = mime || 'audio/webm'

      if (ticket) {
        const proto = location.protocol === 'https:' ? 'wss' : 'ws'
        const ws = new WebSocket(`${proto}://${location.host}/sttws/stream?ticket=${encodeURIComponent(ticket)}`)
        ws.onopen = () => {
          // Les chunks arrivés pendant la poignée de main (mobile) partent maintenant, dans l'ordre.
          for (const b of queueRef.current) { try { ws.send(b) } catch { /* ignore */ } }
          queueRef.current = []
          if (stopPendingRef.current) { try { ws.send('stop') } catch { /* ignore */ } }
        }
        ws.onmessage = (ev) => {
          try {
            const d = JSON.parse(ev.data)
            const t = (d.transcript || '').trim()
            if (!t) return
            if (d.is_final) { finalsRef.current.push(t); interimRef.current = '' }
            else interimRef.current = t
            compose()
          } catch { /* ignore */ }
        }
        ws.onclose = () => {
          // Flux resté muet (réseau, décodage…) alors qu'on a de l'audio → repli POST complet.
          const noText = finalsRef.current.length === 0 && !interimRef.current
          const done = !mrRef.current || mrRef.current.state === 'inactive'
          if (noText && done && chunksRef.current.length) void postFallback()
          else setBusy(false)
        }
        wsRef.current = ws
      }

      mr.ondataavailable = (e) => {
        if (!e.data.size) return
        chunksRef.current.push(e.data)
        const ws = wsRef.current
        if (!ws) return
        if (ws.readyState === WebSocket.OPEN) ws.send(e.data)
        // Pas encore ouvert : on met en file — le 1er chunk porte l'entête du conteneur, le perdre rend le flux illisible.
        else if (ws.readyState === WebSocket.CONNECTING) queueRef.current.push(e.data)
      }

      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const ws = wsRef.current
        if (ws && ws.readyState === WebSocket.OPEN) {
          setBusy(true)
          try { ws.send('stop') } catch { /* ignore */ }
          setTimeout(() => { try { ws.close() } catch { /* ignore */ } }, 1500)
          return
        }
        if (ws && ws.readyState === WebSocket.CONNECTING) {
          // La poignée de main n'est pas finie : le « stop » partira à l'ouverture, après la file.
          setBusy(true)
          stopPendingRef.current = true
          setTimeout(() => { try { ws.close() } catch { /* ignore */ } }, 2500)
          return
        }
        // Pas de WebSocket → transcription « prerecorded » en un POST.
        await postFallback()
      }

      mr.start(250) // segments de 250 ms → flux continu vers Deepgram
      mrRef.current = mr
      setRecording(true)
    } catch { /* micro refusé/indisponible */ }
  }, [recording, busy, compose, postFallback])

  const stop = useCallback(() => {
    const mr = mrRef.current
    if (mr && mr.state !== 'inactive') mr.stop()
    setRecording(false)
  }, [])

  return { supported, recording, busy, start, stop }
}
