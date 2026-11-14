/**
 * TESTER UN LIEN DE SOCIÉTÉ — et savoir ce que le résultat veut dire.
 *
 * ── 🔴 POURQUOI CE FICHIER EXISTE (14 novembre 2026) ──────────────────────
 *
 * Deux scripts cherchent la même chose : `france-liens.mjs` sur les adhérents
 * de la FVD, `france-societes.mjs` sur tout le reste. La sonde a déjà menti
 * DEUX FOIS en une soirée, et chaque correction doit valoir pour les deux —
 * recopiée, la seconde copie garderait le défaut et personne ne le saurait.
 */

export const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

/**
 * ⚠️ LES NOMS ARRIVENT AVEC LEURS ENTITÉS HTML, des deux côtés : WordPress
 * rend `L&#8217;école`, et notre propre base porte `LG Household &#038;
 * Health Care` importé de BFH. C'est ce qu'un distributeur lirait dans le
 * sélecteur de société.
 */
export const decoder = (s) =>
  String(s ?? '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .trim()

/** Du français vu dans la page, pas devine depuis l'adresse. */
const MARQUEURS_FR = [
  /<html[^>]+lang=["']fr/i,
  /mentions\s+l[ée]gales/i,
  />\s*Panier\s*</i,
  />\s*Connexion\s*</i,
  /politique\s+de\s+confidentialit/i,
  /conditions\s+g[ée]n[ée]rales/i,
  />\s*Nos produits\s*</i,
  />\s*Rechercher\s*</i,
]

/** Un identifiant de distributeur dans l'adresse = site RÉPLIQUÉ, pas officiel. */
export const REPLIQUE =
  /([?&](distrib|sponsor|ref|id|agent|rep)(id)?=)|(^https?:\/\/[^/]*\.(go|my)[a-z]+\.com)/i

/**
 * ── 🔴 LE PIÈGE LE PLUS DANGEREUX : LE DOMAINE PARQUÉ (14 novembre 2026) ──
 *
 * Deviner `<marque>.fr` tombe sur des squatteurs, et ils répondent 200 :
 *
 *   youngliving.fr → « Dovendi — youngliving.fr est maintenant à vendre »
 *   atomy.fr       → « atomy.fr is registered at Namecheap »
 *   farmasi.fr     → redirige vers forsale.dynadot.com
 *
 * 🧭 ET LE PREMIER EST EN FRANÇAIS. « est maintenant à vendre » coche mes
 * marqueurs : sans ce garde, la sonde aurait enregistré une page de vente de
 * nom de domaine comme **le site officiel de Young Living**, avec l'air
 * d'avoir réussi. C'est la pire sorte de faux positif — il ne ressemble pas
 * à une erreur.
 */
const PARQUE = [
  /est\s+maintenant\s+[àa]\s+vendre/i,
  /\b(domain|domaine)\b[^.]{0,40}\b(for\s+sale|[àa]\s+vendre)\b/i,
  /is\s+registered\s+at\s+\w+/i,
  /this\s+domain\s+(is|may\s+be)\s+for\s+sale/i,
  /(dynadot|sedo\.com|afternic|dan\.com|namecheap\.com\/domains|hugedomains|bodis|parkingcrew)/i,
  /acheter\s+ce\s+nom\s+de\s+domaine/i,
]
const estParque = (html, url) => PARQUE.some((re) => re.test(html) || re.test(url))

/**
 * ── 🔴 LA SONDE MENTAIT PARCE QU'ELLE EST EN ALLEMAGNE ────────────────────
 *
 * Premier passage sur la FVD : sept sociétés classées « anglais ». Cinq
 * répondaient en **allemand** — Herbalife renvoyait `herbalife.com/de-de`, LR
 * `lrworld.com/de-de`. Le serveur est chez Hetzner ; ces sites géolocalisent
 * par ADRESSE IP et ignorent `Accept-Language`. Depuis Paris, le même lien
 * donne `/fr-fr`.
 *
 * Remède déterministe : quand l'adresse finale porte un segment de langue qui
 * n'est pas le français, on le remplace et on re-teste.
 */
const LOCALE = /\/(?:[a-z]{2}[-_][a-z]{2}|de|en|es|it|nl)(?=\/|$)/i
export const enFrancais = (u) => {
  const m = u.match(LOCALE)
  if (!m) return null
  const seg = m[0].slice(1)
  const fr = seg.includes('-') ? 'fr-fr' : seg.includes('_') ? 'fr_FR' : 'fr'
  const candidat = u.replace(LOCALE, '/' + fr)
  return candidat === u ? null : candidat
}

/**
 * QUATRE SORTIES, ET PAS DEUX.
 *
 *   ok          — répond, et la page est en français
 *   autreLangue — répond, mais sert une autre langue
 *   refuse      — 401/403/426/429 : l'hôte EXISTE et bloque les robots
 *   mort        — ne résout pas, 404, 5xx
 *
 * ⚠️ `refuse` N'EST PAS `mort`, et c'est la faute que j'ai faite deux fois :
 * d'abord en rangeant `amway.fr` (403) dans les introuvables, puis en
 * rangeant `bell-anesse-en-provence.fr` (426, « Upgrade Required ») au même
 * endroit. Un hôte qui répond quelque chose existe.
 */
export async function tester(url, deja = false) {
  try {
    const r = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
      headers: { 'User-Agent': UA, 'Accept-Language': 'fr-FR,fr;q=0.9', Accept: 'text/html' },
    })
    if ([401, 403, 426, 429].includes(r.status))
      return { etat: 'refuse', code: r.status, url, finale: r.url }
    if (!r.ok) return { etat: 'mort', code: r.status, url, finale: r.url }

    const html = (await r.text()).slice(0, 400000)

    // ⚠️ AVANT TOUT AUTRE JUGEMENT : un domaine parqué n'est pas un site.
    if (estParque(html, r.url))
      return { etat: 'parque', code: r.status, url, finale: r.url.replace(/\/$/, '') }

    const fr = MARQUEURS_FR.some((re) => re.test(html))

    if (!fr && !deja) {
      const autre = enFrancais(r.url)
      if (autre) {
        const second = await tester(autre, true)
        if (second.etat === 'ok') return { ...second, url, viaLocale: r.url }
      }
    }

    return {
      etat: fr ? 'ok' : 'autreLangue',
      code: r.status,
      url,
      // ⚠️ L'ADRESSE FINALE, PAS CELLE QU'ON A DEMANDÉE : `tupperware.fr`
      // redirige vers `tupperware-eu.com`, et c'est la seconde qu'il faut garder.
      finale: r.url.replace(/\/$/, ''),
      replique: REPLIQUE.test(r.url),
      langue: (html.match(/<html[^>]+lang=["']([a-zA-Z-]+)/) || [])[1] ?? null,
    }
  } catch (e) {
    return { etat: 'mort', code: 0, url, erreur: String(e.message || e).slice(0, 80) }
  }
}

/**
 * ── 🎯 LE SITEMAP : LA SEULE VOIE QUI IGNORE LES TROIS PIÈGES ─────────────
 *
 * Deviner `<marque>.fr` tombe sur des squatteurs. Suivre le site mondial
 * dépend de l'adresse IP d'où l'on mesure. Cliquer dans un sélecteur de pays
 * demande un navigateur, et `amway.fr` refuse même un vrai navigateur.
 *
 * 🧭 Le sitemap, lui, est un fichier XML **statique** que le site publie pour
 * les moteurs : il liste TOUTES ses adresses, toutes langues confondues, sans
 * négocier quoi que ce soit. Pas de JavaScript, pas de géolocalisation, et
 * souvent hors du pare-feu anti-robots qui protège les pages.
 *
 * ⚠️ IL FAUT LIRE `robots.txt` D'ABORD, et pas taper `/sitemap.xml` au
 * hasard : Forever Living cache le sien dans `/RobotsAndSitemap/PROD/`. On
 * le savait depuis le 1ᵉʳ novembre — `scripts/lib/sitemap-produits.mjs` le
 * dit — et c'est exactement le genre de détail qu'on redécouvre en le
 * redevinant.
 */
const EST_FR = /\/(fr|fr[-_]fr|fr[-_]FR|france)(\/|$)|\.fr(\/|$)/i

async function texte(url, max = 3_000_000) {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { 'User-Agent': UA },
  })
  if (!r.ok) return null
  return (await r.text()).slice(0, max)
}

export async function viaSitemap(siteUrl) {
  let base
  try {
    base = new URL(siteUrl).origin
  } catch {
    return []
  }

  const sitemaps = []
  const rob = await texte(`${base}/robots.txt`, 200000).catch(() => null)
  if (rob) for (const m of rob.matchAll(/^\s*sitemap:\s*(\S+)/gim)) sitemaps.push(m[1])
  if (!sitemaps.length) sitemaps.push(`${base}/sitemap.xml`)

  const trouves = new Set()
  for (const s of sitemaps.slice(0, 3)) {
    const x = await texte(s).catch(() => null)
    if (!x) continue
    const locs = [...x.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1])
    // Un index pointe vers d'autres sitemaps : on descend d'un cran.
    if (/<sitemapindex/i.test(x)) {
      // ⚠️ On ne descend QUE dans les enfants qui sentent le français, sinon
      // on télécharge le catalogue mondial pour trouver une page d'accueil.
      const enfants = locs.filter((u) => EST_FR.test(u)).slice(0, 6)
      for (const e of enfants.length ? enfants : locs.slice(0, 4)) {
        const y = await texte(e).catch(() => null)
        if (!y) continue
        for (const m of y.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi))
          if (EST_FR.test(m[1])) trouves.add(m[1])
        if (trouves.size > 40) break
      }
    }
    for (const u of locs) if (EST_FR.test(u)) trouves.add(u)
    if (trouves.size) break
  }

  // ⚠️ LA PLUS COURTE EST LA PAGE D'ACCUEIL. Un sitemap liste des milliers de
  // pages profondes ; celle qu'on veut est la racine de la section française.
  return [...trouves].sort((a, b) => a.length - b.length).slice(0, 4)
}

/** Le meilleur essai d'abord : français > autre langue > refusé > mort. */
export const RANG = { ok: 0, autreLangue: 1, refuse: 2, parque: 3, mort: 4 }
export const meilleur = (essais) =>
  [...essais].sort((a, b) => RANG[a.etat] - RANG[b.etat])[0] ?? null

/** Par paquets, avec un compteur, pour ne pas assommer les serveurs. */
export const lots = async (items, n, fn) => {
  const out = []
  for (let i = 0; i < items.length; i += n) {
    out.push(...(await Promise.all(items.slice(i, i + n).map(fn))))
    process.stderr.write(`\r  ${Math.min(i + n, items.length)}/${items.length}   `)
  }
  process.stderr.write('\n')
  return out
}
