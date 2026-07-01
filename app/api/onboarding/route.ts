import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

const ACCENT = ['#F97316', '#8B5CF6', '#3B82F6', '#22C55E', '#EF4444', '#EC4899', '#14B8A6']
const pick = () => ACCENT[Math.floor(Math.random() * ACCENT.length)]
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const {
    personality, phone, network, objectives, objective, gender, mode, contactColor,
    contactFirstName, contactLastName, market, prospectPhone, prospectEmail, links,
  } = await req.json()
  // Mode Atline (débutant sans société) : l'affilié est rattaché à un business « Atline »
  const biz = (typeof network === 'string' && network.trim()) ? network.trim() : (mode === 'ATLINE' ? 'Atline' : '')

  // ── Utilisateur : couleur, téléphone, onboarding terminé ──
  // Atline n'est plus un MLM : l'affilié est identifié par son business « Atline »,
  // pas par un flag. Tout le monde passe en STANDARD.
  await db.user.update({
    where: { id: userId },
    data: {
      onboardingCompleted: true,
      onboardingFlow: 'STANDARD' as any,
      ...(personality && { personality: personality as any }),
      ...(typeof gender === 'string' && gender && { gender }),
      ...(typeof phone === 'string' && phone.trim() && { phone: phone.trim() }),
    },
  })

  let businessId: string | null = null

  if (biz) {
    const mlmSlug = slugify(biz) || 'activite'
    const goal = typeof objective === 'string' && objective
      ? objective
      : Array.isArray(objectives) ? objectives.join(',') : ''
    const business =
      (await db.userMlmBusiness.findFirst({ where: { userId, mlmSlug } })) ??
      (await db.userMlmBusiness.create({
        data: {
          userId, mlmName: biz, mlmSlug,
          role: 'Distributeur', color: pick(), initials: biz.slice(0, 2).toUpperCase(),
          active: true, position: 0, goal,
        },
      }))
    businessId = business.id

    await db.userPreferences.upsert({
      where: { userId },
      create: { userId, activeCompanyId: businessId },
      update: { activeCompanyId: businessId },
    })

    // ── Lien boutique (le 1er ; le schéma ne tient qu'un lien par type) ──
    if (Array.isArray(links) && links.length && typeof links[0] === 'string' && links[0].trim()) {
      await db.toolboxLink.upsert({
        where: { userId_mlmBusinessId_linkType: { userId, mlmBusinessId: businessId, linkType: 'BOUTIQUE' as any } },
        create: { userId, mlmBusinessId: businessId, linkType: 'BOUTIQUE' as any, url: links[0].trim() },
        update: { url: links[0].trim() },
      })
    }

    // ── Premier contact ──
    if (typeof contactFirstName === 'string' && contactFirstName.trim()) {
      const fn = contactFirstName.trim()
      const ln = typeof contactLastName === 'string' ? contactLastName.trim() : ''
      const contact = await db.contact.create({
        data: {
          userId, mlmBusinessId: businessId, kind: 'PROSPECT',
          name: `${fn} ${ln}`.trim(),
          firstName: fn || null,
          lastName: ln || null,
          initials: (fn[0] + (ln[0] ?? '')).toUpperCase(),
          accent: pick(),
          phone: typeof prospectPhone === 'string' && prospectPhone.trim() ? prospectPhone.trim() : null,
          email: typeof prospectEmail === 'string' && prospectEmail.trim() ? prospectEmail.trim() : null,
          prospectStage: 'NOUVEAU' as any,
          ...(market && { market: market as any }),
          ...(contactColor && { personality: contactColor as any }),
        },
      })

      // ── Relance « Atlas n'oublie pas » : programmée à J+3 (déclenchée par n8n) ──
      await db.relance.create({
        data: {
          userId,
          contactId: contact.id,
          channel: 'email',
          dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          message: `Coucou ${fn}, je reviens vers toi suite à mon message — toujours partant pour un petit échange cette semaine ? Dis-moi ce qui t'arrange.`,
        },
      })
    }
  }

  return NextResponse.json({ success: true, businessId })
}
