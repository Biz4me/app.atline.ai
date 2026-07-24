'use client'

import { useRef, useEffect } from 'react'
import { Paperclip, Mic, SendHorizontal, Loader2, ChevronDown, Menu } from 'lucide-react'
import { usePushToTalk } from '@/components/mobile/use-dictation'
import { cn } from '@/lib/utils'

// Composeur unique de l'app — une seule source pour mobile ET desktop.
// - mobile : barre flottante fixe en bas
// - desktop (option `desktop`) : barre attachée en pied de colonne
// - bouton « revenir en bas » intégré (même distance -top-12 des deux côtés)
// Le choix d'agent se fait dans le tiroir (sidebar), pas ici.
// Nova/Shell l'utilisent en mobile only (ne passent ni `desktop` ni `bigText`) → inchangés.
type Props = {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onAttach?: () => void
  agentLabel?: string
  accent?: string
  disabled?: boolean
  autoFocus?: boolean
  desktop?: boolean          // rend aussi la barre attachée desktop
  bigText?: boolean          // +1px (chat Atlas)
  showScrollBtn?: boolean
  onScrollBottom?: () => void
  onSlash?: () => void       // nav messagerie : bouton « / » (catalogue de commandes) — optionnel, surfaces agents uniquement
  placeholder?: string       // nav messagerie : « Parle à Atlas de Sophie… » (défaut : « Écris à {agent}… »)
  children?: React.ReactNode // ex. input fichier caché (mobile)
}

export function AppComposer({
  value, onChange, onSubmit, onAttach, agentLabel = 'Atlas', accent, disabled, autoFocus,
  desktop, bigText, showScrollBtn, onScrollBottom, onSlash, placeholder, children,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  // Dictée push-to-talk : la valeur courante en ref pour y accoler le texte reconnu.
  const valueRef = useRef(value)
  valueRef.current = value
  const { supported: micOk, recording, busy, start, stop } = usePushToTalk({
    getBase: () => valueRef.current,
    onText: (full) => onChange(full),
  })

  // Auto-grow des zones de saisie (mobile + desktop) jusqu'à 160px puis scroll
  useEffect(() => {
    rootRef.current?.querySelectorAll('textarea').forEach((el) => {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 160) + 'px'
    })
  }, [value])
  useEffect(() => { if (autoFocus) rootRef.current?.querySelector('textarea')?.focus() }, [autoFocus])

  const textCls = bigText ? 'text-lg lg:text-base' : 'text-lg lg:text-sm'

  // Bouton « revenir en bas » — au-dessus de la barre.
  // Desktop : centré (inchangé). Mobile : même taille + même décalage droit que le bouton Envoyer
  // → aligné dans la même colonne, à droite, en plus gros.
  const scrollBtn = (variant: 'mobile' | 'desktop') => showScrollBtn && onScrollBottom ? (
    <button
      type="button"
      onClick={onScrollBottom}
      aria-label="Revenir en bas"
      className={cn(
        'absolute -top-12 z-10 flex items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-md transition-colors hover:bg-muted hover:text-foreground active:bg-muted',
        variant === 'mobile' ? 'right-3 size-11' : 'left-1/2 size-9 -translate-x-1/2',
      )}
    >
      <ChevronDown className={variant === 'mobile' ? 'size-6' : 'size-4'} />
    </button>
  ) : null

  // La barre — DEUX ÉTAGES : le texte pleine largeur au-dessus, la rangée d'actions en dessous.
  // (modèle ChatGPT/Claude : le texte n'est plus coincé entre les boutons). Internals partagés
  // mobile/desktop ; seul l'habillage du conteneur diffère.
  const bar = (variant: 'mobile' | 'desktop') => (
    <div
      className={cn(
        'relative mx-auto flex flex-col gap-1 border border-border',
        variant === 'mobile'
          ? 'max-w-md rounded-[26px] bg-surface/95 px-3 py-2 shadow-[0_6px_24px_rgba(0,0,0,.12)] backdrop-blur-md'
          : 'max-w-2xl rounded-3xl bg-surface px-3.5 py-2.5',
      )}
    >
      {scrollBtn(variant)}
      {/* Étage 1 — le texte, pleine largeur */}
      <textarea
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit() } }}
        placeholder={placeholder ?? `Écris à ${agentLabel}…`}
        className={cn('w-full resize-none overflow-y-auto no-scrollbar bg-transparent leading-[1.4] text-foreground outline-none placeholder:text-muted-foreground', textCls)}
        style={{ maxHeight: 160, paddingTop: 6, paddingBottom: 4 }}
      />
      {/* Étage 2 — les actions */}
      <div className="flex items-center gap-1.5">
        {onSlash && (
          <button
            type="button"
            onClick={onSlash}
            title="Menu"
            aria-label="Menu"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted active:bg-muted"
          >
            <Menu className="size-7 stroke-2" />
          </button>
        )}
        {onAttach && (
          <button
            type="button"
            onClick={onAttach}
            title="Joindre un fichier"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted active:bg-muted"
          >
            <Paperclip className="size-5 stroke-[1.5]" />
          </button>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {micOk && (
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); start() }}
              onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); stop() }}
              onPointerCancel={stop}
              onContextMenu={(e) => e.preventDefault()}
              disabled={busy}
              aria-label="Maintenir pour dicter"
              title="Maintenir pour dicter"
              className={cn(
                'flex size-11 shrink-0 select-none touch-none items-center justify-center rounded-full transition-all',
                recording ? 'scale-110 bg-primary text-white' : busy ? 'text-primary' : 'text-muted-foreground hover:bg-muted active:bg-muted',
              )}
            >
              {busy ? <Loader2 className="size-6 animate-spin" /> : <Mic className={cn('size-6 stroke-[1.5]', recording && 'animate-pulse')} />}
            </button>
          )}
          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-full transition-all disabled:opacity-40',
              recording
                ? 'bg-transparent text-muted-foreground'
                : 'bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:opacity-90',
            )}
            style={!recording && accent ? { background: accent } : undefined}
          >
            <SendHorizontal className="size-6 stroke-[1.5]" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div ref={rootRef} className={desktop ? 'shrink-0' : 'contents'}>
      {/* MOBILE — flottant fixe. Bascule à `md` quand `desktop` (fils messagerie : S1 dès md) ; sinon `lg`. */}
      <div
        className={cn(desktop ? 'md:hidden' : 'lg:hidden', 'fixed inset-x-0 z-[48] px-4')}
        style={{ bottom: 'max(20px, env(safe-area-inset-bottom))' }}
      >
        {bar('mobile')}
        {children}
      </div>
      {/* DESKTOP — attaché en pied de colonne (option desktop), dès md pour coller au palier tablette */}
      {desktop && (
        <div className="hidden md:block px-4 py-3 lg:px-6">
          {bar('desktop')}
        </div>
      )}
    </div>
  )
}
