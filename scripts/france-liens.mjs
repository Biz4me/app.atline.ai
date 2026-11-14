#!/usr/bin/env node
/**
 * LE SOCLE FRANCE — les sociétés de vente directe accessibles en France,
 * avec leur site officiel, et la preuve que ce site répond.
 *
 * ── 🔴 POURQUOI ON NE BALAIE PAS LES 893 ──────────────────────────────────
 *
 * La base porte 893 sociétés venues de businessforhome.org : c'est un
 * annuaire MONDIAL, et son champ `country` est le pays du SIÈGE, pas le
 * marché. Chercher « qui est en France » là-dedans demandait de sonder 866
 * domaines un par un, en rendant du JavaScript, pour découvrir ce qu'une
 * fédération française publie déjà.
 *
 * 🧭 La Fédération de la Vente Directe tient la liste de ses adhérents, avec
 * l'année d'adhésion et le lien de chaque société. C'est une source
 * PRIMAIRE, publique, française et datée. Le lien y est déclaré par la
 * fédération à laquelle la société appartient : l'officialité ne se devine
 * pas, elle est attestée.
 *
 * ⚠️ ELLE NE SUFFIT PAS, et c'est connu : Forever Living, doTERRA, Oriflame,
 * Zinzino, Farmasi, Atomy et quelques autres des plus connues ne sont PAS
 * adhérentes. Elles arrivent au second passage, et c'est là qu'est le vrai
 * travail. Ce script fait le premier.
 *
 * ── CE QU'IL FAIT, ET CE QU'IL NE FAIT PAS ────────────────────────────────
 *
 * Il récolte, il teste, il écrit un RAPPORT. **Il n'écrit rien en base.**
 * On regarde le rapport, on décide, et l'écriture est un second script.
 *
 *   node scripts/france-liens.mjs            → rapport dans /tmp/france-liens.json
 *   node scripts/france-liens.mjs --limite 8 → les huit premiers, pour essayer
 */

import { writeFileSync } from 'node:fs'

const FVD = 'https://fvd.fr'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const args = process.argv.slice(2)
const limite = args.includes('--limite') ? Number(args[args.indexOf('--limite') + 1]) : Infinity

/**
 * ⚠️ LES NOMS ARRIVENT AVEC LEURS ENTITÉS HTML. WordPress rend
 * `L&#8217;école` et `GAO &#8211; Groupement`. Notre propre base porte déjà
 * la même saleté importée de BFH (`LG Household &#038; Health Care`) : c'est
 * ce qu'un distributeur lirait dans le sélecteur de société.
 */
const decoder = (s) =>
  String(s ?? '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .trim()

const json = async (url) => {
  const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } })
  if (!r.ok) throw new Error(`${r.status} sur ${url}`)
  return { corps: await r.json(), entetes: r.headers }
}

/** Les adhérents, et le libellé de leur secteur. */
async function adherents() {
  const secteurs = new Map()
  for (let p = 1; p <= 4; p++) {
    try {
      const { corps } = await json(`${FVD}/wp-json/wp/v2/activites?per_page=100&page=${p}`)
      if (!corps.length) break
      for (const t of corps) secteurs.set(t.id, decoder(t.name))
    } catch {
      break
    }
  }
  const liste = []
  for (let p = 1; p <= 4; p++) {
    const { corps } = await json(`${FVD}/wp-json/wp/v2/nos-adherents?per_page=50&page=${p}`)
    if (!corps.length) break
    for (const a of corps) {
      liste.push({
        nom: decoder(a.title?.rendered),
        slugFvd: a.slug,
        secteurs: (a.activites ?? []).map((i) => secteurs.get(i)).filter(Boolean),
        ficheFvd: a.link,
      })
    }
    if (corps.length < 50) break
  }
  return liste
}

/**
 * LE SITE DÉCLARÉ PAR LA FÉDÉRATION, sur la fiche de la société.
 *
 * ⚠️ ON ÉCARTE LE BRUIT PRÉVISIBLE : l'extranet de la FVD, les réseaux
 * sociaux, Spotify. Ce qui reste est le site de la société — et s'il en
 * reste plusieurs, on les garde TOUS plutôt que d'en élire un au hasard.
 */
