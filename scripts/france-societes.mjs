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
import { decoder, tester, meilleur, lots, viaSitemap } from './lib/tester-lien.mjs'

const db = new PrismaClient()
const args = process.argv.slice(2)
const toutes = args.includes('--toutes')
const limite = args.includes('--limite') ? Number(args[args.indexOf('--limite') + 1]) : Infinity

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
 * ⚠️ UNE TABLE, PAS UN MODÈLE. Le classement se déduit de mots présents dans
 * la catégorie actuelle et dans le pitch — **697 fiches sur 866 en ont un**,
 * écrit en juillet. Zéro requête, zéro crédit, et surtout un résultat qu'on
 * peut relire ligne par ligne, ce qu'une réponse de modèle ne permet pas.
 * Ce qui ne tombe dans aucun seau sort en `null` et se traite à la main.
 */
const SEAUX = [
  [/habitat|r[ée]novation|isolation|toiture|photovolta|menuiserie|ravalement/i, "Amélioration de l'habitat"],
  [/bijou|joaill/i, 'Bijoux'],
  [/nutrition|compl[ée]ment|bien-[êe]tre|sant[ée]|aloe|vitamin|minceur|dietet/i, 'Compléments alimentaires'],
  [/cosm[ée]tique|beaut[ée]|soin de la peau|soins|maquillage|skincare/i, 'Cosmétiques'],
  [/d[ée]coration|loisirs cr[ée]atifs|scrapbook|bougie|jeux|jouet/i, 'Décorations - Loisirs créatifs'],
  [/[ée]dition|livre/i, 'Edition'],
  [/formation|coaching|[ée]ducation/i, 'Formation'],
  [/[ée]nergie|solaire|gaz|[ée]lectricit/i, "Fournisseur d'énergie"],
  [/culinaire|cuisine|gastronom|alimentaire|surgel|vin|th[ée]\b|caf[ée]/i, 'Gastronomie - Univers Culinaire'],
  [/entretien|m[ée]nager?\b|hygi[èe]ne|nettoyage|lessive/i, 'Hygiène de la maison'],
  [/immobilier/i, 'Immobilier'],
  [/lingerie/i, 'Lingerie'],
  [/mode|v[êe]tement|pr[êe]t-[àa]-porter|accessoire|chaussure/i, 'Mode & Accessoires'],
  [/[ée]lectrom[ée]nager|aspirat|robot|appareil/i, 'Ménager - Electroménager'],
  [/optique|lunette/i, 'Opticien'],
  [/parfum/i, 'Parfums'],
  [/presse|magazine|m[ée]dia/i, 'Presse'],
  [/s[ée]curit|alarme|t[ée]l[ée]surveillance/i, 'Sécurité'],
  [/traitement de l'eau|filtration|adoucisseur|purificat/i, "Traitement de l'eau"],
  [/t[ée]l[ée]com|mobile|forfait/i, 'Télécommunication'],
]

const classer = (texte) => {
  const t = decoder(texte || '')
  const trouves = SEAUX.filter(([re]) => re.test(t)).map(([, s]) => s)
  return [...new Set(trouves)]
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

  console.log('── ③ le secteur, proposé dans la liste de la FVD')
  const fini = avecFrance.map((c) => {
    const pitch = c.fiche?.recit?.pitch ?? ''
    const secteurs = classer(`${c.category || ''} ${pitch}`)
    return {
      nom: decoder(c.name),
      nomBrut: c.name,
      slug: c.slug,
      categorieActuelle: c.category || null,
      secteursProposes: secteurs,
      monde: c.monde,
      france: c.france,
      franceVia: c.franceVia,
    }
  })

  const n = (f) => fini.filter(f).length
  console.log('\n── BILAN')
  console.log(`  lien monde absent          : ${n((c) => !c.monde)}`)
  console.log(`  lien monde ok              : ${n((c) => c.monde?.etat === 'ok')}`)
  console.log(`  lien monde refuse/mort     : ${n((c) => ['refuse', 'mort'].includes(c.monde?.etat))}`)
  console.log(`  🇫🇷 site FRANÇAIS prouvé    : ${n((c) => c.france?.etat === 'ok')}`)
  console.log(`  France refuse les robots   : ${n((c) => c.france?.etat === 'refuse')}`)
  console.log(`  domaine PARQUÉ (à vendre)  : ${n((c) => c.france?.etat === 'parque')}`)
  console.log(`  aucune France trouvée      : ${n((c) => !c.france || ['mort', 'autreLangue', 'parque'].includes(c.france?.etat))}`)
  console.log(`  secteur proposé            : ${n((c) => c.secteursProposes.length > 0)}`)
  console.log(`  secteur introuvable        : ${n((c) => c.secteursProposes.length === 0)}`)

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
