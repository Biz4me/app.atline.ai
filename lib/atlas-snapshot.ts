import { db } from '@/lib/db'

// Instantané des données de l'utilisateur pour Atlas. Deux sorties partagent le MÊME
// mapping de champs déclarés (identité + coaching + réseaux + activité) via `profileLines` :
//  - buildAtlasSnapshot : instantané COMPLET pour le chat (déclaré + opérationnel du jour).
//  - buildProfileReference : référentiel COMPACT (déclaré seul) injecté dans la réflexion
//    nocturne comme « faits déjà connus » → la mémoire vivante reste cohérente et ne
//    redécouvre pas ce qui est déjà structuré.

type SnapUser = {
  firstName: string | null
  gender: string | null
  birthDate: Date | null
  city: string | null
  profession: string | null
  education: string | null
  bio: string | null
  personality: string | null
  coaching: unknown
  socials: unknown
}

type SnapBiz = {
  mlmName: string | null
  rank: string | null
  startDate: string | null
  produit: string | null
  goal: string | null
  audience: string | null
  objectif: unknown
  structure: unknown
  sponsorName: string | null
  story: string | null
} | null

// Champs DÉCLARÉS (stables) — qui est l'utilisateur + son activité. Source unique du
// mapping, réutilisée par le snapshot chat ET le référentiel de réflexion.
function profileLines(user: SnapUser | null, biz: SnapBiz, now: Date): string[] {
  const lines: string[] = []

  // Qui est l'utilisateur — Atlas coache une personne, pas un compte.
  if (user) {
    let who = `Utilisateur : ${user.firstName}`
    const g = ({ M: 'homme', F: 'femme', N: 'neutre' } as Record<string, string>)[user.gender ?? ''] ?? ''
    const bits: string[] = []
    if (g) bits.push(`${g} — accorde tes messages`)
    if (user.birthDate) {
      const b = new Date(user.birthDate)
      let age = now.getFullYear() - b.getFullYear()
      if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) age--
      bits.push(`${age} ans`)
      if (b.getMonth() === now.getMonth() && b.getDate() === now.getDate()) bits.push("C'EST SON ANNIVERSAIRE AUJOURD'HUI 🎂")
    }
    if (user.city) bits.push(user.city)
    if (bits.length) who += ` (${bits.join(', ')})`
    lines.push(who)
    const job = [user.profession && `Métier : ${user.profession}`, user.education && `Formation : ${user.education}`].filter(Boolean).join(' · ')
    if (job) lines.push(job)
    if (user.personality) lines.push(`Sa couleur (Big Al) : ${user.personality} — adapte ton coaching à SA couleur`)
    if (user.bio) lines.push(`Bio : ${user.bio.slice(0, 200)}`)
    const co = (user.coaching ?? null) as Record<string, string> | null
    if (co) {
      const cl = [co.why && `pourquoi : ${co.why}`, co.background && `parcours : ${co.background}`, co.mindset && `mindset : ${co.mindset}`, co.passions && `passions : ${co.passions}`, co.availability && `dispo : ${co.availability}`, co.level && `niveau : ${co.level}`].filter(Boolean).join(' · ')
      if (cl) lines.push(`Coaching : ${cl}`)
    }
    const so = (user.socials ?? null) as Record<string, string> | null
    if (so && Object.keys(so).length) lines.push(`Réseaux sociaux (handles, à citer/glisser) : ${Object.entries(so).filter(([, v]) => v).map(([k, v]) => `${k} → ${v}`).join(' · ')}`)
  }

  if (biz) {
    let head = `Activité active : ${biz.mlmName}`
    if (biz.rank) head += ` · rang ${biz.rank}`
    if (biz.startDate) head += ` · démarrage ${biz.startDate}`
    lines.push(head)
    if (biz.produit) lines.push(`Offre phare : ${biz.produit}`)
    if (biz.goal) lines.push(`Objectif / focus déclaré : ${biz.goal}`)
    if (biz.audience) lines.push(`Audience cible : ${biz.audience}`)
    const o = (biz.objectif ?? null) as { mensuel?: string; m3?: string; m6?: string; m12?: string } | null
    if (o && (o.mensuel || o.m3 || o.m6 || o.m12)) {
      const seg = [o.mensuel && `${o.mensuel}/mois`, o.m3 && `${o.m3} à 3 mois`, o.m6 && `${o.m6} à 6 mois`, o.m12 && `${o.m12} à 12 mois`].filter(Boolean).join(', ')
      lines.push(`Objectif de recrutement : ${seg} (partenaires)`)
    }
    // Structure de départ logguée dans Atline (les ventes/commissions réelles vivent dans le back-office du MLM, pas ici).
    const st = (biz.structure ?? null) as { directs?: string; total?: string; clients?: string } | null
    if (st && (Number(st.directs) || Number(st.total) || Number(st.clients))) {
      const seg = [Number(st.directs) && `${st.directs} partenaires directs`, Number(st.total) && `${st.total} dans l'organisation`, Number(st.clients) && `${st.clients} clients`].filter(Boolean).join(', ')
      lines.push(`Structure de départ (déclarée) : ${seg}`)
    }
    if (biz.sponsorName) lines.push(`Parrain : ${biz.sponsorName}`)
    if (biz.story) lines.push(`Sa rencontre avec l'opportunité : ${biz.story.slice(0, 400)}`)
  }

  return lines
}

