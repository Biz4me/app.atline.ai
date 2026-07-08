'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Video, Square, RotateCcw, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const NOVA = '#8B5CF6'

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const cands = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
  return cands.find((m) => MediaRecorder.isTypeSupported(m)) || ''
}

// Enregistreur vidéo Face : caméra in-app + téléprompteur (le script) → upload sur le ContentPost.
export function VideoRecorder({
  open,
  onClose,
  script,
  campaignId,
  postId,
  platform,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  script: string
  campaignId: string | null
  postId: string | null
  platform?: string
  onSaved: (id: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const promptRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const scrollTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const [ready, setReady] = useState(false)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: true })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
          videoRef.current.play().catch(() => {})
        }
        setReady(true)
      })
      .catch(() => setErr('Accès caméra refusé. Autorise la caméra et le micro dans ton navigateur.'))
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      if (scrollTimer.current) clearInterval(scrollTimer.current)
    }
  }, [open])

  useEffect(() => {
    if (!recording) return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [recording])

  if (!open || typeof window === 'undefined') return null

  function start() {
    const s = streamRef.current
    if (!s) return
    chunksRef.current = []
    const mime = pickMime()
    const rec = new MediaRecorder(s, mime ? { mimeType: mime } : undefined)
    rec.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data)
    }
    rec.onstop = () => {
      const b = new Blob(chunksRef.current, { type: mime || 'video/webm' })
      setBlob(b)
      setPreviewUrl(URL.createObjectURL(b))
    }
    rec.start()
    recRef.current = rec
    setElapsed(0)
    setRecording(true)
    // Téléprompteur : défilement doux pendant l'enregistrement
    if (promptRef.current) promptRef.current.scrollTop = 0
    scrollTimer.current = setInterval(() => {
      if (promptRef.current) promptRef.current.scrollTop += 1
    }, 60)
  }

  function stop() {
    recRef.current?.stop()
    setRecording(false)
    if (scrollTimer.current) clearInterval(scrollTimer.current)
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setBlob(null)
    setElapsed(0)
  }

  async function save() {
    if (!blob) return
    setSaving(true)
    try {
      let pid = postId
      if (!pid) {
        const r = await fetch('/api/nova/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId, caption: script, platform }),
        })
        if (!r.ok) throw new Error()
        pid = (await r.json()).post?.id
      }
      if (!pid) throw new Error()
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
      const fd = new FormData()
      fd.append('file', new File([blob], `bofu.${ext}`, { type: blob.type }))
      const up = await fetch(`/api/nova/content/${pid}/video`, { method: 'POST', body: fd })
      if (!up.ok) throw new Error()
      onSaved(pid)
      toast.success('Vidéo enregistrée')
      onClose()
    } catch {
      toast.error("Échec de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-black">
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button onClick={onClose} aria-label="Fermer" className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white">
          <X className="size-5" />
        </button>
        {recording && (
          <span className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="size-2 rounded-full bg-red-500" />
            {mm}:{ss}
          </span>
        )}
        <span className="w-9" />
      </div>

      <div className="relative flex-1 overflow-hidden">
        {previewUrl ? (
          <video src={previewUrl} controls playsInline className="size-full object-contain" />
        ) : (
          <>
            <video ref={videoRef} muted playsInline className="size-full object-cover [transform:scaleX(-1)]" />
            {script && (
              <div
                ref={promptRef}
                className="absolute inset-x-0 top-0 max-h-[40%] overflow-y-auto no-scrollbar bg-gradient-to-b from-black/70 to-transparent px-6 pb-10 pt-4"
              >
                <p className="whitespace-pre-line text-center text-lg font-semibold leading-relaxed text-white">{script}</p>
              </div>
            )}
            {err && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white">{err}</div>}
          </>
        )}
      </div>

      <div
        className="flex items-center justify-center gap-6 px-4 py-6"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        {previewUrl ? (
          <>
            <button onClick={retake} className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white">
              <RotateCcw className="size-4" />
              Refaire
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: NOVA }}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Utiliser
            </button>
          </>
        ) : recording ? (
          <button onClick={stop} aria-label="Arrêter" className="flex size-16 items-center justify-center rounded-full border-4 border-white bg-red-500">
            <Square className="size-6 text-white" />
          </button>
        ) : (
          <button
            onClick={start}
            disabled={!ready}
            aria-label="Enregistrer"
            className="flex size-16 items-center justify-center rounded-full border-4 border-white disabled:opacity-40"
            style={{ background: NOVA }}
          >
            <Video className="size-6 text-white" />
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
