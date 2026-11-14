// LA CARTE DES MANTRAS — sa capacité réelle, et ce qu'elle n'est plus.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/carte-mantras.spec.cjs
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
    const bq = document.querySelector('[data-mantras] blockquote')
    const p = bq.querySelector('p')
    const s = getComputedStyle(bq)
    // 🔴 LA PLACE DISPONIBLE SE CALCULE, elle ne se suppose pas : c'est la
    // hauteur du bloc MOINS ses deux rembourrages, ceux-là mêmes qui
    // réservent l'étiquette en haut et les points en bas.
    const dispo = bq.clientHeight - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom)
    const garde = p.innerHTML
    const out = liste.map((t) => {
      p.textContent = '« ' + t + ' »'
      return {
        n: t.length,
        besoin: Math.round(p.getBoundingClientRect().height),
        texte: t.slice(0, 32),
      }
    })
    p.innerHTML = garde
    return { dispo: Math.round(dispo), largeur: Math.round(p.getBoundingClientRect().width), out }
  }, textes)

test('le pire mantra du fonds tient dans la carte', async ({ page, pageErrors }) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  const carte = page.locator('[data-mantras]')
  await expect(carte, 'pas de carte : la sonde ne mesure rien').toBeVisible({ timeout: 20_000 })

  const m = await essayer(page, PIRES)
  // ⚠️ CONTRÔLE POSITIF. Une boîte à zéro — sélecteur devenu faux, carte
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
    `carte des mantras : ${m.dispo} px pour ${m.largeur} de large · ` +
      m.out.map((x) => `${x.n}→${x.besoin}`).join(' · '),
  )

  expect(pageErrors).toEqual([])
})

test('la-sonde-de-la-carte-sait-echouer', async ({ page }) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-mantras]')).toBeVisible({ timeout: 20_000 })
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

test('la carte est une surface, pas un aplat orange', async ({ page, pageErrors }) => {
  /**
   * ── 🔴 L'APLAT A VÉCU UNE JOURNÉE (13 → 14 novembre 2026) ───────────────
   *
   * La carte est devenue un plateau orange plein ; Patrice a tranché le
   * lendemain : *« enlève le fond orange, j'aime pas »*. Ce test est ce qui
   * reste de l'épisode, et il n'est pas décoratif : **deux pièces de cette
   * carte ont des couleurs qui ne survivent pas à un fond coloré**, et elles
   * ont repris leur valeur d'origine.
   *
   *   · les guillemets sont en `--color-secondaire` : **1,89 sur l'orange** ;
   *   · le point actif est en `--color-atlas` : invisible sur de l'orange.
   *
   * 🧭 Une couleur n'est jamais lisible « en soi ». Si quelqu'un reteinte
   * cette carte un jour, ce test tombe — et c'est exactement ce qu'on veut :
   * il force à rouvrir les deux couleurs en même temps que le fond.
   */
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  const carte = page.locator('[data-mantras]')
  await expect(carte).toBeVisible({ timeout: 20_000 })

  const vu = await carte.evaluate((el) => {
    const s = getComputedStyle(el)
    const peindre = (css) => {
      const c = document.createElement('canvas')
      c.width = c.height = 1
      const x = c.getContext('2d')
      x.fillStyle = css
      x.fillRect(0, 0, 1, 1)
      return [...x.getImageData(0, 0, 1, 1).data].slice(0, 3).join(',')
    }
    const jeton = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim()
    const points = [...el.querySelectorAll('[aria-hidden="true"] span')]
      .filter((p) => p.getBoundingClientRect().width < 10)
      .map((p) => peindre(getComputedStyle(p).backgroundColor))
    return {
      fond: peindre(s.backgroundColor),
      orange: peindre(jeton('--color-atlas')),
      image: s.backgroundImage,
      bordure: parseFloat(s.borderLeftWidth),
      hauteur: Math.round(el.getBoundingClientRect().height),
      points,
    }
  })

  expect(vu.fond, 'la carte est repeinte en orange plein').not.toBe(vu.orange)
  expect(vu.image, 'la carte a repris un dégradé de fond').toBe('none')
  expect(vu.bordure, 'la carte a perdu sa bordure de surface').toBeGreaterThan(0)

  /**
   * ⚠️ 157 EST IMPOSÉ PAR LE CONTENU, pas par l'envie de dominer le damier :
   * 139 couperait la citation la plus longue du fonds. On vérifie donc que
   * l'exception survit au retrait de l'aplat — c'est précisément le genre de
   * mesure qu'un retour en arrière emporte par habitude.
   *
   * 🔴 157 ET NON 155, et c'est le premier test ci-dessus qui l'a dit : la
   * somme du contenu fait 155, la BORDURE en ajoute deux. En reprenant son
   * liseré de surface, la carte ne laissait plus que 76 px à un texte qui en
   * demande 78 — dernière ligne rognée, sans erreur, sans débordement.
   */
  expect(vu.hauteur, 'la carte est retombée à la hauteur du damier, elle coupera').toBe(157)

  expect(vu.points.length, 'aucun point : la série n’a qu’un mantra ?').toBeGreaterThan(1)
  expect(new Set(vu.points).size, 'tous les points sont identiques : lequel est l’actif ?').toBe(2)
  for (const p of vu.points) {
    expect(p, 'un point de série est de la couleur du fond : il est invisible').not.toBe(vu.fond)
  }

  expect(pageErrors).toEqual([])
})

test('la carte nomme la famille du mantra', async ({ page, pageErrors }) => {
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
  await expect(page.locator('[data-mantras]')).toBeVisible({ timeout: 20_000 })

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
    page.locator('[data-mantras] blockquote p').first().boundingBox(),
  ])
  expect(eb.y + eb.height, 'l’étiquette mord sur la citation').toBeLessThanOrEqual(pb.y + 1)

  expect(pageErrors).toEqual([])
})
