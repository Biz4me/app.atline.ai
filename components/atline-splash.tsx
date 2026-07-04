'use client'

/**
 * AtlineSplash — l'icône A qui "prend vie". Elle apparaît à la taille de l'icône de lancement
 * (le fond de l'icône = warm-white = fond du splash → transition invisible), puis GRANDIT jusqu'à
 * grande taille et émet un signal (onde). Fond warm-white, puis fondu.
 * Monté une fois par chargement.
 */
import { useEffect, useState } from 'react'

const INK = '#1C1E21'
const ORANGE = '#F97316'

export function AtlineSplash({ minDuration = 1500 }: { minDuration?: number }) {
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
        background: '#f5f4f1',
        opacity: phase === 'fade' ? 0 : 1,
        pointerEvents: phase === 'fade' ? 'none' : 'auto',
        transition: 'opacity 0.5s ease',
      }}
    >
      <style>{`@keyframes atlGrow{0%{transform:scale(0.53)}62%{transform:scale(1.05)}82%{transform:scale(0.99)}100%{transform:scale(1)}}`}</style>
      <svg
        style={{ width: '92vmin', height: '92vmin', animation: 'atlGrow 0.6s cubic-bezier(0.4,0.6,0.2,1) both' }}
        viewBox="15 18 68 62"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="atline"
      >
        <g transform="translate(17.76,16.52) scale(0.62)">
          {/* A statique (comme l'icône de lancement) */}
          <path d="M16,92 L50,16 L84,92" fill="none" stroke={INK} strokeWidth="13" strokeLinejoin="round" strokeLinecap="round" />
          <polygon points="28,64 28,77 68,54.9 68,49.9" fill={INK} />
          <circle cx="68" cy="52.4" r="2.6" fill={INK} />

          {/* onde signal orange (une fois, après le grow) */}
          <circle cx="81.5" cy="47" r="7" fill="none" stroke={ORANGE} strokeWidth="2" opacity="0">
            <animate attributeName="r" values="7;16" begin="0.55s" dur="0.55s" fill="freeze" />
            <animate attributeName="opacity" values="0.6;0" begin="0.55s" dur="0.55s" fill="freeze" />
          </circle>

          {/* nœud orange (présent dès le départ = comme l'icône) + petit sursaut à l'onde */}
          <circle cx="81.5" cy="47" r="7" fill={ORANGE}>
            <animate attributeName="r" values="7;9.5;7" begin="0.5s" dur="0.4s" fill="freeze" />
          </circle>
        </g>
      </svg>
    </div>
  )
}
