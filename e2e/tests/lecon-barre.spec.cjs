// LE BAS D'UNE LEÇON — la barre, le pied de chapitre, et ce qui marque la
// lecture.
//
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/lecon-barre.spec.cjs
//
// ── 🔴 CE FICHIER MESURAIT DEUX MÉCANISMES MORTS ──────────────────────────
//
// Il attendait ① un LECTEUR AUDIO dans la barre — parti le 19 novembre 2026
// pour devenir une page à lui — et ② une ALTERNANCE : les trois icônes
// pendant qu'on lit, remplacées par « Leçon suivante » une fois arrivé.
// L'alternance est tombée le 20 novembre sur la capture de Bookey, qui montre
// les deux ENSEMBLE : la barre garde ses outils, le pied de l'article porte
// « Chapitre suivant ».
//
// 🧭 ON NE SUPPRIME PAS LE CONTRÔLE, ON LE RETOURNE — c'est ce que ce fichier
// disait déjà de lui-même en 2026. Les invariants qui comptaient ne parlaient
// pas de la forme : **une leçon n'est jamais sans issue**, et **la fin du
// texte n'est pas recouverte par la barre**. Ils survivent tous les deux.
//
// Et il en garde un troisième, plus dur : **arriver au bas du texte termine
// la leçon**, et le serveur s'en souvient.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/**
 * Une leçon, ouverte par « Lire ».
 *
 * ⚠️ `prochain` VISE LE PREMIER MODULE NON TERMINÉ, et c'est nécessaire pour
 * la seconde épreuve : avec `E2E_COMME=humanstring@gmail.com`, le module 1 est
 * entièrement lu, donc sa première leçon arrive DÉJÀ marquée et la transition
 * qu'on veut observer a eu lieu il y a des jours. La sonde passait au vert
 * sans compte et au rouge avec, pour la même app — c'est la prémisse qui
 * changeait, pas le code.
 *
 * 🧭 Et « Lire » reprend à la dernière leçon non lue : la leçon obtenue est
 * donc non lue par construction, sur n'importe quel compte qui n'a pas fini
 * les onze modules.
 */
async function premiereLecon(page, { neuve = false } = {}) {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const cible = neuve ? '[data-prochain]' : '[data-module="1"]'
  const versModule = await page.locator(cible).getAttribute('href')
  await page.goto(versModule, { waitUntil: 'domcontentloaded' })
  const lire = page.getByRole('link', { name: 'Lire' })
  await expect(lire).toBeVisible({ timeout: 20_000 })
  await lire.click()
  await page.locator('[data-rang]').waitFor({ state: 'visible', timeout: 20_000 })
  return page.url()
}

test('la barre garde ses trois outils, du haut jusqu’au bas', async ({ page, pageErrors }) => {
  await premiereLecon(page)

  const options = page.locator('[data-options-lecture]')
  const sommaire = page.locator('[data-sommaire]')
  const ecouter = page.locator('[data-ecouter]')

  // ── En haut ──
  await expect(sommaire, 'le sommaire doit être là dès l’ouverture').toBeVisible({ timeout: 20_000 })
  await expect(ecouter).toBeVisible()
  await expect(options).toBeVisible()

  // ── Au bout : LES MÊMES, et c'est tout l'objet de ce contrôle ──
  // 🔴 L'alternance les faisait disparaître exactement quand on finit une
  // leçon, c'est-à-dire au moment où l'on veut en choisir une autre.
  await page.locator('[data-fin-de-lecon]').scrollIntoViewIfNeeded()
  await expect(sommaire, 'le sommaire ne doit plus disparaître au bas du texte').toBeVisible()
  await expect(ecouter).toBeVisible()

  // 🔴 ET LE PIED RESTE ATTEIGNABLE SOUS LA BARRE. Un `toBeVisible` ne le dit
  // pas : un élément recouvert par une barre fixe est « visible ». Un clic à
  // blanc, lui, échoue si quelque chose s'interpose.
  const avancer = page.locator('[data-pied-suivant], [data-pied-fin]')
  await expect(avancer, 'une leçon n’est jamais sans issue').toHaveCount(1)
  await avancer.click({ trial: true, timeout: 5_000 })

  // 🔴 UN SEUL `h1` PAR PAGE. Ce contrôle a déjà trouvé DEUX titres de premier
  // rang sur une leçon — celui de la coquille et celui du texte. C'est un
  // défaut de plan de document, et rien d'autre ne le regarde.
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)

  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})

/**
 * ── 🔴 ARRIVER AU BAS DU TEXTE TERMINE LA LEÇON ──────────────────────────
 *
 * Dynamique tranchée par Patrice le 20 novembre entre trois. Avant, une leçon
 * n'était lue que si l'on appuyait sur le bouton exact : **trois gestes
 * menaient à la leçon suivante et un seul comptait**. Le sommaire et le badge
 * de module mesuraient un geste, pas une lecture.
 *
 * ⚠️ ET ON VÉRIFIE QUE LE SERVEUR L'A GARDÉ, pas seulement que l'écran l'a
 * dit. Un `setState` optimiste affiche la confirmation avant toute réponse —
 * c'est voulu, la personne ne doit pas attendre le réseau — donc la voir ne
 * prouve rien de l'écriture. On recharge, et on demande au menu `…` : il dit
 * « Déjà marquée comme terminée » quand le serveur est d'accord.
 */
test('le bas du texte marque la leçon, et le serveur s’en souvient', async ({ page }) => {
  const adresse = await premiereLecon(page, { neuve: true })

  const dit = page.locator('[data-lecon-terminee]')
  await expect(dit, 'rien ne doit être marqué avant d’avoir lu').toHaveCount(0)

  /**
   * 🔴 ON DESCEND COMME UN HUMAIN, PAS COMME UN TEST. `scrollIntoViewIfNeeded`
   * peut amener le repère au MILIEU de la fenêtre — une position qu'aucun
   * pouce ne peut atteindre sur le dernier élément d'une page. C'est ce qui
   * masquait le défaut : l'observateur portait une marge basse de 140 px alors
   * qu'à fond de page le repère est à 743 px dans une fenêtre de 844. Il était
   * sous sa propre ligne en permanence, et le test passait quand même.
   */
  await page.evaluate(() =>
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }),
  )

  // ⚠️ On MESURE que le repère est atteignable, avant d'attendre son effet :
  // sans ça, un échec ne dit que « rien ne s'est passé » et laisse chercher du
  // côté du réseau ou du serveur.
  const vu = await page.evaluate(() => {
    const r = document.querySelector('[data-fin-de-lecon]')?.getBoundingClientRect()
    return r ? { haut: Math.round(r.top), fenetre: window.innerHeight } : null
  })
  expect(
    vu && vu.haut,
    `à fond de page le repère de fin doit être dans la fenêtre (${JSON.stringify(vu)})`,
  ).toBeLessThan(vu.fenetre)

  // Le délai de garde est de 3 s : il existe pour qu'une leçon courte, visible
  // d'un coup d'œil, ne se marque pas à l'ouverture.
  await expect(dit, 'la confirmation doit paraître au bas du texte').toBeVisible({ timeout: 15_000 })

  // ── Et le serveur ? ──
  await page.goto(adresse, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-menu-lecture]').click()
  await expect(
    page.getByRole('button', { name: 'Déjà marquée comme terminée' }),
    'rechargée, la leçon doit être lue côté serveur',
  ).toBeVisible({ timeout: 10_000 })
})
