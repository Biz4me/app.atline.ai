/**
 * PARAMÉTRER LA BOUTIQUE D'UN DISTRIBUTEUR — et enrichir la base au passage.
 *
 * La démarche, décidée le 29 juillet : dès qu'un distributeur nous donne son
 * lien boutique, on va y lire son catalogue réel. Pour lui, c'est un service
 * — « je paramètre ta boutique ». Pour Atline, c'est la seule source de
 * produits vraiment fiable : son pays, sa devise, ses prix d'aujourd'hui.
 *
 * Et c'est cumulatif : chaque nouveau distributeur enrichit la base pour tous
 * ceux de sa société qui viendront après lui. On ne paie plus pour deviner à
 * l'avance ce dont 697 sociétés pourraient avoir besoin.
 *
 * Trois précautions envers un site qu'on ne possède pas :
 *
 *   • ON N'ÉCRASE JAMAIS. On complète. Un produit déjà connu voit son prix
 *     mis à jour, jamais son existence remise en cause : une moisson ratée
 *     ne doit pas vider un catalogue.
 *
 *   • ON N'Y RETOURNE PAS TOUS LES JOURS. Une boutique par semaine au plus.
 *     Le catalogue d'une société MLM ne change pas toutes les heures, et on
 *     ne martèle pas le site de quelqu'un.
 *
 *   • LA DEVISE VIENT DE LA BOUTIQUE. C'est tout l'intérêt : un distributeur
 *     français lit des euros parce que SA boutique est en euros. Fini les
 *     dollars affichés à un prospect de Marseille.
 */

import { db } from '@/lib/db'

const MAX_PRODUITS = 400
const DELAI_ENTRE_MOISSONS_H = 168   // une semaine

export type Moisson = {
  ok: boolean
  plateforme?: 'shopify' | 'woocommerce'
  trouves?: number
  ajoutes?: number
  majs?: number
  devise?: string
  raison?: string
}

type ProduitLu = {
  nom: string
  slug: string
  description?: string
  prix?: number
  devise?: string
  image?: string
  url?: string
}

const nettoyer = (s: unknown): string =>
  String(s ?? '')
    .replace(/<[^>]+>/g, ' ')
    // les caractères de contrôle font échouer Prisma en écriture ("unexpected
    // end of hex escape") — on les retire avant toute chose
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const slugifier = (s: string): string =>
  nettoyer(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)

async function lire(url: string, timeout = 15000): Promise<Response | null> {
  try {
    return await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AtlineShopSetup/1.0)' },
      signal: AbortSignal.timeout(timeout),
    })
  } catch {
    return null
  }
}

/** Shopify expose son catalogue en clair : c'est prévu pour, on n'extorque rien. */
async function moissonShopify(origine: string): Promise<{ produits: ProduitLu[]; devise?: string } | null> {
  const r = await lire(`${origine}/products.json?limit=250`)
  if (!r?.ok) return null
  const data = (await r.json().catch(() => null)) as { products?: unknown[] } | null
  if (!Array.isArray(data?.products) || !data.products.length) return null

  const produits: ProduitLu[] = []
  for (const brut of data.products.slice(0, MAX_PRODUITS)) {
    const p = brut as {
      title?: string; handle?: string; body_html?: string
      variants?: { price?: string }[]; images?: { src?: string }[]
    }
    const nom = nettoyer(p.title)
    if (!nom) continue
    const prixTexte = p.variants?.[0]?.price
    produits.push({
      nom,
      slug: slugifier(p.handle || nom),
      description: nettoyer(p.body_html).slice(0, 1500) || undefined,
      prix: prixTexte ? Number(prixTexte) : undefined,
      image: p.images?.[0]?.src,
      url: p.handle ? `${origine}/products/${p.handle}` : origine,
    })
  }
  return produits.length ? { produits } : null
}

