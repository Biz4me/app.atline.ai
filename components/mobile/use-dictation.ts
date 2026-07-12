'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

// Dictée vocale native (Web Speech API) — zéro dépendance.
// onResult reçoit chaque segment reconnu (finalisé) à insérer dans le champ.
type SR = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

export function useDictation(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const recRef = useRef<SR | null>(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  useEffect(() => {
    const Ctor = typeof window !== 'undefined'
      ? (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }).SpeechRecognition
        ?? (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition
      : undefined
    if (!Ctor) return
    setSupported(true)
    const rec = new Ctor()
    rec.lang = 'fr-FR'
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) onResultRef.current(e.results[i][0].transcript.trim())
      }
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    return () => { try { rec.stop() } catch { /* ignore */ } }
  }, [])

  const toggle = useCallback(() => {
    const rec = recRef.current
    if (!rec) return
    setListening((on) => {
      try { on ? rec.stop() : rec.start() } catch { /* ignore */ }
      return !on
    })
  }, [])

  return { supported, listening, toggle }
}
