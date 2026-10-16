'use client'

import { useEffect, useRef } from 'react'

/**
 * LA MIRE.
 *
 * Fonction de dessin reprise de JARVIS (Jarvis/index.html, lignes 244-345) et
 * volontairement NON réécrite : mêmes sept couches dans le même ordre, mêmes
 * rayons (R*1.55, R*1.78, R*1.18+i*0.13, R*1.02, R*0.92), mêmes vitesses de
 * rotation (t*0.25, -t*0.1, t*(0.5+i*0.3), -t*0.06), mêmes 12 segments et 60
 * graduations, même anneau de forme d'onde au-delà de 0,02 d'énergie.
 *
 * Deux constantes changent, et rien d'autre :
 *     CYAN  64,220,255  ->  ORANGE 249,115,22   (Atlas, var(--primary))
 *     AMBER 255,179,71  ->  JAUNE  244,179,66   (DISC Jaune)
 * plus les deux bouts du dégradé du cœur, passés du bleu nuit au brun chaud
 * pour rester dans la teinte de la dominante. La fidélité est donc vérifiable
 * ligne à ligne, pas sur parole.
 *
 * L'énergie vient de DEUX analyseurs réels : le micro et la voix d'Atlas. C'est
 * ce qui fait que la mire respire au lieu de tourner dans le vide.
 */

const ORANGE = '249,115,22'
const JAUNE = '244,179,66'
const TAU = Math.PI * 2

export function AtlasMire({
  niveauEntree,
  niveauSortie,
  onClick,
  className,
  anime = true,
}: {
  niveauEntree: () => number
  niveauSortie: () => number
  onClick?: () => void
  className?: string
  /** false = on gèle l'animation. Sert à écarter la mire comme cause d'un
   *  problème audio sur mobile : un canevas redessiné 60 fois par seconde peut
   *  saturer le fil principal d'un téléphone. */
  anime?: boolean
}) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  // Les niveaux changent 60 fois par seconde : on les lit par référence pour ne
  // pas relancer l'animation à chaque image.
  const entree = useRef(niveauEntree)
  const sortie = useRef(niveauSortie)
  entree.current = niveauEntree
  sortie.current = niveauSortie

  useEffect(() => {
    const toile = ref.current
    if (!toile) return
    const ctx = toile.getContext('2d')
    if (!ctx) return

    // On plafonne la densité à 2 : sur un téléphone à 3x, un canevas de 300 px
    // fait 900 px de côté, et sept couches de dégradés à cette taille coûtent
    // cher pour un gain invisible à l'œil.
    const dpr = Math.min(devicePixelRatio || 1, 2)
    const dimensionner = () => {
      const r = toile.getBoundingClientRect()
      toile.width = r.width * dpr
      toile.height = r.height * dpr
    }
    dimensionner()
    const observateur = new ResizeObserver(dimensionner)
    observateur.observe(toile)

    let image = 0
    let t = 0
    const dessiner = () => {
      if (anime) image = requestAnimationFrame(dessiner)
      t += 0.016
      const w = toile.width, h = toile.height, cx = w / 2, cy = h / 2
      ctx.clearRect(0, 0, w, h)
      const inL = entree.current(), outL = sortie.current()
      const energy = Math.max(inL, outL * 1.3)
      const base = Math.min(w, h) * 0.2
      const R = base * (1 + 0.14 * energy + 0.012 * Math.sin(t * 2.1))

      // halo extérieur
      let g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2.6)
      g.addColorStop(0, `rgba(${ORANGE},${0.16 + energy * 0.3})`)
      g.addColorStop(1, 'transparent')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(cx, cy, R * 2.6, 0, TAU); ctx.fill()

      // anneau segmenté (les bobines)
      const segs = 12
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.25)
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * TAU, a1 = a0 + (TAU / segs) * 0.62
        ctx.strokeStyle = `rgba(${ORANGE},${0.55 + 0.4 * Math.sin(t * 3 + i)})`
        ctx.lineWidth = 7 * dpr
        ctx.beginPath(); ctx.arc(0, 0, R * 1.55, a0, a1); ctx.stroke()
      }
      ctx.restore()

      // anneau de graduations
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-t * 0.1)
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * TAU, gros = i % 5 === 0
        ctx.strokeStyle = `rgba(${gros ? JAUNE : ORANGE},${gros ? 0.8 : 0.3})`
        ctx.lineWidth = (gros ? 2 : 1) * dpr
        const r0 = R * 1.78, r1 = R * (gros ? 1.88 : 1.83)
        ctx.beginPath()
        ctx.moveTo(r0 * Math.cos(a), r0 * Math.sin(a))
        ctx.lineTo(r1 * Math.cos(a), r1 * Math.sin(a))
        ctx.stroke()
      }
      ctx.restore()

      // arcs de visée en orbite
      for (let i = 0; i < 3; i++) {
        ctx.save(); ctx.translate(cx, cy)
        ctx.rotate(t * (0.5 + i * 0.3) * (i % 2 ? -1 : 1))
        ctx.strokeStyle = `rgba(${i === 1 ? JAUNE : ORANGE},${0.5 + energy * 0.4})`
        ctx.lineWidth = 2.2 * dpr
        ctx.beginPath(); ctx.arc(0, 0, R * (1.18 + i * 0.13), 0, TAU * (0.16 + 0.1 * i)); ctx.stroke()
        ctx.restore()
      }

      // cadre triangulaire du cœur
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-t * 0.06)
      ctx.strokeStyle = `rgba(${ORANGE},.45)`
      ctx.lineWidth = 1.5 * dpr
      ctx.beginPath()
      for (let i = 0; i <= 3; i++) {
        const a = (i / 3) * TAU - Math.PI / 2
        const x = R * 1.02 * Math.cos(a), y = R * 1.02 * Math.sin(a)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke(); ctx.restore()

      // le cœur
      g = ctx.createRadialGradient(cx, cy, R * 0.05, cx, cy, R)
      g.addColorStop(0, 'rgba(255,248,240,.98)')
      g.addColorStop(0.4, `rgba(${ORANGE},${0.9 + energy * 0.1})`)
      g.addColorStop(1, 'rgba(58,24,4,.95)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.92, 0, TAU); ctx.fill()

      // anneau de forme d'onde quand ça parle
      if (energy > 0.02) {
        ctx.strokeStyle = `rgba(255,255,255,${0.3 + energy * 0.5})`
        ctx.lineWidth = 1.5 * dpr
        ctx.beginPath()
        for (let a = 0; a <= TAU; a += 0.05) {
          const rr = R * (1.0 + 0.07 * energy * Math.sin(a * 9 + t * 6))
          const x = cx + rr * Math.cos(a), y = cy + rr * Math.sin(a)
          a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.closePath(); ctx.stroke()
      }
    }
    dessiner()

    return () => {
      cancelAnimationFrame(image)
      observateur.disconnect()
    }
  }, [anime])

  return (
    <canvas
      ref={ref}
      onClick={onClick}
      aria-label="Atlas"
      className={className}
      style={{ filter: `drop-shadow(0 0 35px rgba(${ORANGE},.25))` }}
    />
  )
}