/** WooCommerce publie son catalogue via l'API Store, sans authentification. */
async function moissonWoo(origine: string): Promise<{ produits: ProduitLu[]; devise?: string } | null> {
  const r = await lire(`${origine}/wp-json/wc/store/products?per_page=100`)
  if (!r?.ok) return null
  const data = (await r.json().catch(() => null)) as unknown[]
  if (!Array.isArray(data) || !data.length) return null

  let devise: string | undefined
  const produits: ProduitLu[] = []
  for (const brut of data.slice(0, MAX_PRODUITS)) {
    const p = brut as {
      name?: string; slug?: string; description?: string; permalink?: string
      images?: { src?: string }[]
      prices?: { price?: string; currency_code?: string; currency_minor_unit?: number }
    }
    const nom = nettoyer(p.name)
    if (!nom) continue
    devise ||= p.prices?.currency_code
    // Woo donne les prix en unité mineure (centimes) : 1250 = 12,50
    const mineur = p.prices?.currency_minor_unit ?? 2
    const brutPrix = p.prices?.price ? Number(p.prices.price) : undefined
    produits.push({
      nom,
      slug: slugifier(p.slug || nom),
      description: nettoyer(p.description).slice(0, 1500) || undefined,
      prix: Number.isFinite(brutPrix) ? (brutPrix as number) / 10 ** mineur : undefined,
      image: p.images?.[0]?.src,
      url: p.permalink || origine,
    })
  }
  return produits.length ? { produits, devise } : null
}

/**
 * Moissonne la boutique d'une activité et complète le catalogue de sa société.
 * Ne jette jamais : c'est un service rendu, pas une opération critique.
 */
export async function moissonnerBoutique(mlmBusinessId: string, forcer = false): Promise<Moisson> {
  const activite = await db.userMlmBusiness.findUnique({
    where: { id: mlmBusinessId },
    select: { id: true, companyId: true, mlmName: true },
  })
  if (!activite?.companyId) return { ok: false, raison: 'aucune société rattachée' }

  const lien = await db.toolboxLink.findFirst({
    where: { mlmBusinessId, linkType: 'BOUTIQUE' },
    select: { id: true, url: true, updatedAt: true },
  })
  if (!lien?.url) return { ok: false, raison: 'aucun lien boutique' }

  // On ne martèle pas le site de quelqu'un.
  if (!forcer) {
    const dernier = await db.mlmProduct.findFirst({
      where: { companyId: activite.companyId, sourceUrl: { contains: new URL(lien.url).hostname } },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    })
    if (dernier && Date.now() - dernier.updatedAt.getTime() < DELAI_ENTRE_MOISSONS_H * 3600_000) {
      return { ok: true, raison: 'déjà moissonnée cette semaine', trouves: 0 }
    }
  }

  let origine: string
  try {
    origine = new URL(lien.url).origin
  } catch {
    return { ok: false, raison: 'lien boutique illisible' }
  }

  const shopify = await moissonShopify(origine)
  const resultat = shopify ?? (await moissonWoo(origine))
  const plateforme: Moisson['plateforme'] = shopify ? 'shopify' : resultat ? 'woocommerce' : undefined
  if (!resultat) {
    return { ok: false, raison: 'catalogue non lisible automatiquement sur cette boutique' }
  }

  const devise = resultat.devise || 'EUR'
  let ajoutes = 0
  let majs = 0

  for (const p of resultat.produits) {
    if (!p.slug) continue
    try {
      const existant = await db.mlmProduct.findUnique({
        where: { companyId_slug: { companyId: activite.companyId, slug: p.slug } },
        select: { id: true },
      })
      const donnees = {
        name: p.nom.slice(0, 300),
        description: p.description,
        price: p.prix != null && Number.isFinite(p.prix) ? p.prix : undefined,
        currency: devise,
        imageUrl: p.image,
        sourceUrl: p.url,
        status: 'PUBLISHED' as const,
      }
      if (existant) {
        // On complète, on ne remet jamais l'existence en cause.
        await db.mlmProduct.update({ where: { id: existant.id }, data: donnees })
        majs++
      } else {
        await db.mlmProduct.create({
          data: { companyId: activite.companyId, slug: p.slug, ...donnees },
        })
        ajoutes++
      }
    } catch {
      // un produit illisible ne fait pas échouer les 399 autres
    }
  }

  return { ok: true, plateforme, trouves: resultat.produits.length, ajoutes, majs, devise }
}
