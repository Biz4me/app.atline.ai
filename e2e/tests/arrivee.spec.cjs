// OÙ L'APPLICATION S'OUVRE.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/arrivee.spec.cjs
//
// 🔴 DEUX FICHIERS DÉCIDAIENT, ET ILS NE DISAIENT PAS LA MÊME CHOSE. La
// racine envoyait sur `/accueil` depuis le 5 novembre 2026 ; la page de
// connexion gardait `/parcours` comme repli. Or **au lancement on est
// anonyme** : la racine renvoie d'abord vers `/auth`, et c'est donc le repli
// qui décide. L'app ouvrait sur Formation, et la correction de la racine
// n'avait rien changé pour personne pendant deux jours.
//
// 🧭 D'où les DEUX chemins vérifiés ici. N'en vérifier qu'un, c'est reproduire
// exactement l'angle mort qui a laissé passer le défaut.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/**
 * LA DESTINATION QUE LE SERVEUR A RÉSOLUE.
 *
 * Elle voyage dans la charge que Next envoie au navigateur, en propriété du
 * composant de connexion : on observe la VRAIE sortie du serveur, sans
 * ajouter la moindre balise pour le test.
 *
 * ⚠️ ON RETIRE LES ÉCHAPPEMENTS AVANT DE CHERCHER. Ma première version
 * cherchait `"suite":"/accueil"` tel quel et échouait sur un correctif qui
 * marchait : dans cette charge les guillemets sont échappés deux fois.
 * 🧭 **Asserter sur un format de sérialisation, c'est mesurer l'emballage au
 * lieu du contenu.** On extrait la valeur, puis on la compare.
 */
async function destinationResolue(page) {
  const charge = (await page.content()).replace(/\\/g, '')
  const m = charge.match(/"suite"\s*:\s*"([^"]*)"/)
  return m ? m[1] : null
}

test('déjà connecté : la racine mène à l’accueil', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/accueil$/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('anonyme : le repli de la connexion est l’accueil, pas la formation', async ({ browser }) => {
  // Sans cookie : c'est l'état d'un vrai lancement, celui qui décidait.
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/auth(\?|$)/, { timeout: 20_000 })

  // ⚠️ La racine ne pose PAS de `?suite=` — c'est précisément ce qui rend le
  // repli décisif, et c'est pour ça qu'on le vérifie ici.
  expect(page.url(), 'la racine ne doit pas poser de suite').not.toMatch(/suite=/)

  expect(await destinationResolue(page), 'le repli de connexion').toBe('/accueil')

  await ctx.close()
})

test('une destination demandée est respectée, une destination piégée ne l’est pas', async ({
  browser,
}) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()

  // Un chemin légitime survit : on ramène la personne là où elle allait.
  await page.goto('/auth?suite=%2Fgens', { waitUntil: 'domcontentloaded' })
  expect(await destinationResolue(page), 'une destination légitime a été perdue').toBe('/gens')

  // 🔴 `//ailleurs.example` est une URL ABSOLUE pour un navigateur : elle
  // emmènerait hors du domaine après une connexion réussie, l'air de rien.
  await page.goto('/auth?suite=%2F%2Failleurs.example', { waitUntil: 'domcontentloaded' })
  expect(await destinationResolue(page), 'une destination hors domaine a survécu').toBe('/accueil')

  await ctx.close()
})
