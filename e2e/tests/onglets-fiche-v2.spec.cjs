// Lancer :
//     cd app.atline.ai/e2e
//     E2E_BASE=https://v2.atline.ai E2E_COMME=… npx playwright test tests/onglets-fiche-v2.spec.cjs
//
// ── 🔴 CE QUE CETTE SONDE EXISTE POUR TENIR ────────────────────────────────
//
// La fiche est passée en DEUX onglets le 18 novembre 2026, et ses 23 rangées
// de champs ont été rangées par RYTHME, pas par nature — Patrice : *« il y a
// les choses que l'on renseigne une fois et les choses qui évoluent »*.
//
// Rien, avant ce fichier, n'empêchait de revenir en arrière :
//
//   · remettre les champs sur le premier onglet, et refaire la fiche longue
//     que la mesure de V1 condamne (sept endroits, 5 contacts sur 44 avec une
//     rue — les champs ne se remplissent pas derrière les onglets) ;
//   · rendre « Expositions » modifiable, donc inviter à taper un compteur que
//     `journaliser()` écrase au prochain échange, SANS UN MOT ;
//   · reculer la civilité derrière le prénom, alors que c'est elle qui accorde
//     les phrases que l'app écrit sur cette personne ;
//   · décoller « Étape » de « Elle est », et proposer à nouveau les étapes de
//     l'ancienne population.
//
// ── 🧭 L'ORDRE EST ÉCRIT ICI, À LA MAIN, ET C'EST VOLONTAIRE ───────────────
//
// Le lire depuis `lib/fiche.ts` ferait une sonde qui compare le code à
// lui-même : elle resterait verte quel que soit l'ordre. La liste ci-dessous
// est donc la DÉCISION, recopiée, et c'est à elle que la page doit répondre.
const { test, expect, toucher, ouvrirInfos } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** L'ordre arrêté avec Patrice le 18 novembre 2026. */
const ORDRE = [
  // ① ce qu'on renseigne une fois
  'gender', 'firstName', 'lastName',
  'phone', 'email',
  'address', 'address2', 'postal', 'city', 'country',
  'profession', 'education', 'source', 'birthDate', 'personality',
  // ② ce qui évolue
  'kind', 'etape', 'market', 'tags', 'note',
  // ③ ce que l'app mesure
  'lastContact', 'exposures',
]

test('les champs ne sont pas sur le premier onglet, et le compteur dit combien', async ({
  page,
  seed,
  pageErrors,
}) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })

  const fiche = page.locator('[data-onglet="Fiche"]')
  const infos = page.locator('[data-onglet="Infos"]')
  await expect(fiche).toHaveAttribute('aria-selected', 'true')
  await expect(infos).toHaveAttribute('aria-selected', 'false')

  /**
   * 🔴 LE CONTRÔLE QUI COMPTE : aucune rangée de champ sur l'onglet d'arrivée.
   * Sans lui, un onglet posé par-dessus une fiche inchangée passerait pour
   * fait — et c'est exactement la forme que prendrait une régression.
   */
  await expect(
    page.locator('[data-champ]'),
    'des rangées de champs sont restées sur l’onglet Fiche',
  ).toHaveCount(0)

  /**
   * ⚠️ LE COMPTEUR NE COMPTE PAS LES DEUX RANGÉES MESURÉES. « 7 sur 23 »
   * demanderait de remplir deux champs que personne ne remplit : un objectif
   * inatteignable s'ignore, et ce compteur est la seule raison d'ouvrir
   * l'onglet.
   */
  const combien = ORDRE.length - 2
  await expect(infos, `le compteur devrait dire « … / ${combien} »`).toContainText(
    new RegExp(`\\d+\\s*/\\s*${combien}`),
  )

  await ouvrirInfos(page)
  await expect(infos).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('[data-champ]').first()).toBeVisible()

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})

test('« ce qui manque » emmène sur l’onglet où vit la rangée', async ({ page, seed }) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })

  /**
   * 🔴 LA PROMESSE EST ÉCRITE SUR L'ÉCRAN : « Touche pour l'ajouter
   * maintenant ». Les rangées ayant déménagé, sans bascule d'onglet ce bouton
   * ouvrirait une saisie **sur l'écran d'à côté** : il répondrait au doigt
   * sans rien montrer, la cible morte que la maison retire partout.
   */
  const puce = page.locator('[data-manque="profession"]')
  await expect(puce).toBeVisible({ timeout: 15_000 })
  await toucher(puce, page.locator('[data-saisie="profession"]'))

  await expect(
    page.locator('[data-onglet="Infos"]'),
    'la saisie s’est ouverte mais l’onglet n’a pas suivi',
  ).toHaveAttribute('aria-selected', 'true')
})

