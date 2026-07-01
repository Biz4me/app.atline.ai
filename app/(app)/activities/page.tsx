'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Check, Loader2, Briefcase, Link2, FileText, Sparkles, Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/card'
import { useOverlay } from '@/components/overlay-provider'
import { toast } from 'sonner'

const inputCls =
  'w-full rounded-xl border border-border bg-background px-4 py-3 text-lg text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30'

const CATEGORIES = ['coaching', 'bien-être', 'nutrition', 'cosmétique', 'mode', 'maison', 'finance', 'voyage', 'tech', 'autre']

const LINK_GROUPS: { group: string; items: { key: string; label: string; placeholder: string }[] }[] = [
  { group: 'Vendre', items: [{ key: 'BOUTIQUE', label: 'Boutique', placeholder: 'lien de ta boutique' }] },
  { group: 'Parrainer', items: [{ key: 'PARRAINAGE', label: 'Parrainage', placeholder: 'lien de parrainage' }] },
  { group: 'Rencontrer', items: [{ key: 'RDV', label: 'RDV', placeholder: 'lien de prise de RDV' }, { key: 'ZOOM', label: 'Zoom', placeholder: 'lien Zoom' }] },
  { group: 'Contacter', items: [{ key: 'WHATSAPP', label: 'WhatsApp', placeholder: 'lien wa.me/…' }, { key: 'WHATSAPP_GROUP', label: 'Groupe WhatsApp', placeholder: 'lien du groupe' }] },
  { group: 'Réseaux', items: [{ key: 'INSTAGRAM', label: 'Instagram', placeholder: 'lien Instagram' }, { key: 'FACEBOOK', label: 'Facebook', placeholder: 'lien Facebook' }, { key: 'TIKTOK', label: 'TikTok', placeholder: 'lien TikTok' }] },
]

const BUCKETS: { key: string; label: string; hint: string }[] = [
  { key: 'PRESENTER', label: 'Présenter', hint: 'plan de rému, présentation…' },
  { key: 'FORMER', label: 'Former', hint: 'guides, scripts, formations…' },
  { key: 'VENDRE', label: 'Vendre', hint: 'fiches produits, témoignages…' },
]
const BUCKET_LABEL: Record<string, string> = { PRESENTER: 'Présenter', FORMER: 'Former', VENDRE: 'Vendre' }

type Support = { id: string; title: string; description: string | null; format: string; fileUrl: string; createdAt: string }
type Activity = {
  id: string; mlmName: string; rank: string; category: string; goal: string; produit: string; color: string; active: boolean
  objectif: Record<string, string>
  links: Record<string, string>
  supports: Record<string, Support[]>
}

function SectionHeader({ icon: Icon, title }: { icon: typeof Briefcase; title: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10"><Icon className="size-4 text-primary" /></span>
      <p className="text-lg font-semibold text-foreground">{title}</p>
    </div>
  )
}

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
  const setObjectif = (k: string, v: string) => setAct((a) => (a ? { ...a, objectif: { ...a.objectif, [k]: v } } : a))

  async function save() {
    if (!act) return
    setSaving(true)
    try {
      const res = await fetch('/api/activities/active', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mlmName: act.mlmName, rank: act.rank, category: act.category, produit: act.produit, links: act.links,
          objectif: act.objectif?.target?.trim()
            ? { target: act.objectif.target.trim(), unit: act.objectif.unit || 'partenaires', period: act.objectif.period || 'mois' }
            : {},
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

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center bg-background px-2 py-3">
        <button type="button" onClick={back} className="flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="flex-1 text-center font-display text-lg font-semibold">Mon activité</h1>
        <div className="size-9" />
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
          {/* Identité */}
          <Card className="overflow-hidden p-0">
            <SectionHeader icon={Briefcase} title="Identité" />
            <div className="space-y-4 p-4">
              <label className="block">
                <span className="mb-1.5 block text-base font-medium text-muted-foreground">Nom de l&apos;activité</span>
                <input className={inputCls} value={act.mlmName} onChange={(e) => setField('mlmName', e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-base font-medium text-muted-foreground">Rang / palier <span className="text-muted-foreground/60">(à saisir)</span></span>
                <input className={inputCls} value={act.rank} onChange={(e) => setField('rank', e.target.value)} placeholder="ex. Manager, Diamant…" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-base font-medium text-muted-foreground">Catégorie <span className="text-muted-foreground/60">(adapte Atlas)</span></span>
                <select className={inputCls} value={act.category} onChange={(e) => setField('category', e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </label>
              <div>
                <span className="mb-1.5 block text-base font-medium text-muted-foreground">Objectif <span className="text-muted-foreground/60">(mesurable)</span></span>
                <div className="flex gap-2">
                  <input type="number" min="0" className={`${inputCls} w-20 shrink-0`} value={act.objectif?.target ?? ''} onChange={(e) => setObjectif('target', e.target.value)} placeholder="3" />
                  <select className={`${inputCls} min-w-0 flex-1`} value={act.objectif?.unit ?? 'partenaires'} onChange={(e) => setObjectif('unit', e.target.value)}>
                    <option value="partenaires">partenaires</option>
                    <option value="clients">clients</option>
                    <option value="€">€ de CA</option>
                  </select>
                  <select className={`${inputCls} min-w-0 flex-1`} value={act.objectif?.period ?? 'mois'} onChange={(e) => setObjectif('period', e.target.value)}>
                    <option value="mois">ce mois</option>
                    <option value="trimestre">ce trimestre</option>
                    <option value="an">cette année</option>
                  </select>
                </div>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-base font-medium text-muted-foreground">Produit / offre phare <span className="text-muted-foreground/60">(Aria &amp; Nova)</span></span>
                <input className={inputCls} value={act.produit} onChange={(e) => setField('produit', e.target.value)} placeholder="ex. Complément minceur, coaching 12 semaines…" />
              </label>
            </div>
          </Card>

          {/* Liens */}
          <Card className="overflow-hidden p-0">
            <SectionHeader icon={Link2} title="Liens" />
            <div className="space-y-4 p-4">
              {LINK_GROUPS.map((g) => (
                <div key={g.group}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.group}</p>
                  <div className="space-y-2.5">
                    {g.items.map((it) => (
                      <input
                        key={it.key}
                        className={inputCls}
                        value={act.links[it.key] ?? ''}
                        onChange={(e) => setLink(it.key, e.target.value)}
                        placeholder={`${it.label} — ${it.placeholder}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Documents */}
          <Card className="overflow-hidden p-0">
            <SectionHeader icon={FileText} title="Documents" />
            <input ref={fileRef} type="file" onChange={onFile} className="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,image/*" />
            <div className="space-y-4 p-4">
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
            </div>
          </Card>
        </div>
      )}

      {/* Save bar */}
      {!loading && act && (
        <div className="fixed inset-x-0 bottom-0 z-[40] bg-background px-4 py-3">
          <div className="mx-auto max-w-2xl">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-md transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-5 animate-spin" /> : <><Check className="size-5" />Enregistrer</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
