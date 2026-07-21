'use client'

import { ThreadRow } from '@/components/thread-row'
import { ATLAS_COMMANDS, matchCommand, type AtlasCommand } from '@/lib/atlas-commands'

// ═══ NAV MESSAGERIE T4 — le « / » agit ═══
// Sheet du catalogue de commandes, ouverte par le bouton / du composeur OU en tapant « / ».
// La saisie filtre en direct. Partagée : fil Atlas (T4), fil contact (T5).

export function SlashMenu({ open, query, onClose, onPick }: {
  open: boolean
  query: string // texte après le « / » (filtre en direct)
  onClose: () => void
  onPick: (c: AtlasCommand) => void
}) {
  if (!open) return null
  const cmds = ATLAS_COMMANDS.filter((c) => matchCommand(c, query))
  return (
    <>
      <button type="button" aria-label="Fermer" onClick={onClose} className="fixed inset-0 z-[58] bg-black/50" />
      <div className="fixed inset-x-0 bottom-0 z-[59] mx-auto w-full max-w-2xl rounded-t-3xl border-t border-border bg-surface pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-border" />
        <div className="flex items-center justify-between px-4 pb-2">
          <p className="text-sm font-semibold text-foreground">Commandes</p>
          <p className="text-xs text-muted-foreground">{query ? `filtre : « ${query} »` : 'continue à taper pour filtrer'}</p>
        </div>
        <div className="max-h-[55dvh] overflow-y-auto">
          {cmds.map((c) => (
            <ThreadRow
              key={c.cmd}
              avatarBg="var(--muted)"
              avatarText={c.emoji}
              title={c.label}
              line={`${c.cmd} — ${c.desc}`}
              endPill={c.feuille ? { label: 'feuille', cls: 'bg-muted text-muted-foreground' } : c.kind === 'prefill' ? { label: '+ contact', cls: 'bg-primary/10 text-primary' } : undefined}
              onClick={() => onPick(c)}
            />
          ))}
          {cmds.length === 0 && <p className="px-4 py-5 text-sm text-muted-foreground">Aucune commande ne correspond.</p>}
        </div>
      </div>
    </>
  )
}
