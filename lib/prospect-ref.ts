import { db } from '@/lib/db'

// Résout un code de parrainage (= User.username, le même que /r/{code}) vers le
// distributeur, son activité active, sa société et son lien d'inscription.
// Utilisé par les endpoints internes du pivot prospection (bot Telegram).
export async function resolveProspectRef(ref: string) {
  const username = ref.toLowerCase().trim()
  if (!username) return null

  const user = await db.user.findUnique({
    where: { username },
    select: { id: true, firstName: true },
  })
  if (!user) return null

  const prefs = await db.userPreferences.findUnique({
    where: { userId: user.id },
    select: { activeCompanyId: true },
  })
  const biz = prefs?.activeCompanyId
    ? await db.userMlmBusiness.findFirst({ where: { id: prefs.activeCompanyId, userId: user.id } })
    : await db.userMlmBusiness.findFirst({ where: { userId: user.id }, orderBy: { position: 'asc' } })
  if (!biz) return null

  const company = biz.companyId
    ? await db.mlmCompany.findFirst({ where: { id: biz.companyId }, select: { name: true } })
    : null
  const lien = await db.toolboxLink.findFirst({
    where: { mlmBusinessId: biz.id, linkType: 'PARRAINAGE' },
    select: { url: true },
  })

  return {
    userId: user.id,
    prenom: user.firstName,
    societe: company?.name ?? biz.mlmName,
    businessId: biz.id,
    parrainage: lien?.url ?? '',
  }
}
