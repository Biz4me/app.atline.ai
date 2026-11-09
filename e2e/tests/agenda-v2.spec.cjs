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

  // La barre du bas porte CINQ destinations depuis le 5 novembre 2026 :
  // Accueil · Formation · Simulation · Agenda · Contacts. Quatre voudrait dire
  // qu'on regarde un déploiement d'avant la recomposition — ce contrôle a
  // justement attrapé sa propre péremption, en annonçant 4 là où l'app en
  // servait 5 depuis des heures.
  const barre = page.getByRole('navigation', { name: 'Navigation principale' })
  // 🔴 QUATRE, PLUS CINQ : l'agenda est monté en haut à droite le 10 novembre
  // 2026. Il reste un LIEU — titre centré, icône, teinte, sous-pages — il n'a
  // perdu que sa case.
  await expect(barre.getByRole('link')).toHaveCount(4)
  // ⚠️ ET ON L'ATTEINT PAR LE HAUT. Le contrôle disait « visible dans la
  // barre » ; le remplacer par rien aurait laissé l'agenda joignable depuis
  // nulle part sans que personne le voie.
  await expect(barre.getByRole('link', { name: 'Agenda' })).toHaveCount(0)
  await expect(page.locator('[data-agenda-haut]')).toHaveCount(0) // on y EST déjà

  // « Ce qui vient » est toujours là, rempli ou vide.
  await expect(page.getByRole('heading', { name: 'Ce qui vient', level: 2 })).toBeVisible()

  // La zone du lien existe dans les deux cas — posé ou pas encore.
  await expect(page.getByText('Ton lien de réservation')).toBeVisible()

  await page.screenshot({ path: 'test-results/agenda-v2.png', fullPage: true })

  // 🔴 Le filet : ce qu'on ne cherchait pas.
  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toEqual([])
})
