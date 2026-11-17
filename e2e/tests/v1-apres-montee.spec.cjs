// V1 TIENT APRÈS LA MONTÉE DE NEXT — 17 novembre 2026.
//
//   E2E_BASE=https://app.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/v1-apres-montee.spec.cjs
//
// ── 🔴 POURQUOI CETTE SONDE EXISTE ────────────────────────────────────────
//
// V1 est passée de Next 16.2.6 à 16.4.6 pour refermer **quatre exécutions de
// code à distance non authentifiées**. C'est une montée de correctifs dans la
// même version majeure, le typecheck et le build sont verts — et ça ne prouve
// rien du comportement. Le harnais existe précisément pour ça : *« un build
// vert, un typecheck propre et un HTTP 200 ne prouvent rien du comportement
// client »*.
//
// ⚠️ ELLE N'ÉCRIT RIEN. Elle ouvre les écrans que les gens ouvrent vraiment,
// vérifie que chacun rend quelque chose, et ramasse les exceptions client.
// C'est la vérification la moins intrusive qui dise quand même quelque chose.
//
// 🧭 CE QU'ELLE ATTRAPERAIT : une route qui ne rend plus, une erreur
// d'hydratation nouvelle, une exception au montage. Autrement dit, ce qu'une
// montée de version casse quand elle casse — et que le serveur, lui, continue
// d'annoncer en 200.

// ⚠️ ELLE MET ~30 s PAR ÉCRAN, ET CE N'EST PAS V1 QUI EST LENTE. Le harnais
// attend `data-vivant` après chaque navigation — une couture posée par V2
// APRÈS hydratation, pour que les sondes ne tapent pas dans la fenêtre morte.
// V1 ne la pose pas, donc l'attente va au bout de son délai puis renonce
// proprement. Les pages, elles, répondent en moins d'une seconde.

const { test, expect, BASE } = require('../fixtures.cjs')

test.use({ viewport: { width: 1280, height: 900 } })

/**
 * CETTE SONDE NE PARLE QUE DE V1, ET ELLE LE DIT.
 *
 * Ses dix chemins -- /home, /contacts, /profile... -- n'existent pas dans
 * V2, qui a sa propre nomenclature. Lancee dans la suite complete contre
 * v2.atline.ai, elle tombait dix fois en accusant une app parfaitement
 * saine : dix rouges qui ne designent aucun defaut, c'est pire qu'une sonde
 * absente, parce qu'on finit par ne plus lire les rouges.
 *
 * Elle se saute donc d'elle-meme, en DISANT pourquoi.
 */
test.skip(
  () => !/app\.atline\.ai/.test(BASE),
  'sonde de V1 : lancer avec E2E_BASE=https://app.atline.ai',
)

const ECRANS = [
  '/home',
  '/contacts',
  '/agenda',
  '/formation',
  '/atlas',
  '/profile',
  '/activities',
  '/notifications',
  '/communaute',
  '/mon-abonnement',
]

for (const chemin of ECRANS) {
  test(`V1 ${chemin} tient debout`, async ({ page, pageErrors }) => {
    const reponse = await page.goto(chemin, { waitUntil: 'domcontentloaded' })
    expect(reponse.status(), `${chemin} répond ${reponse.status()}`).toBeLessThan(400)

    /**
     * 🔴 PAS « LA PAGE RÉPOND », MAIS « LA PAGE A DU CONTENU ». Une page
     * d'erreur de Next répond 200 et s'affiche parfaitement : c'est
     * exactement ce qu'une montée de version casse, et exactement ce qu'un
     * contrôle de code HTTP laisse passer.
     */
    await expect(page.locator('body')).toBeVisible({ timeout: 20_000 })
    const texte = (await page.locator('body').innerText()).trim()
    expect(texte.length, `${chemin} rend une page vide`).toBeGreaterThan(40)

    // Les écrans d'erreur de Next, dans les deux langues qu'il emploie.
    const naufrage = /Application error|a client-side exception|Internal Server Error|This page could/i
    expect(naufrage.test(texte), `${chemin} affiche un écran d’erreur :\n${texte.slice(0, 200)}`).toBe(
      false,
    )

    expect(pageErrors, `${chemin} — exception client : ${pageErrors.join(' · ')}`).toEqual([])
  })
}
