// LES CONTACTS : un geste pour ajouter, un menu qui filtre ou montre les trous.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/contacts.spec.cjs
//
// 🔴 AUCUNE ÉCRITURE. Les contacts de Patrice sont sa matière première et
// rien dans l'app ne sait en effacer un. On vérifie le formulaire, le filtre
// et l'écran des manques — pas la création.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('le geste mène au formulaire, en pleine page', async ({ page, pageErrors }) => {
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: 'Contacts' })).toBeVisible({
    timeout: 20_000,
  })

  // 🔴 UN SEUL DÉCLENCHEUR. Le bouton « + Ajouter un nom » qui vivait dans la
  // liste a été retiré : deux gestes pour une même action, c'est la faute
  // déjà corrigée sur l'accueil et sur Formation.
  const ajouter = page.getByRole('link', { name: 'Ajouter un contact' })
  await expect(ajouter).toHaveCount(1)
  await expect(page.getByRole('button', { name: /Ajouter un nom/ })).toHaveCount(0)
  await ajouter.click({ trial: true })
  await ajouter.click()

  await expect(page).toHaveURL(/\/gens\/nouveau/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { level: 1, name: 'Ajouter un contact' })).toBeVisible()

  // Pleine page : pas de barre du bas, la flèche pour seule sortie — on ne
  // part pas ailleurs d'une touche au milieu d'une saisie.
  await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Retour aux contacts' })).toBeVisible()

  // ── 🔴 SEUL LE PRÉNOM EST OBLIGATOIRE ────────────────────────────────
  // Un champ obligatoire qu'on ne connaît pas encore, c'est un contact qu'on
  // n'enregistre pas — et un contact perdu coûte plus cher qu'une fiche
  // incomplète.
  await expect(page.locator('#prenom')).toHaveAttribute('required', '')
  for (const id of ['#nom', '#telephone', '#email']) {
    await expect(page.locator(id)).toBeVisible()
    expect(await page.locator(id).getAttribute('required'), `${id} exigé`).toBeNull()
  }

  // Les deux axes sont demandés, et ce sont des déroulants à nous.
  await expect(page.locator('form select')).toHaveCount(0)
  for (const champ of ['marche', 'etape']) {
    await expect(page.locator(`form input[name="${champ}"]`)).toHaveCount(1)
  }
  // ⚠️ L'étape part sur « Nouveau » et le marché sur RIEN : on ne devine pas
  // comment quelqu'un connaît une personne qu'il vient de nommer.
  expect(await page.locator('form input[name="etape"]').inputValue()).toBe('NOUVEAU')
  expect(await page.locator('form input[name="marche"]').inputValue()).toBe('')

  // Le geste au ras du bas, pas à 64 px du vide.
  const envoyer = page.getByRole('button', { name: 'Ajouter à ma liste' })
  await envoyer.click({ trial: true })
  const cadre = await envoyer.boundingBox()
  expect(844 - (cadre.y + cadre.height), 'le bouton flotte au-dessus du vide').toBeLessThan(32)

  await page.screenshot({ path: 'capture-contact-nouveau.png', animations: 'disabled' })
  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})

test('le filtre annonce ce qu’il donnera, et la liste dit qu’elle est filtrée', async ({
  page,
  pageErrors,
}) => {
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: 'Contacts' })).toBeVisible({
    timeout: 20_000,
  })
  const total = await page.locator('main a[href="#"], main').count()

  await page.getByRole('button', { name: /^Menu Contacts$/ }).click()
  await expect(page.getByRole('link', { name: 'Ce qui manque' })).toHaveCount(1)
  await page.getByRole('link', { name: 'Filtrer' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Filtrer' })).toBeVisible({
    timeout: 20_000,
  })
  await page.screenshot({ path: 'capture-contact-filtre.png', animations: 'disabled' })

  // 🔴 LE BOUTON DIT LE RÉSULTAT, PAS L'ACTION. « Appliquer » ne renseigne
  // sur rien ; un compte dit ce qui va se passer, et surtout quand il ne va
  // rien se passer.
  const geste = page.getByRole('link', { name: /Voir|Personne ne correspond/ })
  await expect(geste).toHaveCount(1)

  // On pose un filtre qui ne garde personne : « Leader » n'existe pas dans
  // cette base (0 contact à cette étape, mesuré le 6 novembre 2026).
  await page.getByRole('link', { name: 'Leader', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Personne ne correspond' })).toBeVisible({
    timeout: 15_000,
  })

  // 🔴 ET LE COMPTE NE MENT PAS : on applique, et la liste est bien vide.
  // Deux calculs séparés, et le bouton promettrait 3 là où la liste en
  // montre 2 — c'est pour ça que `lib/filtre-gens.ts` est écrit une fois.
  await page.getByRole('link', { name: 'Personne ne correspond' }).click()
  await expect(page).toHaveURL(/\/gens\?etape=LEADER/, { timeout: 20_000 })

  // 🔴 LA LISTE DIT QU'ELLE EST FILTRÉE. Sans ça, une liste réduite se lit
  // « j'ai perdu des contacts » — la panne la plus inquiétante qu'on puisse
  // infliger à quelqu'un dont le carnet EST le métier.
  const corps = await page.locator('main').innerText()
  expect(corps, 'rien ne dit que la liste est filtrée').toMatch(/Leader/)
  await expect(page.getByRole('link', { name: 'Tout voir' })).toBeVisible()

  // Et on en sort.
  await page.getByRole('link', { name: 'Tout voir' }).click()
  await expect(page).toHaveURL(/\/gens$/, { timeout: 20_000 })

  expect(total).toBeGreaterThan(0)
  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})

test('ce qui manque compte des trous réels', async ({ page, pageErrors }) => {
  await page.goto('/gens/incomplets', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: 'Ce qui manque' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Retour aux contacts' })).toBeVisible()

  // ⚠️ Mesuré le 6 novembre 2026 : sur 13 contacts en base, 2 ont un métier
  // et 5 une ville. Le compte de test en a 3, tous incomplets. Si cet écran
  // n'affichait rien, c'est qu'il ne compte pas ce qu'il prétend compter.
  const dit = await page.locator('main').innerText()
  expect(dit, 'aucun manque trouvé alors que la base en est pleine').toMatch(/il manque/)

  await page.screenshot({ path: 'capture-contact-manques.png', animations: 'disabled' })
  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})
