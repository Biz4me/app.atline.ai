// LA NAVIGATION DE V2 : l'accueil, la barre à cinq, et le menu qui bascule.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/capture-barre.spec.cjs
//
// 🔴 Trois choses que ce test cherche, et qu'une assertion de présence ne
// trouverait pas :
//
//   1. que `/` mène bien à l'accueil, et pas au parcours comme avant ;
//   2. que la barre reste ATTEIGNABLE quand le menu est ouvert — `toBeVisible`
//      ignore les recouvrements, seul un clic à blanc les détecte ;
//   3. que le même bouton REFERME le menu. Une porte qui ne s'ouvre que dans
//      un sens est un piège, et aucun test de « ça s'ouvre » ne le voit.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('l’accueil, la barre à cinq, et le menu qui bascule', async ({ page, pageErrors }) => {
  // ── 1. la racine mène à l'accueil ───────────────────────────────────────
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/accueil$/, { timeout: 20_000 })

  const barre = page.getByRole('navigation', { name: /Navigation principale/ })
  await expect(barre).toBeVisible({ timeout: 20_000 })

  const entrees = (await barre.innerText()).split('\n').map((t) => t.trim()).filter(Boolean)
  expect(entrees).toEqual(['Menu', 'Formation', 'Coach', 'Agenda', 'Mes gens'])

  // L'accueil porte l'identité : l'activité et l'avatar.
  await expect(page.getByText('Forever Living')).toBeVisible()
  await expect(page.getByRole('link', { name: /Mon compte/ })).toBeVisible()
  await page.screenshot({ path: 'capture-accueil.png', animations: 'disabled' })

  // ── 2. le menu s'ouvre et laisse la barre atteignable ───────────────────
  const menu = barre.getByRole('button', { name: 'Menu' })
  await menu.click()

  // ⚠️ `animations: 'disabled'` sur chaque capture : le panneau glisse en
  // 0,22 s et Playwright photographiait AVANT la fin — texte coupé à gauche,
  // deux avatars superposés. L'écran était juste, l'image mentait.
  const panneau = page.getByRole('dialog', { name: 'Menu' })
  await expect(panneau).toBeVisible({ timeout: 10_000 })
  await expect(panneau.getByText('Ton compte')).toBeVisible()

  // 🔴 UNE SEULE FOIS. Le menu redessinait sa propre barre du haut, avec son
  // sélecteur et son avatar : sur l'accueil, l'activité s'affichait donc DEUX
  // fois, et deux contrôles du même nom cohabitaient. Aucune assertion de
  // présence ne l'aurait vu — `toBeVisible` se contente du premier.
  await expect(page.getByText('Forever Living')).toHaveCount(1)
  await expect(page.getByRole('link', { name: /Mon compte/ })).toHaveCount(1)

  // 🔴 Le clic à blanc échoue si quelque chose s'interpose. `toBeVisible` non.
  await barre.getByRole('link', { name: 'Agenda' }).click({ trial: true, timeout: 5_000 })
  await page.screenshot({ path: 'capture-menu.png', animations: 'disabled' })

  // ── 3. le même bouton referme ───────────────────────────────────────────
  await menu.click()
  await expect(panneau).toBeHidden({ timeout: 5_000 })

  // ── 4. un lieu ne porte NI sélecteur NI avatar ──────────────────────────
  await barre.getByRole('link', { name: 'Formation' }).click()
  await expect(page).toHaveURL(/\/parcours$/, { timeout: 15_000 })
  await expect(page.getByRole('link', { name: /Mon compte/ })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Retour à l’accueil/ })).toBeVisible()
  await page.screenshot({ path: 'capture-lieu.png', clip: { x: 0, y: 0, width: 390, height: 150 }, animations: 'disabled' })

  // ── 5. LE MENU ÉTEINT LES AUTRES, ET LES RALLUME ─────────────────────
  //
  // 🔴 En TROIS temps, pas un. Vérifier seulement l'extinction ne dirait
  // pas qu'on retrouve son lieu en refermant — et une barre qui oublie où
  // l'on était est pire qu'une barre qui en allume deux.
  const allumees = barre.locator('[aria-current="page"]')
  await expect(allumees).toHaveCount(1)
  await expect(allumees).toHaveText(/Formation/)

  await menu.click()
  await expect(panneau).toBeVisible({ timeout: 10_000 })
  await expect(allumees).toHaveCount(0)

  // 🔴 LE MENU EST IDENTITAIRE MÊME OUVERT DEPUIS UN LIEU. C'est la correction
  // du 5 novembre : j'avais lié l'identité au seul chemin `/accueil`, si bien
  // qu'ouvrir le menu depuis Formation gardait « Formation » en haut, sans
  // sélecteur ni avatar. Deux écrans la portent, pas un.
  await expect(page.getByText('Forever Living')).toBeVisible()
  await expect(page.getByRole('link', { name: /Mon compte/ })).toBeVisible()
  // …et le nom du lieu a cédé la place, sinon l'écran répondrait deux fois à
  // « où suis-je » dans le même coin.
  await expect(page.getByRole('heading', { level: 1, name: 'Formation' })).toHaveCount(0)
  await page.screenshot({ path: 'capture-menu-depuis-lieu.png', animations: 'disabled' })

  // L'image depuis un LIEU, pas depuis l'accueil : c'est là qu'on voit
  // qu'une entrée déjà allumée s'est bien éteinte.
  await page.screenshot({ path: 'capture-barre-menu-ouvert.png', clip: { x: 0, y: 844 - 80, width: 390, height: 80 }, animations: 'disabled' })

  await menu.click()
  await expect(panneau).toBeHidden({ timeout: 5_000 })
  await expect(allumees).toHaveCount(1)
  await expect(allumees).toHaveText(/Formation/)

  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})
