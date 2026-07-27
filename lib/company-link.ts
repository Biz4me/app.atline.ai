import { db } from '@/lib/db'

// Slug de marque canonique — même dérivation que les fiches MlmCompany et le chat Atlas.
export const brandSlugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// Rattache un nom de société saisi à une fiche MlmCompany, quel que soit son statut :
// le jour où la fiche passe PUBLISHED, le lien est déjà en place.
export async function resolveCompanyId(name: string): Promise<string | null> {
  const slug = brandSlugify(name)
  if (!slug) return null
  const c = await db.mlmCompany.findFirst({ where: { brandSlug: slug }, select: { id: true } })
  return c?.id ?? null
}