test('ce que l’app compte se lit et ne s’ouvre pas', async ({ page, seed }) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })
  await ouvrirInfos(page)

  const mesure = page.locator('[data-groupe="mesure"]')
  await expect(mesure, 'le groupe mesuré a disparu').toBeVisible()

  /**
   * ⚠️ LA SONDE DOIT PROUVER QU'ELLE SAIT TROUVER avant de conclure à une
   * absence. Un groupe vide rendrait tout ce qui suit vrai sans rien dire.
   */
  const figees = mesure.locator('[data-figee]')
  await expect(figees, 'aucune rangée mesurée : la sonde ne prouverait rien').not.toHaveCount(0)

  /* ── 🔴 ON APPUIE VRAIMENT, et rien ne doit s'ouvrir. Un `data-figee` posé
        sur une rangée qui s'ouvre quand même serait un attribut qui MENT, et
        c'est la famille de défauts que cette app passe son temps à retirer. ── */
  const exposition = mesure.locator('[data-champ="exposures"]')
  await expect(exposition).toBeVisible()
  await exposition.click({ force: true })
  await expect(
    page.locator('[data-saisie="exposures"]'),
    '« Expositions » s’est ouvert : une valeur tapée là serait écrasée au prochain échange',
  ).toHaveCount(0)

  // Et elle n'est pas un bouton : une cible qui répond au doigt sans rien
  // faire est pire qu'une cible inerte.
  await expect(exposition).not.toHaveRole('button')
})

/**
 * ── L'ORDRE, SUR UN VRAI CONTACT ──────────────────────────────────────────
 *
 * 🧭 LECTURE SEULE, et sur un contact RÉEL : le contact jetable n'a presque
 * aucun champ rempli, donc presque aucune rangée visible — l'ordre de deux
 * rangées ne prouve rien. On évite les fiches « E2E » comme `capture-fiche`.
 */
test('les rangées se suivent dans l’ordre décidé', async ({ page, pageErrors }) => {
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  const lignes = page.locator('[data-contact]')
  await expect(lignes.first()).toBeVisible({ timeout: 20_000 })
  const vrai = lignes.filter({ hasNotText: 'E2E' }).first()
  await vrai.click()
  await expect(page).toHaveURL(/\/gens\/[a-z0-9]+$/i, { timeout: 20_000 })
  await ouvrirInfos(page)

  const vues = await page
    .locator('[data-champ]')
    .evaluateAll((n) => n.map((e) => e.getAttribute('data-champ')))

  expect(vues.length, 'aucune rangée visible : la sonde ne prouverait rien').toBeGreaterThan(4)

  /**
   * Les rangées vides sont repliées, donc on ne compare pas à la liste
   * entière : on exige que ce qui est VU soit dans l'ordre de la décision.
   * C'est l'invariant vrai sur n'importe quelle fiche.
   */
  const rangs = vues.map((c) => ORDRE.indexOf(c))
  expect(rangs.filter((r) => r < 0), `rangées inconnues : ${vues.filter((_, i) => rangs[i] < 0)}`).toEqual([])
  expect(rangs, `l’ordre des rangées a changé : ${vues.join(' · ')}`).toEqual(
    rangs.slice().sort((a, b) => a - b),
  )

  /**
   * 🔴 ET LES DEUX DÉCISIONS NOMMÉES, exigées à part. Noyées dans un ordre
   * global, leur retour en arrière passerait pour un détail de tri.
   */
  if (vues.includes('gender') && vues.includes('firstName')) {
    expect(
      vues.indexOf('gender'),
      'la civilité est repassée derrière le prénom, alors que c’est elle qui accorde les phrases',
    ).toBeLessThan(vues.indexOf('firstName'))
  }
  if (vues.includes('etape')) {
    expect(
      vues.indexOf('etape'),
      `« Étape » ne suit plus « Elle est » : ${vues.join(' · ')}`,
    ).toBe(vues.indexOf('kind') + 1)
  }

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})
