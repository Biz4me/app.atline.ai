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
]
// ⚠️ `lastContact` et `exposures` n'y sont plus : ce sont des chiffres
// vivants, ils se lisent dans le portrait et n'ont plus de rangée.

test('les champs ne sont pas sur le premier onglet, et le compteur dit combien', async ({
  page,
  seed,
  pageErrors,
}) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })

  const fiche = page.locator('[data-onglet="Fiche"]')
  const infos = page.locator('[data-onglet="Infos"]')
  /**
   * ⚠️ `aria-pressed` ET NON `aria-selected` depuis le 18 novembre 2026.
   * La bascule est devenue la pastille de l'écran Contacts : un BOUTON à
   * deux états, pas un onglet. `aria-selected` n'a de sens que dans un
   * `tablist`, et le laisser aurait fait annoncer n'importe quoi au
   * lecteur d'écran — sans que rien ne le dise à l'œil.
   */
  await expect(fiche).toHaveAttribute('aria-pressed', 'true')
  await expect(infos).toHaveAttribute('aria-pressed', 'false')

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
   * ⚠️ LE COMPTEUR COMPTE EXACTEMENT LES RANGÉES QU'ON PEUT REMPLIR. Les deux
   * chiffres vivants n'en sont pas : un objectif inatteignable s'ignore, et ce
   * compteur est la seule raison d'ouvrir l'onglet. Ils ne sont plus dans
   * `ORDRE` non plus, donc le dénominateur est sa longueur, telle quelle.
   */
  const combien = ORDRE.length
  await expect(infos, `le compteur devrait dire « … / ${combien} »`).toContainText(
    new RegExp(`\\d+\\s*/\\s*${combien}`),
  )

  await ouvrirInfos(page)
  await expect(infos).toHaveAttribute('aria-pressed', 'true')
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
  ).toHaveAttribute('aria-pressed', 'true')
})

/**
 * ── 🔴 LES CHIFFRES VIVANTS SE LISENT DANS LE PORTRAIT, ET NULLE PART AILLEURS
 *
 * Cette sonde vérifiait un groupe « Ce que l'app compte pour toi » au bas de
 * l'onglet Infos, avec deux rangées non modifiables. Patrice, capture à
 * l'appui : *« c'est des chiffres vivants, donc dans la fiche »*. Il a raison,
 * et c'était mal rangé : « Dernier échange » et « Expositions » ne sont pas
 * des informations qu'on RENSEIGNE, ce sont des faits qui bougent.
 *
 * 🧭 Ce qu'elle protégeait reste exigé, et c'est même plus fort : non
 * seulement ces valeurs ne s'ouvrent pas, mais **elles n'ont plus de rangée du
 * tout**. Une valeur que `journaliser()` écrit au retour d'un geste ne doit
 * nulle part donner l'impression qu'on peut la taper — le prochain échange
 * l'écraserait sans un mot.
 */
test('les chiffres vivants sont dans le portrait, et ne se saisissent nulle part', async ({
  page,
  seed,
}) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })

  /**
   * 🔴 ON NE VÉRIFIE PAS LE PORTRAIT ICI, et son absence est VOULUE.
   *
   * Première version de cette sonde : elle exigeait le portrait sur le contact
   * jetable, et elle a rougi. Le défaut n'était pas dans l'app — un contact
   * sans métier, sans âge, sans ville et sans couleur n'A PAS de portrait, et
   * afficher « jamais contacté·e » tout seul redirait ce que « ce qui se
   * passe » dit déjà, deux lignes plus bas.
   *
   * 🧭 Le portrait se prouve donc sur un VRAI contact, dans la sonde du bas.
   * Ici on vérifie l'autre moitié, celle qui vaut sur n'importe quelle fiche :
   * ces valeurs n'ont de rangée NULLE PART — ni sur Fiche, ni sur Infos.
   */
  for (const cle of ['exposures', 'lastContact']) {
    await expect(
      page.locator(`[data-champ="${cle}"]`),
      `« ${cle} » a retrouvé une rangée sur l’onglet Fiche`,
    ).toHaveCount(0)
  }
  await ouvrirInfos(page)
  await expect(
    page.locator('[data-onglet="Infos"]'),
    'l’onglet est retombé sur Fiche juste après la bascule',
  ).toHaveAttribute('aria-pressed', 'true')

  for (const cle of ['exposures', 'lastContact']) {
    await expect(
      page.locator(`[data-champ="${cle}"]`),
      `« ${cle} » a retrouvé une rangée : une valeur tapée là serait écrasée au prochain échange`,
    ).toHaveCount(0)
  }

  /**
   * ⚠️ ET LA SONDE PROUVE QU'ELLE SAIT TROUVER une rangée : sans ça, un
   * onglet vide — ou un sélecteur devenu faux — rendrait les deux absences
   * ci-dessus vraies sans rien dire du tout.
   */
  await expect(
    page.locator('[data-champ="profession"]'),
    'aucune rangée trouvée : la sonde ne prouverait rien',
  ).toBeVisible()
})

/**
 * 🔴 LE SURTITRE EST PARTI : *« prénom et nom suffisent »*. Il portait
 * « DÉMARRAGE · ANCIEN COMMERCIAL » au-dessus du nom, et l'étape s'y redisait
 * à trois lignes de « ce qui se passe ».
 */
test('l’en-tête ne porte que le nom', async ({ page }) => {
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  const lignes = page.locator('[data-contact]')
  await expect(lignes.first()).toBeVisible({ timeout: 20_000 })
  await lignes.filter({ hasNotText: 'E2E' }).first().click()
  await expect(page).toHaveURL(/\/gens\/[a-z0-9]+$/i, { timeout: 20_000 })

  const titre = page.getByRole('heading', { level: 1 })
  await expect(titre).toBeVisible()

  /**
   * ⚠️ ON MESURE CE QUI EST AU-DESSUS DU TITRE, pas le titre lui-même : le
   * surtitre était un élément à part, et un `toHaveText` sur le h1 serait
   * resté vert avec lui juste à côté.
   */
  const surtitre = await titre.evaluate((h) => {
    const avant = h.previousElementSibling
    return avant ? avant.textContent.trim() : ''
  })
  expect(surtitre, `un surtitre est revenu au-dessus du nom : « ${surtitre} »`).toBe('')

  /**
   * ── ET CE QU'IL PORTAIT SE LIT DANS LE PORTRAIT ─────────────────────────
   *
   * 🔴 C'est ICI qu'on le prouve, sur un vrai contact : il est bâti de métier,
   * âge, ville, couleur DISC, marché et chiffres vivants, et un contact
   * jetable n'a rien de tout ça. Exigé sur une fiche vide, on exigerait que
   * l'app invente.
   */
  const portrait = page.locator('[data-portrait]')
  await expect(portrait, 'le portrait a disparu de la tête de fiche').toBeVisible({
    timeout: 15_000,
  })
  await expect(
    portrait,
    'le portrait ne porte plus les chiffres vivants',
  ).toContainText(/exposition|jamais contacté|dernier échange/i)
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
