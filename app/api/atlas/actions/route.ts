import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/lib/db'
import { resolveContacts } from '@/lib/contact-snapshot'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Exécution des actions PROPOSÉES par Atlas et CONFIRMÉES par l'utilisateur (tap sur la carte).
// La confirmation est le geste de l'utilisateur → session obligatoire, userId jamais fourni par le client.

// Interprète date+heure en heure de Paris (été/hiver gérés via Intl, sans lib).
function fromParis(dateStr: string, timeStr: string): Date {
  const naive = new Date(`${dateStr}T${timeStr}:00Z`)
  if (isNaN(naive.getTime())) throw new Error('date invalide')
  const asUtc = new Date(naive.toLocaleString('en-US', { timeZone: 'UTC' }))
  const asParis = new Date(naive.toLocaleString('en-US', { timeZone: 'Europe/Paris' }))
  return new Date(naive.getTime() - (asParis.getTime() - asUtc.getTime()))
}

async function findContact(userId: string, name: string) {
  const matches = await resolveContacts(userId, name)
  if (matches.length === 1) return { contact: matches[0] as { id: string; name: string } }
  if (matches.length === 0) return { error: `Contact « ${name} » introuvable dans ton réseau.` }
  return { error: `Plusieurs contacts s'appellent « ${name} » — précise à Atlas duquel il s'agit.` }
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const kind = typeof body?.kind === 'string' ? body.kind : ''
  const p = (body?.params ?? {}) as Record<string, string>

  try {
    if (kind === 'create_relance') {
      if (!p.contact_name || !p.date) return NextResponse.json({ error: 'contact et date requis' }, { status: 400 })
      const { contact, error } = await findContact(userId, p.contact_name)
      if (!contact) return NextResponse.json({ error }, { status: 404 })
      const dueAt = fromParis(p.date, p.time || '09:00')
      await db.relance.create({
        data: {
          userId,
          contactId: contact.id,
          dueAt,
          channel: ['whatsapp', 'sms', 'email'].includes(p.channel) ? p.channel : 'whatsapp',
          ...(p.message ? { message: p.message } : {}),
        },
      })
      return NextResponse.json({ ok: true, done: `Relance programmée pour ${contact.name}` })
    }

    if (kind === 'schedule_rdv') {
      if (!p.title || !p.date || !p.time) return NextResponse.json({ error: 'titre, date et heure requis' }, { status: 400 })
      let contactId: string | undefined
      if (p.contact_name) {
        const { contact } = await findContact(userId, p.contact_name)
        contactId = contact?.id // introuvable/ambigu → RDV sans lien contact, pas bloquant
      }
      const startAt = fromParis(p.date, p.time)
      await db.appointment.create({
        data: { userId, title: p.title.slice(0, 120), startAt, ...(contactId ? { contactId } : {}) },
      })
      return NextResponse.json({ ok: true, done: `RDV posé : ${p.title}` })
    }

    if (kind === 'log_note') {
      if (!p.contact_name || !p.note) return NextResponse.json({ error: 'contact et note requis' }, { status: 400 })
      const { contact, error } = await findContact(userId, p.contact_name)
      if (!contact) return NextResponse.json({ error }, { status: 404 })
      const cur = await db.contact.findFirst({ where: { id: contact.id, userId }, select: { note: true } })
      const stamp = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(new Date())
      const line = `— ${stamp} (Atlas) : ${p.note.slice(0, 500)}`
      await db.contact.update({
        where: { id: contact.id },
        data: { note: cur?.note ? `${cur.note}\n${line}` : line },
      })
      return NextResponse.json({ ok: true, done: `Note ajoutée à la fiche de ${contact.name}` })
    }

    if (kind === 'update_contact') {
      if (!p.contact_name) return NextResponse.json({ error: 'contact requis' }, { status: 400 })
      const { contact, error } = await findContact(userId, p.contact_name)
      if (!contact) return NextResponse.json({ error }, { status: 404 })

      const data: Record<string, unknown> = {}
      const set = (key: string, v?: string) => { if (v && v.trim()) data[key] = v.trim() }
      set('firstName', p.prenom); set('lastName', p.nom)
      set('gender', p.genre); set('profession', p.profession); set('education', p.education)
      set('phone', p.telephone); set('phone2', p.telephone2); set('email', p.email)
      set('address', p.adresse); set('city', p.ville); set('postal', p.code_postal); set('country', p.pays)
      if (p.date_naissance) { const d = new Date(`${p.date_naissance}T12:00:00`); if (!isNaN(d.getTime())) data.birthDate = d }
      if (p.tags) data.tags = p.tags.split(',').map((t) => t.trim()).filter(Boolean)
      if (['CHAUD', 'TIEDE', 'FROID'].includes(p.marche)) data.market = p.marche
      if (['ROUGE', 'VERT', 'BLEU', 'JAUNE'].includes(p.couleur)) data.personality = p.couleur
      if (['NOUVEAU', 'INVITATION', 'PRESENTATION', 'SUIVI', 'CLOSING'].includes(p.etape)) data.prospectStage = p.etape

      // Qualification : fusion clé à clé dans le JSON existant (jamais d'écrasement global)
      const QUAL: Record<string, string> = { situation: 'situation', interets: 'interests', motivation: 'motivation', insatisfaction: 'insatisfaction', reseau: 'reseau', ouverture: 'ouverture' }
      const qualEntries = Object.entries(QUAL).filter(([frk]) => p[frk] && p[frk].trim())
      if (qualEntries.length) {
        const cur = await db.contact.findFirst({ where: { id: contact.id, userId }, select: { qualification: true } })
        const q = (cur?.qualification && typeof cur.qualification === 'object' && !Array.isArray(cur.qualification)) ? { ...(cur.qualification as Record<string, unknown>) } : {}
        for (const [frk, dbk] of qualEntries) q[dbk] = p[frk].trim()
        data.qualification = q
      }

      if (!Object.keys(data).length) return NextResponse.json({ error: 'aucune info à enregistrer' }, { status: 400 })

      // name recomposé si prénom/nom changent (aligné sur le PATCH de la fiche)
      if (data.firstName !== undefined || data.lastName !== undefined) {
        const curN = await db.contact.findFirst({ where: { id: contact.id, userId }, select: { firstName: true, lastName: true } })
        const composed = `${(data.firstName as string) ?? curN?.firstName ?? ''} ${(data.lastName as string) ?? curN?.lastName ?? ''}`.trim()
        if (composed) data.name = composed
      }

      await db.contact.update({ where: { id: contact.id }, data })
      const n = Object.keys(data).filter((k) => k !== 'name').length
      return NextResponse.json({ ok: true, done: `Fiche de ${contact.name} mise à jour (${n} info${n > 1 ? 's' : ''})` })
    }

    if (kind === 'update_profile') {
      const data: Record<string, unknown> = {}
      const set = (key: string, v?: string) => { if (v && v.trim()) data[key] = v.trim() }
      set('profession', p.profession); set('education', p.education); set('city', p.ville); set('bio', p.bio)
      if (p.genre) { const g = ({ homme: 'M', femme: 'F', neutre: 'N' } as Record<string, string>)[p.genre]; if (g) data.gender = g }
      if (p.date_naissance) { const d = new Date(`${p.date_naissance}T12:00:00`); if (!isNaN(d.getTime())) data.birthDate = d }
      if (['ROUGE', 'VERT', 'BLEU', 'JAUNE'].includes(p.couleur)) data.personality = p.couleur

      // Coaching : fusion clé à clé dans le JSON existant (même règle que la qualification contact)
      const COACH: Record<string, string> = { pourquoi: 'why', parcours: 'background', passions: 'passions', dispo: 'availability', niveau: 'level' }
      const coachEntries = Object.entries(COACH).filter(([frk]) => p[frk] && p[frk].trim())
      if (coachEntries.length) {
        const cur = await db.user.findUnique({ where: { id: userId }, select: { coaching: true } })
        const c = (cur?.coaching && typeof cur.coaching === 'object' && !Array.isArray(cur.coaching)) ? { ...(cur.coaching as Record<string, unknown>) } : {}
        for (const [frk, dbk] of coachEntries) c[dbk] = p[frk].trim()
        data.coaching = c
      }

      if (!Object.keys(data).length) return NextResponse.json({ error: 'aucune info à enregistrer' }, { status: 400 })
      await db.user.update({ where: { id: userId }, data })
      const n = Object.keys(data).filter((k) => k !== 'coaching').length + coachEntries.length
      return NextResponse.json({ ok: true, done: `Ton profil est à jour (${n} info${n > 1 ? 's' : ''})` })
    }

    if (kind === 'update_activite') {
      const prefs = await db.userPreferences.findUnique({ where: { userId }, select: { activeCompanyId: true } })
      const biz = (prefs?.activeCompanyId
        ? await db.userMlmBusiness.findFirst({ where: { id: prefs.activeCompanyId, userId } })
        : null) ?? await db.userMlmBusiness.findFirst({ where: { userId }, orderBy: { position: 'asc' } })
      if (!biz) return NextResponse.json({ error: 'Aucune activité à mettre à jour.' }, { status: 404 })

      const data: Record<string, unknown> = {}
      const set = (key: string, v?: string) => { if (v && v.trim()) data[key] = v.trim() }
      set('produit', p.produit); set('audience', p.audience); set('rank', p.rang); set('story', p.story); set('sponsorName', p.parrain)

      // Objectif : fusion clé à clé (mensuel / m3 / m6 / m12)
      const OBJ: Record<string, string> = { objectif_mensuel: 'mensuel', objectif_3m: 'm3', objectif_6m: 'm6', objectif_12m: 'm12' }
      const objEntries = Object.entries(OBJ).filter(([frk]) => p[frk] && p[frk].trim())
      if (objEntries.length) {
        const o = (biz.objectif && typeof biz.objectif === 'object' && !Array.isArray(biz.objectif)) ? { ...(biz.objectif as Record<string, unknown>) } : {}
        for (const [frk, dbk] of objEntries) o[dbk] = p[frk].trim()
        data.objectif = o
      }

      if (!Object.keys(data).length) return NextResponse.json({ error: 'aucune info à enregistrer' }, { status: 400 })
      await db.userMlmBusiness.update({ where: { id: biz.id }, data })
      const n = Object.keys(data).filter((k) => k !== 'objectif').length + objEntries.length
      return NextResponse.json({ ok: true, done: `Activité ${biz.mlmName} mise à jour (${n} info${n > 1 ? 's' : ''})` })
    }

    return NextResponse.json({ error: 'action inconnue' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "L'action n'a pas pu être exécutée" }, { status: 500 })
  }
}
