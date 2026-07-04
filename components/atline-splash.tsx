'use client'

/**
 * AtlineSplash — écran de chargement animé : révélation du logotype "atline".
 * Le A se dessine → "tline" apparaît en streaming → le nœud voyage A→i et s'allume orange
 * → un nœud noir régénère sur le A. Fond warm-white (= fond app). Tracés vectorisés (zéro police).
 * Monté une fois par chargement (persiste en nav SPA, rejoue au cold start).
 */
import { useEffect, useState } from 'react'

const INK = '#1C1E21'
const ORANGE = '#F97316'

export function AtlineSplash({ minDuration = 3400 }: { minDuration?: number }) {
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
      <svg style={{ width: '86vw', maxWidth: 460, height: 'auto' }} viewBox="0 0 340 118" xmlns="http://www.w3.org/2000/svg" aria-label="atline">
        <clipPath id="atl-cb">
          <rect x="28" y="48" height="32" width="0">
            <animate attributeName="width" values="0;0;42;42" keyTimes="0;0.11;0.17;1" dur="4s" repeatCount="indefinite" />
          </rect>
        </clipPath>
        <clipPath id="atl-stream">
          <rect x="90" y="34" height="76" width="0">
            <animate attributeName="width" values="0;0;200;200" keyTimes="0;0.21;0.42;1" dur="4s" repeatCount="indefinite" />
          </rect>
        </clipPath>

        <g transform="translate(22,6)">
          {/* A — se dessine */}
          <path d="M16,92 L50,16 L84,92" fill="none" stroke={INK} strokeWidth="13" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="167" strokeDashoffset="167">
            <animate attributeName="stroke-dashoffset" values="167;83.5;0;0" keyTimes="0;0.08;0.16;1" dur="4s" repeatCount="indefinite" calcMode="spline" keySplines="0 0 1 1;0 0 1 1;0 0 1 1" />
          </path>
          <polygon points="28,64 28,77 68,54.9 68,49.9" fill={INK} clipPath="url(#atl-cb)" />
          <circle cx="68" cy="52.4" r="2.6" fill={INK} opacity="0">
            <animate attributeName="opacity" values="0;0;1;1;1" keyTimes="0;0.16;0.18;0.9;1" dur="4s" repeatCount="indefinite" />
          </circle>

          {/* "tline" vectorisé — révélé en streaming */}
          <g clipPath="url(#atl-stream)" fill={INK}>
            <path d="M127 98L115.80 98Q111.88 98 109.44 95.56Q107 93.12 107 89.04L107 66.64L97.08 66.64L97.08 58.32L107 58.32L107 46L117.08 46L117.08 58.32L127.96 58.32L127.96 66.64L117.08 66.64L117.08 87.28Q117.08 89.68 119.32 89.68L127 89.68L127 98M149.16 98L139.08 98L139.08 42L149.16 42" />
            <path d="M169,56 L169,98" fill="none" stroke={INK} strokeWidth="11" />
            <path d="M200.68 98L190.60 98L190.60 58.32L200.52 58.32L200.52 63.52L201.96 63.52Q202.92 61.44 205.56 59.56Q208.20 57.68 213.56 57.68Q218.20 57.68 221.68 59.80Q225.16 61.92 227.08 65.64Q229 69.36 229 74.32L229 98L218.92 98L218.92 75.12Q218.92 70.64 216.72 68.40Q214.52 66.16 210.44 66.16Q205.80 66.16 203.24 69.24Q200.68 72.32 200.68 77.84L200.68 98M259.96 99.12Q254.04 99.12 249.52 96.60Q245 94.08 242.48 89.48Q239.96 84.88 239.96 78.64L239.96 77.68Q239.96 71.44 242.44 66.84Q244.92 62.24 249.40 59.72Q253.88 57.20 259.80 57.20Q265.64 57.20 269.96 59.80Q274.28 62.40 276.68 67Q279.08 71.60 279.08 77.68L279.08 81.12L250.20 81.12Q250.36 85.20 253.24 87.76Q256.12 90.32 260.28 90.32Q264.52 90.32 266.52 88.48Q268.52 86.64 269.56 84.40L277.80 88.72Q276.68 90.80 274.56 93.24Q272.44 95.68 268.92 97.40Q265.40 99.12 259.96 99.12M250.28 73.60L268.84 73.60Q268.52 70.16 266.08 68.08Q263.64 66 259.72 66Q255.64 66 253.24 68.08Q250.84 70.16 250.28 73.60" />
          </g>

          {/* pulse de régénération sur le A */}
          <circle cx="81.5" cy="47" r="7" fill="none" stroke={INK} strokeWidth="2" opacity="0">
            <animate attributeName="r" values="7;7;20;20" keyTimes="0;0.685;0.85;1" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0;0.5;0;0" keyTimes="0;0.685;0.715;0.86;1" dur="4s" repeatCount="indefinite" />
          </circle>
          <circle cx="81.5" cy="47" r="7" fill={INK} opacity="0">
            <animate attributeName="opacity" values="0;0;1;1" keyTimes="0;0.675;0.715;1" dur="4s" repeatCount="indefinite" />
            <animate attributeName="r" values="0;0;10;7;7" keyTimes="0;0.675;0.72;0.78;1" dur="4s" repeatCount="indefinite" />
          </circle>

          {/* traînée */}
          <circle r="5" fill={INK} opacity="0">
            <animateMotion dur="4s" repeatCount="indefinite" keyPoints="0;0;0.1008;0.1008;0.784;0.902;0.9714;1;1" keyTimes="0;0.18;0.22;0.43;0.59;0.625;0.65;0.675;1" calcMode="spline" keySplines="0 0 1 1;0.3 0 0.3 1;0 0 1 1;0.3 0 0.2 1;0.4 0 0.5 1;0.4 0 0.5 1;0.3 0 0.3 1;0 0 1 1" path="M68,52.4 L81.5,47 L180,45 L163,46 L173,46 L169,47" />
            <animate attributeName="opacity" values="0;0;0.3;0;0" keyTimes="0;0.45;0.55;0.60;1" dur="4s" repeatCount="indefinite" />
          </circle>

          {/* onde orange au i */}
          <circle cx="169" cy="47" r="8" fill="none" stroke={ORANGE} strokeWidth="2" opacity="0">
            <animate attributeName="r" values="8;8;24;24" keyTimes="0;0.685;0.86;1" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0;0.6;0;0" keyTimes="0;0.685;0.715;0.88;1" dur="4s" repeatCount="indefinite" />
          </circle>

          {/* nœud qui voyage A→i, ink → orange, et se cale (devient le point du i) */}
          <circle r="7" fill={INK}>
            <animateMotion dur="4s" repeatCount="indefinite" keyPoints="0;0;0.1008;0.1008;0.784;0.902;0.9714;1;1" keyTimes="0;0.17;0.21;0.42;0.58;0.615;0.64;0.665;1" calcMode="spline" keySplines="0 0 1 1;0.3 0 0.3 1;0 0 1 1;0.3 0 0.2 1;0.4 0 0.5 1;0.4 0 0.5 1;0.3 0 0.3 1;0 0 1 1" path="M68,52.4 L81.5,47 L180,45 L163,46 L173,46 L169,47" />
            <animate attributeName="fill" values={`${INK};${INK};#FFFFFF;${ORANGE};${ORANGE}`} keyTimes="0;0.66;0.68;0.72;1" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0;1;1;1" keyTimes="0;0.17;0.20;0.9;1" dur="4s" repeatCount="indefinite" />
            <animate attributeName="r" values="0;0;7;7;10.5;6.5;6.5" keyTimes="0;0.17;0.21;0.655;0.685;0.74;1" dur="4s" repeatCount="indefinite" />
          </circle>
        </g>
      </svg>
    </div>
  )
}
