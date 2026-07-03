'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronDown, Check, Loader2, Briefcase, Link2, FileText, Sparkles, Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/card'
import { AtlasSessionField } from '@/components/atlas-session-field'
import { useOverlay } from '@/components/overlay-provider'
import { toast } from 'sonner'

// Charte identique au profil (au détail près)
const inputCls =
  'w-full rounded-xl border border-border bg-background px-4 py-[7px] text-lg text-foreground outline-none placeholder:text-muted-foreground'

const LINK_GROUPS: { group: string; items: { key: string; label: string; placeholder: string }[] }[] = [
  { group: 'Vendre', items: [{ key: 'BOUTIQUE', label: 'Boutique', placeholder: 'lien de ta boutique' }] },
  { group: 'Parrainer', items: [{ key: 'PARRAINAGE', label: 'Parrainage', placeholder: 'lien de parrainage' }] },
  { group: 'Rencontrer', items: [{ key: 'RDV', label: 'RDV', placeholder: 'lien de prise de RDV' }, { key: 'ZOOM', label: 'Zoom', placeholder: 'lien Zoom' }] },
  { group: 'Contacter', items: [{ key: 'WHATSAPP', label: 'WhatsApp', placeholder: 'lien wa.me/…' }, { key: 'WHATSAPP_GROUP', label: 'Groupe WhatsApp', placeholder: 'lien du groupe' }] },
  { group: 'Réseaux', items: [{ key: 'INSTAGRAM', label: 'Instagram', placeholder: 'lien Instagram' }, { key: 'FACEBOOK', label: 'Facebook', placeholder: 'lien Facebook' }, { key: 'TIKTOK', label: 'TikTok', placeholder: 'lien TikTok' }] },
]
const LINK_KEYS = LINK_GROUPS.flatMap((g) => g.items.map((i) => i.key))

const BUCKETS: { key: string; label: string; hint: string }[] = [
  { key: 'PRESENTER', label: 'Présenter', hint: 'plan de rému, présentation…' },
  { key: 'FORMER', label: 'Former', hint: 'guides, scripts, formations…' },
  { key: 'VENDRE', label: 'Vendre', hint: 'fiches produits, témoignages…' },
]
const BUCKET_LABEL: Record<string, string> = { PRESENTER: 'Présenter', FORMER: 'Former', VENDRE: 'Vendre' }

type Support = { id: string; title: string; description: string | null; format: string; fileUrl: string; createdAt: string }
type Activity = {
  id: string; mlmName: string; rank: string; category: string; goal: string; produit: string; audience: string; story: string; color: string; active: boolean
  objectif: Record<string, string>
  links: Record<string, string>
  supports: Record<string, Support[]>
}

// Rubrique pliante — identique au profil (icône + titre + filled/total + chevron)
function Collapsible({ icon: Icon, title, filled, total, open, onToggle, children }: { icon: typeof Briefcase; title: string; filled: number; total: number; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  const done = total > 0 && filled >= total
  return (
    <Card className="overflow-hidden p-0">
      <button type="button" onClick={onToggle} className={`flex w-full items-center gap-2.5 px-4 py-3.5 ${open ? 'border-b border-border' : ''}`}>
        <Icon className="size-5 shrink-0 text-muted-foreground stroke-[1.5]" />
        <p className="flex-1 text-left text-lg font-semibold text-foreground">{title}</p>
        {done ? (
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#22C55E] text-white"><Check className="size-3.5" /></span>
        ) : (
          <span className="shrink-0 text-base font-semibold text-muted-foreground">{filled}/{total}</span>
        )}
        <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="space-y-4 p-4">{children}</div>}
    </Card>
  )
}

const nf = (vals: (string | undefined)[]) => vals.filter((v) => v && String(v).trim()).length

