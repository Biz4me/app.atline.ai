// LE PLATEAU DES MANTRAS — l'aplat de l'accueil, et sa capacité réelle.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/plateau-mantras.spec.cjs
//
// ── 🔴 CE QUE CE COMPTE NE PEUT PAS MONTRER ───────────────────────────────
//
// Le compte de travail bute sur « objections », donc il ne reçoit QUE la
// catégorie `mindset`, dont le plus long mantra fait 78 signes et tient en
// deux lignes. Le fonds, lui, monte à **111** (catégorie `duplication`).
//
// 🧭 Dimensionner — et vérifier — sur ce qu'on a sous les yeux, c'est livrer
// une coupure à quelqu'un d'autre. C'est exactement la faute du 13 novembre
// au matin : les étiquettes de tuiles, écrites pour deux lignes, coupées à
// une et demie, sans débordement, sans erreur, sans rien.
//
// Cette sonde pose donc les PIRES textes du fonds dans la vraie boîte — vraie
// police, vraie largeur, vraie hauteur de ligne — et mesure.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/**
 * ⚠️ LISTE DATÉE : les cinq plus longs mantras actifs au 13 novembre 2026.
 * Pour la rafraîchir, dans la base de production :
 *
 *   select length(content), category, content from "AtlasMantras"
 *   where active = true order by length(content) desc limit 5;
 *
 * 🔴 Si le fonds gagne un mantra plus long que 111 signes, cette liste cesse
 * de décrire le pire cas SANS que rien ne le signale. C'est la limite connue
 * de cette sonde, et c'est pour ça qu'elle est écrite ici en toutes lettres
 * plutôt que sous-entendue.
 */
const PIRES = [
  "La différence entre l'amateur et le pro : l'amateur cherche un hack, le pro cherche un système qui se réplique.",
  "De l'apprentissage à la performance, de la performance à la duplication : la boucle infinie du pro.",
  'Le succès en MLM n’est pas un sprint, c’est une boucle : apprendre → faire → montrer → répéter.',
  "Si tu ne peux pas l'enseigner en 15 minutes, tu ne l'as pas vraiment compris. Duplique-le.",
  "Les pros font les jours sans envie ce que les amateurs font les jours d'envie.",
]

/** Mesure la place disponible et la place demandée, pour un texte donné. */
const essayer = (page, textes) =>
  page.evaluate((liste) => {
    const bq = document.querySelector('[data-plateau="mantras"] blockquote')
    const p = bq.querySelector('p')
    const s = getComputedStyle(bq)
    // 🔴 LA PLACE DISPONIBLE SE CALCULE, elle ne se suppose pas : c'est la
    // hauteur du bloc MOINS ses deux rembourrages, ceux-là mêmes qui
    // réservent l'étiquette en haut et les points en bas.
    const dispo = bq.clientHeight - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom)
    const garde = p.textContent
    const out = liste.map((t) => {
      p.textContent = '« ' + t + ' »'
      return {
        n: t.length,
        besoin: Math.round(p.getBoundingClientRect().height),
        texte: t.slice(0, 32),
      }
    })
    p.textContent = garde
    return { dispo: Math.round(dispo), largeur: Math.round(p.getBoundingClientRect().width), out }
  }, textes)

test('le pire mantra du fonds tient dans le plateau', async ({ page, pageErrors }) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  const plateau = page.locator('[data-plateau="mantras"]')
  await expect(plateau, 'pas de plateau : la sonde ne mesure rien').toBeVisible({ timeout: 20_000 })

  const m = await essayer(page, PIRES)
  // ⚠️ CONTRÔLE POSITIF. Une boîte à zéro — sélecteur devenu faux, plateau
  // vide — ferait passer toutes les comparaisons ci-dessous sans rien prouver.
  expect(m.dispo, 'la place disponible mesurée est absurde').toBeGreaterThan(40)
  expect(m.largeur, 'la boîte de texte mesurée est absurde').toBeGreaterThan(200)

  const trop = m.out.filter((x) => x.besoin > m.dispo)
  expect(
    trop,
    `place disponible ${m.dispo} px · ` +
      trop.map((x) => `« ${x.texte}… » (${x.n} signes) en demande ${x.besoin}`).join(' · '),
  ).toEqual([])

  // Ce qu'il reste, pour qu'un futur réglage sache de combien il dispose.
  console.log(
    `plateau : ${m.dispo} px pour ${m.largeur} de large · ` +
      m.out.map((x) => `${x.n}→${x.besoin}`).join(' · '),
  )

  expect(pageErrors).toEqual([])
})

test('la-sonde-du-plateau-sait-echouer', async ({ page }) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-plateau="mantras"]')).toBeVisible({ timeout: 20_000 })
  // Un texte qui demande cinq lignes DOIT être vu comme débordant.
  const m = await essayer(page, [
    'Un mantra beaucoup trop long pour cette boite, ecrit expres pour que la sonde ' +
      'le refuse, et qui demande sans aucun doute plus de trois lignes de vingt-six ' +
      'pixels dans une boite de trois cent seize pixels de large.',
  ])
  expect(
    m.out[0].besoin,
    `le piège demande ${m.out[0].besoin} px et la boîte en offre ${m.dispo} : la sonde ne sait pas détecter un débordement`,
  ).toBeGreaterThan(m.dispo)
})

