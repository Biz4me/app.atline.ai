#!/usr/bin/env node
/**
 * LE LIEN FRANCE DES SOCIÉTÉS QUI NE SONT PAS À LA FVD.
 *
 * ── CE QUI DISTINGUE CE SCRIPT DE `france-liens.mjs` ──────────────────────
 *
 * Pour les 101 adhérents, la fédération DÉCLARE le lien : l'officialité est
 * attestée, il ne restait qu'à tester. Ici personne ne déclare rien — c'est
 * nous qui proposons des adresses et qui regardons si elles répondent en
 * français. L'officialité se prouve donc autrement : par le DOMAINE.
 *
 * 🧭 Un site officiel français vit sur le domaine de la marque (`.fr`, ou un
 * chemin de langue du domaine mondial). Un site de distributeur, lui, porte
 * un identifiant — `?distribID=`, `nom.goherbalife.com`. C'est ce qu'on
 * écarte, et c'est le seul moyen de ne pas prendre la boutique d'un
 * concurrent pour le site de la société.
 *
 * ── CE QU'IL FAIT ─────────────────────────────────────────────────────────
 *
 * ① revérifie le lien MONDE déjà en base (il date de juillet, jamais testé)
 * ② cherche le lien FRANCE par les quatre motifs classiques
 * ③ propose un secteur dans la liste FERMÉE de la FVD, depuis ce qu'on a déjà
 *
 * **Il n'écrit rien en base.** Rapport dans /tmp/france-societes.json.
 *
 *   node scripts/france-societes.mjs              → les non-adhérentes connues
 *   node scripts/france-societes.mjs --toutes     → les 866 actives
 *   node scripts/france-societes.mjs --limite 10
 */

import { writeFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { decoder, tester, meilleur, lots, viaSitemap, identite } from './lib/tester-lien.mjs'

const db = new PrismaClient()
const args = process.argv.slice(2)
const toutes = args.includes('--toutes')
const limite = args.includes('--limite') ? Number(args[args.indexOf('--limite') + 1]) : Infinity
/**
 * 🧭 `--classer-seulement` ne touche pas au réseau. Le classement est la
 * partie qu'on corrige le plus souvent, et c'est la seule qui soit
 * instantanée : la relire sur les 866 fiches ne doit pas coûter un balayage.
 */
const classerSeulement = args.includes('--classer-seulement')

/**
 * LES NON-ADHÉRENTES DE LA LISTE QAREI, relevée le 17 septembre 2026.
 *
 * ⚠️ LEUR LISTE ANNONCE 120 ENTREPRISES, MAIS PAS 120 SOCIÉTÉS. LR, Vorwerk
 * et PM International y figurent DEUX FOIS — une fois en filiale française
 * adhérente, une fois en groupe non adhérent. On ne garde ici que ce qui
 * n'est pas déjà couvert par les 101 de la FVD.
 */
const NON_ADHERENTES = [
  'doterra', 'forever living', 'naturellement bien', 'nikken', 'young living',
  'pierre lang', 'farmasi', 'oriflame', 'ringana', 'atomy', 'partylite',
  'kirby', 'captain tortue', 'kyani', 'xelliss', 'zinzino',
]

/**
 * LES 22 SECTEURS DE LA FVD — liste FERMÉE, et c'est tout l'intérêt.
 *
 * 🔴 Notre colonne `category` porte **265 valeurs distinctes** en deux
 * vocabulaires qui cohabitent : `nutrition, cosmétique` en minuscules libres
 * d'un côté, `Bien-être, Nutrition et Santé` capitalisé de l'autre. Et
 * `nutrition, cosmétique` et `cosmétique, nutrition` comptent pour deux.
 *
 * 🧭 On ne remplace pas une liste libre par une autre liste libre : on prend
 * celle d'une fédération française, déjà appliquée au marché français, et on
 * s'y range. Une société peut relever de plusieurs secteurs.
 */
const SECTEURS = [
  "Amélioration de l'habitat", 'Bijoux', 'Compléments alimentaires', 'Cosmétiques',
  'Décorations - Loisirs créatifs', 'Edition', 'Force de vente', 'Formation',
  "Fournisseur d'énergie", 'Gastronomie - Univers Culinaire', 'Hygiène de la maison',
  'Immobilier', 'Lingerie', 'Mode & Accessoires', 'Mode & bijoux',
  'Ménager - Electroménager', 'Opticien', 'Parfums', 'Presse', 'Sécurité',
  "Traitement de l'eau", 'Télécommunication',
]

/**
 * ⚠️ UNE TABLE, PAS UN MODÈLE. Zéro requête, zéro crédit, et surtout un
 * résultat qu'on peut relire ligne par ligne, ce qu'une réponse de modèle ne
 * permet pas. Ce qui ne tombe dans aucun seau sort vide et se traite à la main.
 *
 * ── 🧭 LA RÈGLE QUI A TOUT RÉORGANISÉ (15 novembre 2026) ──────────────────
 *
 * **La catégorie est une liste d'ÉTIQUETTES, le pitch est de la PROSE. Le même
 * mot porte un secteur dans une étiquette et ne porte rien du tout dans de la
 * prose.** « mode » seul est un secteur ; « un mode de vie sain » n'en est pas.
 * « formation » dans une catégorie veut dire qu'on vend de la formation ; dans
 * un pitch de MLM, ça veut dire qu'on forme ses distributeurs — c'est-à-dire
 * tout le monde.
 *
 * D'où la troisième colonne : `proseInterdite` = ce seau ne se remplit QUE
 * depuis une étiquette. La mesure du 15 novembre le confirme : le pitch
 * ajoutait 13 « Formation » (via « éducation ») et 7 « Fournisseur d'énergie »
 * (via « retrouvez votre énergie »), contre 18 « Parfums » et 4
 * « Décorations » parfaitement justes.
 */
const SEAUX = [
  [/\b(habitat|r[ée]novation|isolation|toiture|photovolta|menuiserie|ravalement)/i, "Amélioration de l'habitat"],
  [/\b(bijou|joaill)/i, 'Bijoux'],
  [/\b(nutrition|compl[ée]ment|bien-[êe]tre|sant[ée]|aloe|vitamin|minceur|di[ée]t[ée]t)/i, 'Compléments alimentaires'],
  [/\b(cosm[ée]tique|beaut[ée]|soin|maquillage|skincare)/i, 'Cosmétiques'],
  [/\b(d[ée]coration|loisirs cr[ée]atifs|scrapbook|bougie|jouet)/i, 'Décorations - Loisirs créatifs'],
  [/\b([ée]dition|livre)\b/i, 'Edition', true],
  [/\b(formation|coaching|[ée]ducation)/i, 'Formation', true],
  [/\b([ée]nergie|solaire|gaz|[ée]lectricit)/i, "Fournisseur d'énergie", true],
  [/\b(culinaire|cuisine|gastronom|alimentaire|surgel|vin|th[ée]|caf[ée])\b/i, 'Gastronomie - Univers Culinaire', true],
  [/\b(entretien|m[ée]nager?|hygi[èe]ne|nettoyage|lessive)\b/i, 'Hygiène de la maison'],
  [/\bimmobilier/i, 'Immobilier'],
  [/\blingerie/i, 'Lingerie'],
  [/\b(mode|v[êe]tement|pr[êe]t-[àa]-porter|accessoire|chaussure|textile)\b/i, 'Mode & Accessoires', true],
  [/\b([ée]lectrom[ée]nager|aspirat|robot|appareil)/i, 'Ménager - Electroménager', true],
  [/\b(optique|lunette)/i, 'Opticien'],
  [/\bparfum/i, 'Parfums'],
  [/\b(presse|magazine|m[ée]dia)\b/i, 'Presse', true],
  [/\b(s[ée]curit|alarme|t[ée]l[ée]surveillance)/i, 'Sécurité'],
  [/\b(traitement de l.eau|filtration|adoucisseur|purificat)/i, "Traitement de l'eau"],
  [/\b(t[ée]l[ée]com|mobile|forfait)\b/i, 'Télécommunication', true],
]

const nu = (s) =>
  decoder(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()

/**
 * 🔴 LE DÉFAUT QUE CETTE TABLE CORRIGE, ET QUI TOUCHAIT LES MEILLEURES FICHES.
 *
 * `LR Health et Beauty` porte la catégorie « Compléments alimentaires,
 * Cosmétiques » — déjà écrite dans le vocabulaire exact de la FVD. Le
 * classement en sortait pourtant **trois** secteurs, dont « Gastronomie » :
 * le mot « alimentaires », à l'intérieur du nom officiel d'un secteur, tombait
 * dans le seau d'un autre.
 *
 * 🧭 On reconnaît donc le vocabulaire AVANT de chercher des mots dedans. Une
 * étiquette qui EST un secteur n'a pas à être devinée.
 */
const PAR_NOM = new Map(SECTEURS.map((s) => [nu(s), s]))

/** On coupe sur les virgules et les « et », jamais sur « & » : « Mode & Accessoires » est UN nom. */
const fragments = (categorie) =>
  nu(categorie)
    .split(/[,;/]|\bet\b|\bund\b/)
    .map((f) => f.trim())
    .filter(Boolean)

function classer(categorie, pitch) {
  const trouves = new Map()
  const pose = (s, source) => trouves.has(s) || trouves.set(s, source)

  // ① l'étiquette qui EST un secteur, reconnue telle quelle
  // ② sinon, les mots de l'étiquette
  for (const frag of fragments(categorie)) {
    const exact = PAR_NOM.get(frag)
    if (exact) {
      pose(exact, 'vocabulaire')
      continue
    }
    for (const [re, s] of SEAUX) if (re.test(frag)) pose(s, 'catégorie')
  }

  // ③ le pitch, en secours, et interdit aux seaux que la prose ne peut pas prouver
  const p = nu(pitch)
  if (p) for (const [re, s, proseInterdite] of SEAUX) if (!proseInterdite && re.test(p)) pose(s, 'pitch')

  return [...trouves].map(([nom, source]) => ({ nom, source }))
}

/** Les quatre motifs classiques d'un site France, depuis le domaine mondial. */
function candidatsFrance(officialUrl, nom) {
  const out = []
  const marque = String(nom || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
  try {
    const u = new URL(officialUrl)
    const hote = u.hostname.replace(/^www\./, '')
    const racine = hote.split('.')[0]
    out.push(`https://${hote}/fr`, `https://${hote}/fr-fr`, `https://fr.${hote}`, `https://www.${racine}.fr`)
  } catch {
    /* pas d'URL monde : on tente sur le nom seul */
  }
  if (marque.length > 3) out.push(`https://www.${marque}.fr`, `https://${marque}.fr`)
  return [...new Set(out)]
}

const main = async () => {
  const where = toutes
    ? { status: { not: 'ARCHIVED' } }
    : { OR: NON_ADHERENTES.map((n) => ({ name: { contains: n, mode: 'insensitive' } })) }

  const societes = (
    await db.mlmCompany.findMany({
      where,
      select: { id: true, name: true, slug: true, brandSlug: true, officialUrl: true, category: true, fiche: true },
      orderBy: { name: 'asc' },
    })
  ).slice(0, limite)
  console.log(`── ${societes.length} sociétés`)

  if (classerSeulement) {
    const par = {}
    const srcs = {}
    for (const c of societes) {
      const d = classer(c.category, c.fiche?.recit?.pitch ?? '')
      par[d.length] = (par[d.length] || 0) + 1
      for (const x of d) srcs[x.source] = (srcs[x.source] || 0) + 1
    }
    console.log('\n── COMBIEN DE SECTEURS PAR SOCIÉTÉ')
    for (const [k, v] of Object.entries(par).sort((a, b) => a[0] - b[0]))
      console.log(`  ${k} secteur(s) : ${v}`)
    console.log('\n── D\'OÙ VIENNENT LES SECTEURS')
    for (const [k, v] of Object.entries(srcs).sort((a, b) => b[1] - a[1]))
      console.log(`  ${k.padEnd(12)} ${v}`)
    console.log('\n── LES CAS QUI ONT SERVI À RÉGLER LA TABLE')
    for (const n of ['LR Health', 'AKEO', 'Pierre Lang', 'Alia Nature', 'PartyLite', 'Forever Living', 'Activz', 'Bouygues']) {
      for (const c of societes.filter((x) => decoder(x.name).toLowerCase().includes(n.toLowerCase()))) {
        const d = classer(c.category, c.fiche?.recit?.pitch ?? '')
        console.log(`  ${decoder(c.name).padEnd(26)} ${d.map((x) => `${x.nom} (${x.source})`).join(' · ') || '— rien —'}`)
        console.log(`  ${''.padEnd(26)} cat: ${JSON.stringify(c.category || '')}`)
      }
    }
    await db.$disconnect()
    return
  }

  console.log('── ① le lien monde, revérifié')
  const avecMonde = await lots(societes, 6, async (c) => ({
    ...c,
    monde: c.officialUrl ? await tester(c.officialUrl) : null,
  }))

  console.log('── ② le lien France, cherché')
  const avecFrance = await lots(avecMonde, 5, async (c) => {
    // Le lien monde peut déjà être français (géolocalisation, ou site .fr).
    if (c.monde?.etat === 'ok') return { ...c, france: c.monde, franceVia: 'lien monde' }
    const essais = []
    for (const u of candidatsFrance(c.officialUrl, c.name)) {
      const r = await tester(u)
      essais.push(r)
      if (r.etat === 'ok') break // trouvé : on arrête de frapper aux portes
    }
    let best = meilleur(essais)

    /**
     * ── 🎯 LE SITEMAP EN DERNIER RECOURS, ET C'EST LUI QUI SAUVE ──────────
     *
     * Les motifs devinés tombent sur des domaines parqués ; suivre le site
     * mondial dépend de l'IP d'où l'on mesure. Le sitemap est un fichier
     * statique qui liste toutes les langues, sans négociation. On ne le
     * demande QUE si rien d'autre n'a marché : il coûte deux ou trois
     * requêtes de plus, et il serait gaspillé sur une société déjà trouvée.
     */
    if (best?.etat !== 'ok' && c.officialUrl) {
      for (const u of await viaSitemap(c.officialUrl)) {
        const r = await tester(u)
        essais.push(r)
        /**
         * 🔴 ICI LA PREUVE CHANGE DE NATURE, ET C'EST VOULU.
         *
         * Pour une adresse DEVINÉE, exiger du français rendu est vital : c'est
         * ce qui écarte `youngliving.fr`, qui est une page de vente de nom de
         * domaine. Pour une adresse que la marque PUBLIE ELLE-MÊME dans son
         * sitemap sous `/fr/`, la déclaration EST la preuve.
         *
         * 🧭 Sans cette distinction, les deux défauts se cumulaient : le
         * sitemap trouvait `nikken.com/fr`, et le serveur — qui est en
         * Allemagne — se faisait servir de l'allemand à cette adresse, donc
         * on jetait la bonne réponse. Un domaine parqué reste refusé dans les
         * deux cas : `tester` le range en `parque` avant toute autre chose.
         */
        /**
         * ⚠️ LE CHEMIN DEMANDÉ, PAS CELUI D'ARRIVÉE — et c'est le défaut que
         * ma propre correction avait introduit. `nikken.com/fr` est déclaré
         * dans leur sitemap ; vu d'Allemagne il redirige vers `/countries`,
         * dont le chemin n'a plus rien de français. Je jetais donc la bonne
         * réponse en regardant la mauvaise extrémité du voyage.
         *
         * 🧭 Ce qu'on garde est l'adresse DÉCLARÉE : c'est elle qui est
         * stable, et c'est elle qui sert du français depuis la France.
         */
        const cheminFr = /\/(fr|fr[-_]fr)(\/|$)/i.test(new URL(u).pathname)
        if (r.etat === 'ok' || (r.etat === 'autreLangue' && cheminFr)) {
          return {
            ...c,
            france: {
              ...r,
              etat: 'ok',
              finale: r.etat === 'ok' ? r.finale : u,
              preuve: r.etat === 'ok' ? 'français rendu' : 'déclaré au sitemap',
            },
            franceVia: 'sitemap',
            essaisFrance: essais.length,
          }
        }
      }
      best = meilleur(essais)
    }

    return { ...c, france: best, franceVia: best?.etat === 'ok' ? 'motif' : null, essaisFrance: essais.length }
  })

  console.log('── ③ le secteur, et le contrôle d\'identité du domaine')
  const fini = avecFrance.map((c) => {
    const detail = classer(c.category, c.fiche?.recit?.pitch ?? '')
    const nom = decoder(c.name)
    // Le contrôle d'identité ne vaut que sur un lien qu'on allait retenir.
    const id = c.france?.etat === 'ok' ? identite(nom, c.france.finale || c.france.url) : null
    return {
      id: c.id,
      nom,
      nomBrut: c.name,
      slug: c.slug,
      categorieActuelle: c.category || null,
      secteursProposes: detail.map((d) => d.nom),
      secteursDetail: detail,
      monde: c.monde,
      france: c.france,
      franceVia: c.franceVia,
      // 🧭 Un drapeau à relire, pas un refus : ce contrôle a des faux positifs connus.
      suspect: id && !id.colle ? id.pourquoi : null,
      remarque: id?.colle && id.pourquoi ? id.pourquoi : null,
    }
  })

  const n = (f) => fini.filter(f).length
  const prouve = (c) => c.france?.etat === 'ok' && !c.suspect
  console.log('\n── BILAN')
  console.log(`  lien monde absent          : ${n((c) => !c.monde)}`)
  console.log(`  lien monde ok              : ${n((c) => c.monde?.etat === 'ok')}`)
  console.log(`  lien monde refuse/mort     : ${n((c) => ['refuse', 'mort'].includes(c.monde?.etat))}`)
  console.log(`  🇫🇷 site FRANÇAIS prouvé    : ${n(prouve)}`)
  console.log(`  ⚠️  retenu mais SUSPECT     : ${n((c) => c.suspect)}`)
  console.log(`  ⚠️  autre région            : ${n((c) => c.remarque)}`)
  console.log(`  site RÉPLIQUÉ, refusé      : ${n((c) => c.france?.etat === 'replique')}`)
  console.log(`  France refuse les robots   : ${n((c) => c.france?.etat === 'refuse')}`)
  console.log(`  domaine PARQUÉ (à vendre)  : ${n((c) => c.france?.etat === 'parque')}`)
  console.log(`  aucune France trouvée      : ${n((c) => !c.france || ['mort', 'autreLangue', 'parque', 'replique'].includes(c.france?.etat))}`)
  console.log(`  secteur proposé            : ${n((c) => c.secteursProposes.length > 0)}`)
  console.log(`  secteur introuvable        : ${n((c) => c.secteursProposes.length === 0)}`)
  console.log(`  dont depuis le VOCABULAIRE : ${n((c) => c.secteursDetail.some((d) => d.source === 'vocabulaire'))}`)
  console.log(`  dont depuis le PITCH seul  : ${n((c) => c.secteursDetail.length && c.secteursDetail.every((d) => d.source === 'pitch'))}`)

  const chemin = '/tmp/france-societes.json'
  writeFileSync(chemin, JSON.stringify({ quand: new Date().toISOString(), secteurs: SECTEURS, fini }, null, 1))
  console.log(`\n  rapport → ${chemin}`)
  await db.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await db.$disconnect()
  process.exit(1)
})