const BRUIT =
  /(fvd\.fr|facebook|instagram|linkedin|youtube|twitter|x\.com|spotify|tiktok|apple\.com|google\.|w\.org|gmpg|schema\.org|wp\.me)/i

async function siteDeclare(ficheUrl) {
  const r = await fetch(ficheUrl, { headers: { 'User-Agent': UA } })
  const html = await r.text()
  const re = /href="(https?:\/\/[^"]+)"/g
  const vus = new Set()
  let m
  while ((m = re.exec(html)) !== null) {
    const u = m[1]
    if (!BRUIT.test(u)) vus.add(u.replace(/[#?].*$/, '').replace(/\/$/, ''))
  }
  return [...vus]
}

/**
 * LE TEST DU LIEN — et il a QUATRE sorties, pas deux.
 *
 * 🔴 Mesuré le 14 novembre 2026 : sur onze adresses qui répondaient 200, SIX
 * servaient de l'anglais alors qu'on demandait le français. Un code 200
 * n'est pas une preuve, et c'est le même piège que « un 200 n'est pas une
 * ressource » du 1ᵉʳ novembre.
 *
 *   ok        — répond, et la page est en français
 *   anglais   — répond, mais pas en français (page monde, ou redirection)
 *   refuse    — 401/403 : l'hôte EXISTE et bloque les robots (amway.fr)
 *   mort      — ne résout pas, 404, 5xx
 *
 * ⚠️ `refuse` N'EST PAS `mort`. Confondre les deux, c'est ce que j'ai fait
 * la première fois, et ça retirait Amway de la liste.
 */
const MARQUEURS_FR = [
  /<html[^>]+lang=["']fr/i,
  /mentions\s+l[ée]gales/i,
  />\s*Panier\s*</i,
  />\s*Connexion\s*</i,
  /politique\s+de\s+confidentialit/i,
  /conditions\s+g[ée]n[ée]rales/i,
]
/** Preuve d'entité : une société française PUBLIE son immatriculation. */
const MARQUEURS_LEGAUX = /(RCS\s+[A-ZÉÈ][a-zéèêà-]+|SIREN|SIRET|S\.?A\.?S\.?U?\b|SARL|num[ée]ro\s+de\s+TVA)/

/** Un identifiant de distributeur dans l'adresse = site RÉPLIQUÉ, pas officiel. */
const REPLIQUE = /([?&](distrib|sponsor|ref|id|agent|rep)(id)?=)|(^https?:\/\/[^/]*\.(go|my)[a-z]+\.com)/i

/**
 * ── 🔴 LA SONDE MENTAIT PARCE QU'ELLE EST EN ALLEMAGNE (14 nov 2026) ──────
 *
 * Premier passage : sept sociétés classées « répond en anglais ». En les
 * regardant une par une, **cinq répondaient en ALLEMAND** — Herbalife France
 * renvoyait `herbalife.com/de-de`, LR `lrworld.com/de-de`, Elora
 * `elora.com/de-de`.
 *
 * 🧭 Ce n'est pas un défaut de leurs sites, c'est l'endroit d'où je mesure :
 * le serveur est chez Hetzner, en Allemagne. Ces sites géolocalisent par
 * ADRESSE IP et ignorent `Accept-Language`. Depuis Paris, le même lien
 * donnerait `/fr-fr`.
 *
 * Le remède est déterministe et gratuit : quand l'adresse finale porte un
 * segment de langue qui n'est pas le français, on le remplace par son
 * équivalent français et on re-teste. Si la page existe, c'est elle la bonne.
 */
const LOCALE = /\/(?:[a-z]{2}[-_][a-z]{2}|de|en|es|it|nl)(?=\/|$)/i
const enFrancais = (u) => {
  const m = u.match(LOCALE)
  if (!m) return null
  const seg = m[0].slice(1)
  const fr = seg.includes('-') ? 'fr-fr' : seg.includes('_') ? 'fr_FR' : 'fr'
  const candidat = u.replace(LOCALE, '/' + fr)
  return candidat === u ? null : candidat
}

async function tester(url, deja = false) {
  const ctrl = AbortSignal.timeout(20000)
  try {
    const r = await fetch(url, {
      redirect: 'follow',
      signal: ctrl,
      headers: { 'User-Agent': UA, 'Accept-Language': 'fr-FR,fr;q=0.9', Accept: 'text/html' },
    })
    /**
     * ⚠️ 401, 403 ET 426 DISENT TOUS « L'HÔTE EXISTE ET ME REFUSE ».
     * 426 (« Upgrade Required ») est arrivé sur Bell Anesse en Provence : le
     * serveur exige une négociation que mon client ne fait pas. Le ranger
     * dans « mort » aurait retiré de la liste une société bien vivante —
     * c'est exactement l'erreur que j'avais faite avec amway.fr.
     */
    if ([401, 403, 426, 429].includes(r.status))
      return { etat: 'refuse', code: r.status, finale: r.url }
    if (!r.ok) return { etat: 'mort', code: r.status, finale: r.url }
    const html = (await r.text()).slice(0, 400000)
    const fr = MARQUEURS_FR.some((re) => re.test(html))

    // Pas français, et l'adresse porte une langue : on tente la française.
    if (!fr && !deja) {
      const autre = enFrancais(r.url)
      if (autre) {
        const second = await tester(autre, true)
        if (second.etat === 'ok') return { ...second, viaLocale: r.url }
      }
    }

    return {
      etat: fr ? 'ok' : 'autreLangue',
      code: r.status,
      // ⚠️ L'ADRESSE FINALE, PAS CELLE QU'ON A DEMANDÉE : `tupperware.fr`
      // redirige vers `tupperware-eu.com`, et c'est la seconde qu'il faut garder.
      finale: r.url.replace(/\/$/, ''),
      legal: MARQUEURS_LEGAUX.test(html),
      replique: REPLIQUE.test(r.url),
      langue: (html.match(/<html[^>]+lang=["']([a-zA-Z-]+)/) || [])[1] ?? null,
    }
  } catch (e) {
    return { etat: 'mort', code: 0, erreur: String(e.message || e).slice(0, 80) }
  }
}

const lots = async (items, n, fn) => {
  const out = []
  for (let i = 0; i < items.length; i += n) {
    out.push(...(await Promise.all(items.slice(i, i + n).map(fn))))
    process.stderr.write(`\r  ${Math.min(i + n, items.length)}/${items.length}`)
  }
  process.stderr.write('\n')
  return out
}

const main = async () => {
  console.log('── adhérents FVD')
  const tous = (await adherents()).slice(0, limite)
  console.log(`  ${tous.length} sociétés`)

  console.log('── le site déclaré sur chaque fiche')
  const avecSite = await lots(tous, 6, async (a) => {
    try {
      return { ...a, candidats: await siteDeclare(a.ficheFvd) }
    } catch (e) {
      return { ...a, candidats: [], erreurFiche: String(e.message || e).slice(0, 60) }
    }
  })

  console.log('── test de chaque lien')
  const resultat = await lots(avecSite, 6, async (a) => {
    const essais = []
    for (const u of a.candidats.slice(0, 3)) essais.push({ url: u, ...(await tester(u)) })
    // Le meilleur d'abord : français > anglais > refusé > mort.
    const rang = { ok: 0, autreLangue: 1, refuse: 2, mort: 3 }
    essais.sort((x, y) => rang[x.etat] - rang[y.etat])
    return { ...a, essais, retenu: essais[0] ?? null }
  })

  const par = (e) => resultat.filter((r) => r.retenu?.etat === e).length
  console.log('\n── BILAN')
  console.log(`  français prouvé : ${par('ok')}`)
  console.log(`  répond dans une autre langue : ${par('autreLangue')}`)
  console.log(`  refuse les robots : ${par('refuse')}`)
  console.log(`  mort ou introuvable : ${par('mort')}`)
  console.log(`  aucun lien sur la fiche : ${resultat.filter((r) => !r.retenu).length}`)

  const chemin = '/tmp/france-liens.json'
  writeFileSync(chemin, JSON.stringify({ quand: new Date().toISOString(), resultat }, null, 1))
  console.log(`\n  rapport → ${chemin}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
