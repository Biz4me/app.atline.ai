'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Video, Square, RotateCcw, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const NOVA = '#8B5CF6'
const CW = 720 // portrait 9:16 (short TikTok/Insta)
const CH = 1280

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const cands = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
  return cands.find((m) => MediaRecorder.isTypeSupported(m)) || ''
}

// Enregistreur vidéo Face : caméra in-app + téléprompteur, sortie forcée en PORTRAIT (canvas 9:16).
// La vidéo est stockée dans l'app (sur le ContentPost), pas dans la galerie du téléphone.
export function VideoRecorder({
  open,
  onClose,
  script,
  campaignId,
  postId,
  platform,
  onSaved,
  existingUrl,
}: {
  open: boolean
  onClose: () => void
  script: string
  campaignId: string | null
  postId: string | null
  platform?: string
  onSaved: (id: string) => void
  existingUrl?: string
}) {
  const rawRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const promptRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const rafRef = useRef(0)
  const scrollTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const [camera, setCamera] = useState(false)
  const [ready, setReady] = useState(false)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  function loop() {
    const canvas = canvasRef.current
    const raw = rawRef.current
    if (canvas && raw && raw.videoWidth) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const vw = raw.videoWidth
        const vh = raw.videoHeight
        const scale = Math.max(CW / vw, CH / vh) // cover
        const dw = vw * scale
        const dh = vh * scale
        ctx.drawImage(raw, (CW - dw) / 2, (CH - dh) / 2, dw, dh) // pixels NON miroir (sortie correcte)
      }
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  function startCamera() {
    setErr('')
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user', width: { ideal: CW }, height: { ideal: CH } }, audio: true })
      .then((s) => {
        streamRef.current = s
        setCamera(true)
        if (rawRef.current) {
          rawRef.current.srcObject = s
          rawRef.current.play().catch(() => {})
        }
        setReady(true)
        rafRef.current = requestAnimationFrame(loop)
      })
      .catch(() => setErr('Accès caméra refusé. Autorise la caméra et le micro dans ton navigateur.'))
  }

  function stopAll() {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (scrollTimer.current) clearInterval(scrollTimer.current)
    setCamera(false)
    setReady(false)
    setRecording(false)
  }

  useEffect(() => {
    if (!open) return
    setSaved(false)
    setPreviewUrl(null)
    setBlob(null)
    setErr('')
    if (!existingUrl) startCamera() // s'il y a déjà une vidéo, on la montre d'abord (pas besoin de la caméra)
    return () => stopAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!recording) return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [recording])

  if (!open || typeof window === 'undefined') return null

  function start() {
    const canvas = canvasRef.current
    const s = streamRef.current
    if (!canvas || !s) return
    chunksRef.current = []
    const cstream = canvas.captureStream(30) // on enregistre le CANVAS portrait, pas la caméra brute
    s.getAudioTracks().forEach((t) => cstream.addTrack(t))
    const mime = pickMime()
    const rec = new MediaRecorder(cstream, mime ? { mimeType: mime } : undefined)
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
    setSaved(false)
    setElapsed(0)
    if (!camera) startCamera()
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
      fd.append('file', new File([blob], `video.${ext}`, { type: blob.type }))
      const up = await fetch(`/api/nova/content/${pid}/video`, { method: 'POST', body: fd })
      if (!up.ok) throw new Error()
      onSaved(pid)
      setSaved(true)
      toast.success('Vidéo enregistrée dans ta campagne')
    } catch {
      toast.error("Échec de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  const showNew = !!previewUrl
  const showExisting = !previewUrl && !!existingUrl

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
        {saved && !recording && <span className="text-xs font-semibold text-white/80">Enregistrée dans l&apos;app ✓</span>}
        <span className="w-9" />
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {showNew ? (
          <video src={previewUrl!} controls playsInline className="max-h-full max-w-full" />
        ) : showExisting ? (
          <video src={existingUrl} controls playsInline className="max-h-full max-w-full" />
        ) : (
          <>
            <video ref={rawRef} muted playsInline className="hidden" />
            {/* pixels non-miroir (sortie correcte), affichage miroir (naturel) */}
            <canvas ref={canvasRef} width={CW} height={CH} className="h-full w-auto [transform:scaleX(-1)]" />
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
        {showNew && !saved ? (
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
        ) : showNew || showExisting ? (
          <>
            <button onClick={retake} className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white">
              <RotateCcw className="size-4" />
              Refaire
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white"
              style={{ background: NOVA }}
            >
              <Check className="size-4" />
              Terminé
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
