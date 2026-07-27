import { db } from '@/lib/db'

// Résout un code de parrainage (= User.username, le même que /r/{code}) vers le
// distributeur, son activité active, sa société, ses liens (parrainage, boutique)
// et, si demandé, le produit d'entrée (axe produit : publication → conversation).
// Utilisé par les endpoints internes du pivot prospection (bot Telegram).
export async function resolveProspectRef(ref: string, productSlug?: string) {
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
  const [lien, boutique] = await Promise.all([
    db.toolboxLink.findFirst({
      where: { mlmBusinessId: biz.id, linkType: 'PARRAINAGE' },
      select: { url: true },
    }),
    db.toolboxLink.findFirst({
      where: { mlmBusinessId: biz.id, linkType: 'BOUTIQUE' },
      select: { url: true },
    }),
  ])

  // Produit d'entrée (axe produit spécifique : la publication portait sur CE produit)
  let produit: {
    name: string; slug: string; price: number | null; currency: string | null
    format: string | null; usage: string | null; description: string | null; sourceUrl: string | null
  } | null = null
  if (productSlug && biz.companyId) {
    const p = await db.mlmProduct.findFirst({
      where: { companyId: biz.companyId, slug: productSlug, status: 'PUBLISHED' },
      select: {
        name: true, slug: true, price: true, currency: true,
        format: true, usage: true, description: true, sourceUrl: true,
      },
    })
    if (p) produit = { ...p, price: p.price != null ? Number(p.price) : null }
  }

  return {
    userId: user.id,
    prenom: user.firstName,
    societe: company?.name ?? biz.mlmName,
    businessId: biz.id,
    parrainage: lien?.url ?? '',
    boutique: boutique?.url ?? '',
    produit,
  }
}
