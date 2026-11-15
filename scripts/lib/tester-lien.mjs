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

    /**
     * 🔴 ET UN SITE RÉPLIQUÉ N'EST PAS LE SITE DE LA SOCIÉTÉ. Je le MARQUAIS
     * sans jamais le refuser, et le balayage des 866 l'a montré : Magnetix
     * Wellness ressortait sur `vitalixworld.com/fr?ref=www`, Cerule sur
     * `vitalite.cerule.com/?country=FR`. Un drapeau que personne ne lit ne
     * protège de rien.
     *
     * ⚠️ Et le cas le plus parlant ne porte aucun identifiant : notre base
     * donne `hlfshop.fr` comme site officiel d'Herbalife depuis juillet —
     * c'est la BOUTIQUE d'un distributeur. Le domaine ne ressemble pas au
     * nom de la marque, et c'est ce contrôle-là qui l'attrape, pas celui-ci.
     */
    if (REPLIQUE.test(r.url))
      return { etat: 'replique', code: r.status, url, finale: r.url.replace(/\/$/, '') }

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

/**
 * ── 🔴 LE DOMAINE RESSEMBLE-T-IL AU NOM ? (15 novembre 2026) ───────────────
 *
 * `REPLIQUE` attrape les adresses qui PORTENT un identifiant. Mais le cas le
 * plus grave n'en porte aucun : notre base donne `hlfshop.fr` comme site
 * officiel d'**Herbalife** depuis juillet, et c'est la boutique d'un
 * distributeur. Rien dans l'URL ne le dit — seul le fait que le domaine ne
 * ressemble pas à la marque le trahit. Pareil pour `Make Wellness → meet.fr`
 * et, le plus beau, `USANA → connaitredieu.com`.
 *
 * ⚠️ MA PREMIÈRE VERSION DE CE CONTRÔLE PRENAIT LA PREMIÈRE ÉTIQUETTE DE
 * L'HÔTE. Sur `fr.amc.info` elle comparait « amc » à « fr », et déclarait
 * suspects cinq sites parfaitement officiels (`fr.coral.club`,
 * `fr.sunrider.com`, `ww1.lifeplus.com`…). On compare donc l'hôte ENTIER,
 * étiquettes de langue et `www`/`ww1`/`boutique` retirées.
 *
 * 🧭 Ce contrôle ne tranche pas, il TRIE : il a des faux positifs connus
 * (`LR Health & Beauty → lrworld.com`), donc il pose un drapeau à relire, pas
 * un refus. Un contrôle qui se trompe une fois sur cinq doit produire une
 * pile, jamais un verdict.
 */
const BRUIT = /^(www\d?|ww\d|fr|france|boutique|shop|store|my|go|new|m)$/i
const ailleurs =
  /^(africa|america|asia|canada|ca|be|belgium|ch|suisse|swiss|quebec|qc|uk|us|de|es|it|nl|pl|ru|br|mx|in|cn|jp)\./i

export function identite(nom, url) {
  let hote
  try {
    hote = new URL(url).hostname.toLowerCase()
  } catch {
    return { colle: false, pourquoi: 'adresse illisible' }
  }
  const nu = (s) =>
    String(s ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]/g, '')

  // Toutes les étiquettes sauf le bruit et le suffixe public approximé.
  const etiquettes = hote.split('.').filter((e) => !BRUIT.test(e))
  const corps = nu(etiquettes.slice(0, -1).join('')) || nu(etiquettes.join(''))

  const marque = nu(nom)
  const mots = decoder(nom)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2)
    // ⚠️ Les mots passe-partout d'un nom de société ne prouvent rien : un
    // domaine qui contient « international » n'est pas pour autant la marque.
    .filter((w) => !/^(international|group|groupe|global|world|company|corp|products?|france|health|beauty|wellness|life|nature|naturel)$/.test(w))

  const colle =
    (marque.length > 3 && (corps.includes(marque) || marque.includes(corps))) ||
    mots.some((w) => corps.includes(w) || (w.length > 5 && w.includes(corps)))

  if (!colle) return { colle: false, pourquoi: `le domaine « ${hote} » ne porte pas la marque` }
  if (ailleurs.test(hote)) return { colle: true, pourquoi: `hôte d'une autre région : ${hote}` }
  return { colle: true }
}

/**
 * ── 🧭 « EN FRANÇAIS » N'EST PAS « EN FRANCE » (15 novembre 2026) ─────────
 *
 * La sonde a été bâtie contre le piège de la LANGUE : elle exige du français
 * rendu, et elle remplace une locale allemande par la française. Elle n'a
 * jamais eu de garde contre le piège du PAYS, et sur les 186 sites retenus il
 * en est sorti quatre :
 *
 *   unicity.com/can/fr/…            → le Canada, en français
 *   zinzino.com/site/fr/de-de       → l'Allemagne (DEUX locales, et
 *                                     `enFrancais` n'avait remplacé que la 1ʳᵉ)
 *   victoria-benelux.com/fr-be      → la Belgique
 *   vabon.com/fr-de                 → l'Allemagne
 *
 * Tous servent du français parfait. Aucun ne sert la France. Et un
 * distributeur français envoyé sur le tarif belge y verra des prix faux.
 *
 * On refuse aussi les pages qui ne sont pas un site : une page de connexion
 * n'ouvre rien à qui n'a pas de compte.
 */
const AUTRE_PAYS = [
  // une locale de langue-pays dont le PAYS n'est pas la France
  /[/_-](?:[a-z]{2})[-_](?:be|ch|ca|lu|mc|de|at|us|uk|gb|es|it|nl|pt|pl|ru|tr|br|mx|jp|cn|kr|dk|se|no|fi|cz|hu|ro|gr|in|au|nz|za|ma|tn|dz)(?:[/?#]|$)/i,
  // un segment de pays en clair dans le chemin
  /\/(?:can|canada|belgique|belgium|suisse|swiss|schweiz|usa|deutschland|espana|italia|nederland|osterreich|luxembourg|quebec)(?:[/?#]|$)/i,
  // ou dans l'hôte
  /^[^/]*\/\/[^/]*(?:benelux|-be\.|-ch\.|-ca\.|canada|suisse|belgique)/i,
]
const PAS_UN_SITE = /\/(?:login|signin|sign-in|connexion|se-connecter|account|mon-compte|logout|cart|panier)(?:[/?#]|$)/i

export function enFrance(url) {
  // ⚠️ `fr-fr` et `/fr/fr` contiennent « fr-fr » : on protège d'abord ce qui
  // est explicitement français, sinon le garde se mord la queue.
  const sansFr = String(url).replace(/[/_-]fr[-_]fr(?=[/?#]|$)/gi, '/fr')
  for (const re of AUTRE_PAYS)
    if (re.test(sansFr)) return { ok: false, pourquoi: `adresse d'un autre pays : ${url}` }
  if (PAS_UN_SITE.test(url)) return { ok: false, pourquoi: `ce n'est pas un site, c'est une page de compte : ${url}` }
  return { ok: true }
}

/** Le meilleur essai d'abord : français > autre langue > refusé > mort. */
export const RANG = { ok: 0, autreLangue: 1, refuse: 2, replique: 3, parque: 4, mort: 5 }
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
