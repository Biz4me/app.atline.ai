import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

const ACCENT_COLORS = ['#F97316', '#8B5CF6', '#3B82F6', '#22C55E', '#EF4444', '#EC4899', '#14B8A6']

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const {
    firstName, lastName, username,
    network, objectives, channels,
    mlmLinkOpportunity, mlmLinkClient,
    contacts,
  } = await req.json()

  const usernameClean = username?.toLowerCase().replace(/[^a-z0-9_-]/g, '')
  await db.user.update({
    where: { id: userId },
    data: {
      ...(firstName?.trim() && { firstName: firstName.trim() }),
      ...(lastName?.trim() && { lastName: lastName.trim() }),
      ...(usernameClean?.length >= 3 && { username: usernameClean }),
      onboardingCompleted: true,
      onboardingFlow: 'STANDARD',
    },
  })

  let businessId: string | null = null

  if (network?.trim()) {
    const mlmSlug = network.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    const initials = network.slice(0, 2).toUpperCase()
    const color = ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)]

    const existing = await db.userMlmBusiness.findFirst({ where: { userId, mlmSlug } })
    const business = existing ?? await db.userMlmBusiness.create({
      data: {
        userId,
        mlmName: network.trim(),
        mlmSlug,
        role: 'Distributeur',
        color,
        initials,
        active: true,
        position: 0,
        goal: objectives?.join(',') ?? '',
      },
    })
    businessId = business.id

    await db.userPreferences.upsert({
      where: { userId },
      create: { userId, activeCompanyId: businessId },
      update: { activeCompanyId: businessId },
    })

    if (mlmLinkOpportunity?.trim()) {
      await db.toolboxLink.upsert({
        where: { userId_mlmBusinessId_linkType: { userId, mlmBusinessId: businessId, linkType: 'PARRAINAGE' } },
        create: { userId, mlmBusinessId: businessId, linkType: 'PARRAINAGE', url: mlmLinkOpportunity.trim() },
        update: { url: mlmLinkOpportunity.trim() },
      })
    }
    if (mlmLinkClient?.trim()) {
      await db.toolboxLink.upsert({
        where: { userId_mlmBusinessId_linkType: { userId, mlmBusinessId: businessId, linkType: 'BOUTIQUE' } },
        create: { userId, mlmBusinessId: businessId, linkType: 'BOUTIQUE', url: mlmLinkClient.trim() },
        update: { url: mlmLinkClient.trim() },
      })
    }

    const validContacts = (contacts ?? []).filter((c: any) => c.firstName?.trim())
    if (validContacts.length) {
      const heatToStage = (heat: string) =>
        heat === 'hot' ? 'QUALIFIE' : heat === 'warm' ? 'CONTACTE' : 'NOUVEAU'
      await db.contact.createMany({
        data: validContacts.map((c: any) => ({
          userId,
          mlmBusinessId: businessId!,
          kind: 'PROSPECT',
          name: `${c.firstName.trim()} ${(c.lastName ?? '').trim()}`.trim(),
          initials: (c.firstName[0] + (c.lastName?.[0] ?? '')).toUpperCase(),
          accent: ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)],
          phone: c.phone?.trim() || null,
          prospectStage: heatToStage(c.heat),
        })),
        skipDuplicates: true,
      })
    }
  }

  return NextResponse.json({ success: true, businessId })
}
