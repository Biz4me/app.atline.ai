import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const AI_SERVICE = 'http://localhost:8100'

const ICON_MAP: Record<string, string> = {
  contact: 'PhoneCall',
  formation: 'BookOpen',
  simulation: 'Sparkles',
  agenda: 'CalendarDays',
  coaching: 'Users',
  default: 'Flame',
}

const COLOR_MAP: Record<string, string> = {
  contact: 'text-primary',
  formation: 'text-green-600',
  simulation: 'text-[#8B5CF6]',
  agenda: 'text-amber-600',
  coaching: 'text-[#14B8A6]',
  default: 'text-primary',
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [user, business] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } }),
    db.userMlmBusiness.findFirst({ where: { userId, active: true }, select: { id: true, mlmName: true, role: true, goal: true } }),
  ])
  if (!business) return NextResponse.json({ error: 'No active business' }, { status: 400 })

  // Delete old plan for today if exists (regenerate)
  await db.dailyPlan.deleteMany({ where: { userId, mlmBusinessId: business.id, date: today } })

  // Build context for Atlas
  const [recentContacts, nextAppointments] = await Promise.all([
    db.contact.findMany({
      where: { userId, stage: { in: ['WARM', 'HOT', 'SUIVI'] } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { firstName: true, lastName: true, stage: true },
    }),
    db.appointment.findMany({
      where: { userId, startAt: { gte: new Date() } },
      orderBy: { startAt: 'asc' },
      take: 3,
      select: { title: true, startAt: true },
    }).catch(() => []),
  ])

  const query = `Génère mon plan du jour en JSON. Je suis ${user?.firstName ?? ''}, distributeur ${business.mlmName}.
Contacts chauds : ${recentContacts.map(c => `${c.firstName} ${c.lastName} (${c.stage})`).join(', ') || 'aucun'}.
Prochains RDV : ${nextAppointments.map((a: {title: string, startAt: Date}) => `${a.title} le ${new Date(a.startAt).toLocaleDateString('fr-FR')}`).join(', ') || 'aucun'}.

Réponds UNIQUEMENT avec un tableau JSON de 3 à 5 tâches, format strict :
[{"title":"...","subtitle":"...","type":"contact|formation|simulation|agenda|coaching","cta":"/route","ctaLabel":"..."}]
- type contact = relancer/appeler un prospect
- type formation = continuer un module
- type simulation = faire une simulation ARIA
- type agenda = préparer/honorer un RDV
- type coaching = action de coaching filleul
Pas de texte hors du JSON.`

  let tasks: Array<{title: string; subtitle?: string; type: string; cta: string; ctaLabel: string}> = []

  try {
    const res = await fetch(`${AI_SERVICE}/api/atlas/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, user_id: userId, mlm_actif: business.mlmName }),
    })

    let raw = ''
    if (res.ok && res.body) {
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) raw += parsed.text
          } catch {}
        }
      }
    }

    // Extract JSON array from response
    const match = raw.match(/\[[\s\S]*\]/)
    if (match) tasks = JSON.parse(match[0])
  } catch (e) {
    console.error('[daily-plan] AI error:', e)
  }

  // Fallback tasks if AI failed
  if (!tasks.length) {
    tasks = [
      { title: "Relancer tes prospects chauds", subtitle: "Pipeline en attente", type: "contact", cta: "/contacts", ctaLabel: "Voir" },
      { title: "Continuer ta formation", subtitle: "Reste dans le top", type: "formation", cta: "/formation", ctaLabel: "Reprendre" },
      { title: "Simulation ARIA", subtitle: "Affine ton pitch", type: "simulation", cta: "/aria", ctaLabel: "Commencer" },
    ]
  }

  // Persist
  const plan = await db.dailyPlan.create({
    data: {
      userId,
      mlmBusinessId: business.id,
      date: today,
      tasks: {
        create: tasks.map((t, i) => ({
          title: t.title,
          subtitle: t.subtitle ?? null,
          icon: ICON_MAP[t.type] ?? ICON_MAP.default,
          color: COLOR_MAP[t.type] ?? COLOR_MAP.default,
          cta: t.cta,
          position: i,
          done: false,
        })),
      },
    },
    include: { tasks: { orderBy: { position: 'asc' } } },
  })

  return NextResponse.json({ plan })
}