// Référentiel compact des données DÉCLARÉES (identité + activité) — pour la réflexion
// mémoire nocturne. Pas d'opérationnel transient (relances, RDV, sims, liens, supports).
export async function buildProfileReference(userId: string): Promise<string> {
  try {
    const prefs = await db.userPreferences.findUnique({ where: { userId }, select: { activeCompanyId: true } })
    const biz = prefs?.activeCompanyId
      ? await db.userMlmBusiness.findFirst({ where: { id: prefs.activeCompanyId, userId } })
      : await db.userMlmBusiness.findFirst({ where: { userId }, orderBy: { position: 'asc' } })
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { firstName: true, gender: true, birthDate: true, city: true, profession: true, education: true, bio: true, personality: true, coaching: true, socials: true },
    })
    return profileLines(user, biz, new Date()).join('\n')
  } catch {
    return ''
  }
}

// Instantané compact des données de l'utilisateur → Atlas répond avec la vraie valeur
// (objectif, offre, relances…) au lieu d'inventer. Une ligne par info renseignée, sinon omise.
export async function buildAtlasSnapshot(userId: string): Promise<string> {
  try {
    const prefs = await db.userPreferences.findUnique({ where: { userId }, select: { activeCompanyId: true } })
    const biz = prefs?.activeCompanyId
      ? await db.userMlmBusiness.findFirst({ where: { id: prefs.activeCompanyId, userId } })
      : await db.userMlmBusiness.findFirst({ where: { userId }, orderBy: { position: 'asc' } })

    const now = new Date()
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    const [user, contactsCount, relancesDue, nextRelances, lessonsTotal, lessonsDone, nextRdvs, sims, links, supports] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { firstName: true, gender: true, birthDate: true, city: true, profession: true, education: true, bio: true, personality: true, coaching: true, socials: true },
      }),
      db.contact.count({ where: { userId } }),
      db.relance.count({ where: { userId, status: 'PENDING', dueAt: { lte: endOfDay } } }),
      db.relance.findMany({
        where: { userId, status: 'PENDING' },
        orderBy: { dueAt: 'asc' },
        take: 5,
        select: { dueAt: true, channel: true, contactId: true },
      }),
      db.lmsLesson.count(),
      db.userLessonProgress.count({ where: { userId, done: true } }),
      db.appointment.findMany({
        where: { userId, done: false, startAt: { gte: now } },
        orderBy: { startAt: 'asc' },
        take: 5,
        select: { title: true, startAt: true, contact: { select: { firstName: true, lastName: true } } },
      }),
      db.simSession.findMany({
        where: { userId, score: { not: null }, startedAt: { gte: new Date(now.getTime() - 30 * 86400000) } },
        orderBy: { startedAt: 'asc' },
        select: { characterId: true, score: true, startedAt: true, phase: true },
      }),
      biz ? db.toolboxLink.findMany({ where: { userId, mlmBusinessId: biz.id }, select: { linkType: true, url: true } }) : [],
      biz ? db.toolboxSupport.findMany({ where: { userId, mlmBusinessId: biz.id }, select: { bucket: true, title: true }, orderBy: { createdAt: 'desc' }, take: 12 }) : [],
    ])

    // Champs déclarés (identité + activité) — mapping partagé avec le référentiel de réflexion.
    const lines = profileLines(user, biz, now)

    // Outils opérationnels de l'activité (liens à glisser, bibliothèque de supports).
    if (biz) {
      if (links.length) {
        const LT: Record<string, string> = { BOUTIQUE: 'boutique', PARRAINAGE: 'parrainage', RDV: 'prise de RDV', WHATSAPP: 'WhatsApp', WHATSAPP_GROUP: 'groupe WhatsApp', ZOOM: 'Zoom', INSTAGRAM: 'Instagram', FACEBOOK: 'Facebook', TIKTOK: 'TikTok' }
        lines.push(`Ses liens (à glisser dans les messages que tu rédiges) : ${links.filter((l) => l.url).map((l) => `${LT[l.linkType] ?? l.linkType.toLowerCase()} → ${l.url}`).join(' · ')}`)
      }
      if (supports.length) {
        const BK: Record<string, string> = { PRESENTER: 'Présenter', FORMER: 'Former', VENDRE: 'Vendre' }
        const byBucket = new Map<string, string[]>()
        for (const s of supports) {
          const arr = byBucket.get(s.bucket) ?? []
          arr.push(s.title)
          byBucket.set(s.bucket, arr)
        }
        lines.push(`Supports dans sa bibliothèque : ${[...byBucket.entries()].map(([b, ts]) => `${BK[b] ?? b} : ${ts.map((t) => `« ${t} »`).join(', ')}`).join(' · ')}`)
      }
    }
    lines.push(`Contacts : ${contactsCount} au total`)
    if (relancesDue > 0) lines.push(`Relances à faire (échéance ≤ aujourd'hui) : ${relancesDue}`)
    if (nextRelances.length) {
      // Relance n'a pas de relation Prisma vers Contact : résolution des noms en un lot.
      const rc = await db.contact.findMany({
        where: { id: { in: [...new Set(nextRelances.map((r) => r.contactId))] }, userId },
        select: { id: true, name: true },
      })
      const names = new Map(rc.map((c) => [c.id, c.name]))
      const fmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
      lines.push(`Prochaines relances : ${nextRelances.map((r) => `${names.get(r.contactId) ?? '?'} (${r.channel}) ${fmt.format(r.dueAt)}`).join(' · ')}`)
    }
    if (lessonsTotal > 0) lines.push(`Formation : ${Math.round((lessonsDone / lessonsTotal) * 100)}% des leçons (${lessonsDone}/${lessonsTotal})`)
    if (nextRdvs.length) {
      const fmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
      lines.push(`Prochains rendez-vous : ${nextRdvs.map((r) => {
        const who = r.contact ? ` avec ${[r.contact.firstName, r.contact.lastName].filter(Boolean).join(' ')}` : ''
        return `${r.title}${who} — ${fmt.format(r.startAt)}`
      }).join(' · ')}`)
    }
    // Entraînements Aria (30 j) : dernier score + PROGRESSION par scénario rejoué —
    // c'est ce qui permet à Atlas de dire « tu es passé de 45 à 70 sur l'objection pyramide ».
    if (sims.length) {
      const last = sims[sims.length - 1]
      lines.push(`Entraînements Aria (30 j) : ${sims.length} simulation${sims.length > 1 ? 's' : ''}, dernière : ${last.characterId.replace(/_/g, ' ')} — ${last.score}/100`)
      const byScenario = new Map<string, number[]>()
      for (const s of sims) {
        const arr = byScenario.get(s.characterId) ?? []
        arr.push(s.score!)
        byScenario.set(s.characterId, arr)
      }
      const prog = [...byScenario.entries()]
        .filter(([, scores]) => scores.length >= 2)
        .map(([sc, scores]) => `${sc.replace(/_/g, ' ')} : ${scores[0]} → ${scores[scores.length - 1]}/100 (${scores.length} essais)`)
      if (prog.length) lines.push(`Progression par scénario : ${prog.join(' · ')}`)
    }
    return lines.join('\n')
  } catch {
    return ''
  }
}
