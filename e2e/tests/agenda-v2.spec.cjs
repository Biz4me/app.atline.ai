// L'AGENDA DE V2 — la preuve que l'écran existe et ne casse pas.
//
// 🧭 Il vise v2.atline.ai et non app.atline.ai : les deux applications
// partagent le MÊME `NEXTAUTH_SECRET` (vérifié le 3 novembre 2026, empreintes
// identiques), donc la session forgée par `server-helper.cjs` y est valable
// telle quelle. Lancer avec :
//
//   E2E_BASE=https://v2.atline.ai npx playwright test tests/agenda-v2.spec.cjs
//
// 🔴 Ce que ce test cherche vraiment, c'est l'exception JS non capturée. Un
// build vert et un 200 ne disent RIEN du rendu : un `toISOString` sur une
// date nulle, un fuseau qui diverge entre serveur et client, et l'écran est
// blanc alors que tout a l'air d'aller.
const { test, expect } = require('../fixtures.cjs')

test("l'agenda de V2 s'affiche pour un utilisateur authentifié", async ({ page, pageErrors }) => {
  await page.goto('/agenda', { waitUntil: 'domcontentloaded' })

  // Le titre de la coquille : si on est ici, l'authentification a tenu et la
  // route existe.
  await expect(page.getByRole('heading', { name: 'Agenda', level: 1 })).toBeVisible()

  // La barre du bas doit porter QUATRE destinations depuis le 3 novembre.
  // Trois voudrait dire que la coquille n'a pas été déployée.
  const barre = page.getByRole('navigation', { name: 'Navigation principale' })
  await expect(barre.getByRole('link')).toHaveCount(4)
  await expect(barre.getByRole('link', { name: 'Agenda' })).toBeVisible()

  // « Ce qui vient » est toujours là, rempli ou vide.
  await expect(page.getByRole('heading', { name: 'Ce qui vient', level: 2 })).toBeVisible()

  // La zone du lien existe dans les deux cas — posé ou pas encore.
  await expect(page.getByText('Ton lien de réservation')).toBeVisible()

  await page.screenshot({ path: 'test-results/agenda-v2.png', fullPage: true })

  // 🔴 Le filet : ce qu'on ne cherchait pas.
  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toEqual([])
})
