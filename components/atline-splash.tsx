'use client'

/**
 * AtlineSplash — écran de chargement animé (plein écran) au démarrage de l'app.
 * Fond warm-white (= fond de l'app → fondu invisible), A ink qui se dessine,
 * nœud orange qui remonte la ligne + étincelle/onde orange, puis fondu.
 * Monté une fois par chargement (persiste sur la nav SPA, rejoue au cold start).
 * Zéro dépendance (SVG SMIL pur).
 */
import { useEffect, useState } from 'react'

export function AtlineSplash({ minDuration = 2600 }: { minDuration?: number }) {
  const [phase, setPhase] = useState<'show' | 'fade' | 'gone'>('show')

  useEffect(() => {
    const t = setTimeout(() => setPhase('fade'), minDuration)
    return () => clearTimeout(t)
  }, [minDuration])

  if (phase === 'gone') return null

  return (
    <div
      aria-hidden
      onTransitionEnd={() => {
        if (phase === 'fade') setPhase('gone')
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F5F4F1',
        opacity: phase === 'fade' ? 0 : 1,
        pointerEvents: phase === 'fade' ? 'none' : 'auto',
        transition: 'opacity 0.5s ease',
      }}
    >
      <svg style={{ width: '90vmin', height: '90vmin' }} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="atline">
        <g transform="translate(17.76,16.52) scale(0.62)">
          <path
            d="M16,92 L50,16 L84,92"
            fill="none"
            stroke="#1C1E21"
            strokeWidth={13}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="167"
            strokeDashoffset="167"
          >
            <animate attributeName="stroke-dashoffset" values="167;83.5;0;0" keyTimes="0;0.14;0.28;1" dur="4s" repeatCount="indefinite" calcMode="spline" keySplines="0 0 1 1;0 0 1 1;0 0 1 1" />
          </path>

          <clipPath id="atline-splash-bar">
            <rect x="28" y="48" height="32" width="0">
              <animate attributeName="width" values="0;0;42;42" keyTimes="0;0.20;0.30;1" dur="4s" repeatCount="indefinite" />
            </rect>
          </clipPath>
          <polygon points="28,64 28,77 68,54.9 68,49.9" fill="#1C1E21" clipPath="url(#atline-splash-bar)" />

          <circle cx="68" cy="52.4" r="2.6" fill="#1C1E21" opacity="0">
            <animate attributeName="opacity" values="0;0;1;1;1" keyTimes="0;0.29;0.32;0.92;1" dur="4s" repeatCount="indefinite" />
          </circle>

          {/* étincelle orange à l'arrivée */}
          <circle cx="81.5" cy="47" r="2" fill="#F97316" opacity="0">
            <animate attributeName="r" values="2;2;11;11" keyTimes="0;0.59;0.65;1" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0;0.9;0;0" keyTimes="0;0.59;0.61;0.66;1" dur="4s" repeatCount="indefinite" />
          </circle>
          {/* onde signal orange */}
          <circle cx="81.5" cy="47" r="7" fill="none" stroke="#F97316" strokeWidth="2" opacity="0">
            <animate attributeName="r" values="7;7;26;26" keyTimes="0;0.62;0.90;1" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0;0.6;0;0" keyTimes="0;0.62;0.66;0.92;1" dur="4s" repeatCount="indefinite" />
          </circle>

          {/* nœud orange qui remonte la ligne puis se cale */}
          <circle r="5" fill="#F97316" opacity="0">
            <animateMotion dur="4s" repeatCount="indefinite" keyPoints="0;0;0.928;1;1" keyTimes="0;0.28;0.55;0.60;1" calcMode="spline" keySplines="0 0 1 1;0 0 1 1;0.3 0 0 1;0 0 1 1" path="M-60,109 L88,44 L79,48 L81.5,47" />
            <animate attributeName="opacity" values="0;0;1;1;1" keyTimes="0;0.28;0.31;0.92;1" dur="4s" repeatCount="indefinite" />
            <animate attributeName="r" values="5;5;5;9.5;7;7" keyTimes="0;0.28;0.57;0.60;0.65;1" dur="4s" repeatCount="indefinite" />
          </circle>
        </g>
      </svg>
    </div>
  )
}