test('le plateau est un aplat orange, et ses points se voient dessus', async ({
  page,
  pageErrors,
}) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  const plateau = page.locator('[data-plateau="mantras"]')
  await expect(plateau).toBeVisible({ timeout: 20_000 })

  const vu = await plateau.evaluate((el) => {
    const s = getComputedStyle(el)
    const jeton = (nom) =>
      getComputedStyle(document.documentElement).getPropertyValue(nom).trim()
    const peindre = (css) => {
      const c = document.createElement('canvas')
      c.width = c.height = 1
      const x = c.getContext('2d')
      x.fillStyle = css
      x.fillRect(0, 0, 1, 1)
      return [...x.getImageData(0, 0, 1, 1).data].slice(0, 3).join(',')
    }
    const points = [...el.querySelectorAll('[aria-hidden="true"] span')].map(
      (p) => peindre(getComputedStyle(p).backgroundColor),
    )
    return {
      fond: peindre(s.backgroundColor),
      orange: peindre(jeton('--color-atlas')),
      surface: peindre(jeton('--color-surface')),
      image: s.backgroundImage,
      bordure: s.borderLeftWidth,
      hauteur: Math.round(el.getBoundingClientRect().height),
      points,
    }
  })

  /**
   * 🔴 L'APLAT EST DANS `background-color`, PAS SEULEMENT DANS LE DÉGRADÉ, et
   * c'est ce que ce test protège. La sonde de contraste ignore les images de
   * fond : si le plateau n'était peint qu'en dégradé, elle mesurerait l'encre
   * contre le fond de la PAGE et annoncerait un vert qui ne regarde rien.
   */
  expect(vu.fond, 'le plateau n’est pas peint en orange plein').toBe(vu.orange)
  expect(vu.fond, 'le plateau est resté une surface blanche').not.toBe(vu.surface)
  expect(vu.image, 'le plateau a perdu son dégradé').toContain('gradient')
  expect(vu.bordure, 'un liseré gris autour d’un aplat orange').toBe('0px')
  expect(vu.hauteur, 'le plateau doit dominer les cartes de 139').toBeGreaterThan(139)

  /**
   * 🔴 LE POINT ACTIF AURAIT DISPARU DANS SON PROPRE FOND. Il était orange sur
   * une carte blanche ; sur un plateau orange, personne n'aurait plus su où il
   * en est dans la série — sans erreur, sans rien de cassé.
   */
  expect(vu.points.length, 'aucun point : la série n’a qu’un mantra ?').toBeGreaterThan(1)
  for (const p of vu.points) {
    expect(p, 'un point de série est de la couleur du plateau : il est invisible').not.toBe(vu.fond)
  }
  expect(new Set(vu.points).size, 'tous les points sont identiques : lequel est l’actif ?').toBe(2)

  expect(pageErrors).toEqual([])
})

test('le plateau nomme la famille du mantra', async ({ page, pageErrors }) => {
  /**
   * 🔴 C'EST L'INFORMATION QUE LA CARTE CACHAIT. Les mantras sont tirés dans la
   * catégorie de la compétence travaillée — tout l'intérêt de la carte tenait
   * là, et rien à l'écran ne le disait.
   *
   * ⚠️ L'étiquette a le DROIT d'être absente : dans le repli (aucune compétence
   * mesurée) on tire dans tout le fonds et les familles diffèrent. On vérifie
   * donc qu'elle dit un VRAI mot quand elle est là, pas qu'elle est là.
   */
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-plateau="mantras"]')).toBeVisible({ timeout: 20_000 })

  const etiquette = page.locator('[data-mantra-famille]')
  if ((await etiquette.count()) === 0) {
    test.skip(true, 'les mantras du jour viennent de familles différentes : pas d’étiquette')
    return
  }
  const mot = (await etiquette.innerText()).trim()
  const FAMILLES = ['ÉTAT D’ESPRIT', 'PROSPECTION', 'ACTION', 'DUPLICATION', 'LEADERSHIP']
  // ⚠️ `innerText` applique `text-transform` : on compare donc en capitales.
  expect(FAMILLES, `l’étiquette annonce « ${mot} », qui n’est pas une famille connue`).toContain(mot)

  // Elle ne doit pas chevaucher la citation : c'est tout l'objet du
  // rembourrage haut, et une étiquette posée SUR le texte ne se verrait que
  // sur une capture.
  const [eb, pb] = await Promise.all([
    etiquette.boundingBox(),
    page.locator('[data-plateau="mantras"] blockquote p').first().boundingBox(),
  ])
  expect(eb.y + eb.height, 'l’étiquette mord sur la citation').toBeLessThanOrEqual(pb.y + 1)

  expect(pageErrors).toEqual([])
})