export default function ActivitiesPage() {
  const router = useRouter()
  const { setOpenId } = useOverlay()
  // Retour → on revient à la page précédente ET on rouvre le tiroir (on venait de « Gérer »)
  const back = () => { setOpenId('drawer'); router.back() }
  const [act, setAct] = useState<Activity | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadBucket, setUploadBucket] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [open, setOpen] = useState<Record<string, boolean>>({ identite: true })
  const toggle = (k: string) => setOpen((o) => ({ [k]: !o[k] }))
  const fileRef = useRef<HTMLInputElement>(null)

  const loadAct = useCallback(() => {
    return fetch('/api/activities/active')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAct(d?.activity ?? null))
      .catch(() => {})
  }, [])

  useEffect(() => { loadAct().finally(() => setLoading(false)) }, [loadAct])

  const setField = (k: keyof Activity, v: string) => setAct((a) => (a ? { ...a, [k]: v } : a))

  function pickFile(bucket: string) { setUploadBucket(bucket); fileRef.current?.click() }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !uploadBucket) return
    setUploading(true)
    const auto = uploadBucket === 'AUTO'
    const fd = new FormData()
    fd.append('file', file)
    if (!auto) fd.append('bucket', uploadBucket)
    const res = await fetch(auto ? '/api/supports/auto' : '/api/supports', { method: 'POST', body: fd })
    if (res.ok) {
      const d = await res.json().catch(() => ({}))
      await loadAct()
      toast.success(auto ? `Atlas l'a rangé dans « ${BUCKET_LABEL[d.bucket] ?? 'tes documents'} »` : 'Document ajouté')
    } else if (res.status === 413) toast.error('Fichier trop lourd (max 25 Mo)')
    else toast.error("Échec de l'upload")
    setUploading(false)
  }

  async function deleteDoc(id: string) {
    const res = await fetch(`/api/supports/${id}`, { method: 'DELETE' })
    if (res.ok) { await loadAct(); toast.success('Document supprimé') }
  }
  const setLink = (k: string, v: string) => setAct((a) => (a ? { ...a, links: { ...a.links, [k]: v } } : a))

  async function save() {
    if (!act) return
    setSaving(true)
    try {
      const res = await fetch('/api/activities/active', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mlmName: act.mlmName, rank: act.rank, produit: act.produit, links: act.links,
        }),
      })
      if (res.ok) toast.success('Activité enregistrée')
      else toast.error('Échec de l’enregistrement')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  // Complétion (même logique que le profil : somme des rubriques)
  const sec = act ? {
    identite: nf([act.mlmName, act.rank, act.produit, act.audience, act.story, act.objectif?.mensuel]),
    liens: LINK_KEYS.filter((k) => act.links[k]?.trim()).length,
    documents: BUCKETS.filter((b) => (act.supports[b.key] ?? []).length > 0).length,
  } : { identite: 0, liens: 0, documents: 0 }
  const tot = { identite: 6, liens: LINK_KEYS.length, documents: BUCKETS.length }
  const totalFilled = sec.identite + sec.liens + sec.documents
  const totalFields = tot.identite + tot.liens + tot.documents
  const pct = totalFields ? Math.round((totalFilled / totalFields) * 100) : 0

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Header — titre centré + flèche retour (comme les pages du hub compte) */}
      <div className="sticky top-0 z-10 flex items-center justify-center bg-background/90 px-4 py-3 backdrop-blur" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <button type="button" onClick={back} aria-label="Retour" className="absolute left-2 flex size-9 items-center justify-center rounded-full text-foreground active:bg-muted">
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Mon activité</h1>
      </div>

      {loading ? (
        <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : !act ? (
        <div className="flex flex-col items-center gap-2 px-6 pt-24 text-center">
          <Briefcase className="size-7 text-muted-foreground" />
          <p className="text-lg font-medium text-foreground">Aucune activité</p>
          <p className="text-base text-muted-foreground">Crée une activité depuis le switcher en haut.</p>
        </div>
      ) : (
        <div className="space-y-5 px-4 pb-28 pt-4">
          {/* Complétion de l'activité — bandeau fin, sans carte */}
          <div className="px-1">
            <p className="mb-1.5 text-base font-semibold text-foreground">Activité complétée à <span className="text-primary">{pct}%</span></p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <input ref={fileRef} type="file" onChange={onFile} className="hidden"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,image/*" />

          {/* Cartes de l'activité — espacement resserré (gap-2) comme le profil */}
          <div className="flex flex-col gap-2">
            {/* 1 — Ton business : les faits d'abord, puis les champs travaillés avec Atlas */}
            <Collapsible icon={Briefcase} title="Ton business" filled={sec.identite} total={tot.identite} open={!!open.identite} onToggle={() => toggle('identite')}>
              {/* — Les faits — */}
              <input className={inputCls} value={act.mlmName} onChange={(e) => setField('mlmName', e.target.value)} placeholder="Nom de l'activité" />
              {/* Catégorie / secteur — auto (RAG société), lecture seule */}
              <div className={`${inputCls} text-foreground`}>{act.category ? act.category.charAt(0).toUpperCase() + act.category.slice(1) : 'Coaching'}</div>
              <input className={inputCls} value={act.produit} onChange={(e) => setField('produit', e.target.value)} placeholder="Produit / offre phare" />
              <input className={inputCls} value={act.rank} onChange={(e) => setField('rank', e.target.value)} placeholder="Rang dans ton MLM" />

              {/* — Travaillés avec Atlas (conviction → cible → objectif) — */}
              <AtlasSessionField title="Ce qui t'a convaincu" filled={!!act.story} onOpen={() => router.push('/atlas?session=rencontre')}>
                <p className="whitespace-pre-wrap text-lg leading-relaxed text-foreground lg:text-sm">{act.story}</p>
              </AtlasSessionField>

              <AtlasSessionField title="Audience cible" filled={!!act.audience} onOpen={() => router.push('/atlas?session=audience')}>
                <p className="whitespace-pre-wrap text-lg leading-relaxed text-foreground lg:text-sm">{act.audience}</p>
              </AtlasSessionField>

              <AtlasSessionField title="Objectif de recrutement" filled={!!act.objectif?.mensuel} onOpen={() => router.push('/atlas?session=objectifs')}>
                {([['Mensuel', act.objectif?.mensuel], ['3 mois', act.objectif?.m3], ['6 mois', act.objectif?.m6], ['12 mois', act.objectif?.m12]] as [string, string | undefined][]).map(([lab, v]) => (
                  <div key={lab} className="flex items-baseline justify-between border-b border-border/40 py-1.5 last:border-0">
                    <span className="text-sm text-muted-foreground">{lab}</span>
                    <span className="text-lg font-bold text-foreground lg:text-base">{v || '—'} <span className="text-sm font-medium text-muted-foreground">part.</span></span>
                  </div>
                ))}
              </AtlasSessionField>
            </Collapsible>

            {/* 2 — Liens */}
            <Collapsible icon={Link2} title="Liens" filled={sec.liens} total={tot.liens} open={!!open.liens} onToggle={() => toggle('liens')}>
              {LINK_GROUPS.map((g) => (
                <div key={g.group}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.group}</p>
                  <div className="space-y-2.5">
                    {g.items.map((it) => (
                      <input key={it.key} className={inputCls} value={act.links[it.key] ?? ''} onChange={(e) => setLink(it.key, e.target.value)} placeholder={`${it.label} — ${it.placeholder}`} />
                    ))}
                  </div>
                </div>
              ))}
            </Collapsible>

            {/* 3 — Documents */}
            <Collapsible icon={FileText} title="Documents" filled={sec.documents} total={tot.documents} open={!!open.documents} onToggle={() => toggle('documents')}>
              <button type="button" onClick={() => { setUploadBucket('AUTO'); fileRef.current?.click() }} disabled={uploading}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-base font-bold text-primary-foreground active:opacity-90 disabled:opacity-50">
                {uploading && uploadBucket === 'AUTO' ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Laisser Atlas ranger un document
              </button>
              {BUCKETS.map((b) => {
                const docs = act.supports[b.key] ?? []
                return (
                  <div key={b.key}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{b.label}</p>
                      <button type="button" onClick={() => pickFile(b.key)} disabled={uploading}
                        className="flex items-center gap-1 text-base font-semibold text-primary disabled:opacity-50">
                        {uploading && uploadBucket === b.key ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} Ajouter
                      </button>
                    </div>
                    {docs.length === 0 ? (
                      <button type="button" onClick={() => pickFile(b.key)}
                        className="w-full rounded-xl border border-dashed border-border px-3.5 py-3 text-left text-base text-muted-foreground active:bg-muted">Aucun document — {b.hint}</button>
                    ) : (
                      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                        {docs.map((d) => (
                          <div key={d.id} className="flex items-center gap-3 px-3.5 py-2.5">
                            <FileText className="size-4 shrink-0 text-muted-foreground" />
                            <a href={`/api/supports/${d.id}/file`} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-base text-foreground hover:text-primary">{d.title}</a>
                            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">{d.format}</span>
                            <button type="button" onClick={() => deleteDoc(d.id)} className="shrink-0 text-muted-foreground hover:text-[#EF4444]"><Trash2 className="size-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3.5 py-3">
                <Sparkles className="size-4 shrink-0 text-primary" />
                <p className="text-base text-muted-foreground"><span className="font-semibold text-primary">Atlas</span> classe ton document d&apos;après son nom. Sinon, choisis le dossier toi-même avec « + Ajouter ».</p>
              </div>
            </Collapsible>
          </div>
        </div>
      )}

      {/* Bouton Enregistrer flottant — identique au profil */}
      {!loading && act && (
        <div className="fixed inset-x-0 z-[48] px-4" style={{ bottom: 'max(20px, env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={save} disabled={saving} className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-lg transition-transform active:scale-[0.98] disabled:opacity-60">
            {saving ? <Loader2 className="size-5 animate-spin" /> : 'Enregistrer'}
          </button>
        </div>
      )}
    </div>
  )
}
