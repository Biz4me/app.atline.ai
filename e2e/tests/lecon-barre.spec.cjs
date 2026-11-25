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

/**
 * ── 🔴 LA SONDE FABRIQUE SA PRÉMISSE, ELLE NE L'ESPÈRE PAS ───────────────
 *
 * Ces épreuves MARQUENT des leçons — c'est leur sujet — et la session jetée
 * n'efface pas cette progression. Le deuxième passage trouvait donc une leçon
 * déjà lue et échouait sur « rien ne doit être marqué avant d'avoir lu » :
 * **une sonde verte au premier tour et rouge au second, sans qu'une ligne de
 * code ait bougé.**
 *
 * 🧭 C'est la même famille que la prémisse `E2E_COMME`, en pire : là-bas
 * l'état dépendait du compte, ici il dépend de l'ORDRE DES PASSAGES. On remet
 * donc la leçon à zéro par le chemin de l'app — le menu `…` — au lieu de
 * supposer qu'elle l'est.
 */
async function rendreNonLue(page) {
  await page.locator('[data-menu-lecture]').click()
  const defaire = page.getByRole('button', { name: 'Marquer comme non lue' })
  if (await defaire.isVisible().catch(() => false)) {
    await defaire.click()
    await expect(page.locator('[data-lecon-terminee]')).toHaveCount(0, { timeout: 15_000 })
    /**
     * 🔴 ET ON RECHARGE, PARCE QUE DÉMARQUER NE RÉ-ARME PAS LA VISITE EN
     * COURS — c'est une décision du produit, pas un défaut. Le verrou dit
     * « cette page a déjà écrit » : quelqu'un qui vient de dire « je veux la
     * relire » ne doit pas la voir se re-marquer sous ses yeux en restant au
     * bas du texte. L'automatique se ré-arme à la visite suivante, ce qui est
     * aussi le moment où l'on relit vraiment.
     *
     * 🧭 Sans ce rechargement, la sonde mesurait l'app DANS un état qu'aucun
     * lecteur ne traverse : démarquer puis relire sans jamais partir.
     */
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('[data-rang]').waitFor({ state: 'visible', timeout: 20_000 })
  } else {
    // Déjà non lue : on referme sans rien toucher.
    await page.getByLabel('Fermer').first().click()
    await expect(page.getByRole('button', { name: /^Marquer comme/ })).toHaveCount(0, {
      timeout: 10_000,
    })
  }
}

/**
 * ── 🔴 ROUVRIR LA LEÇON ET ATTEINDRE LE MENU « … » ───────────────────────────
 *
 * La liseuse REPREND à la position quittée (voir `liseuse-reprise`). Ces deux
 * épreuves rechargent après avoir marqué la leçon **en bas** — la reprise y
 * ramène donc, et elle rallume l'immersion avec (`immersion.tsx` : `ou > PLI`
 * ⇒ `cache=true`). La barre du haut s'efface, le menu `[data-menu-lecture]` est
 * `position: fixed` translaté hors de la vue, et le `scrollIntoView` de
 * Playwright n'y peut rien.
 *
 * 🔴 ET REMONTER NE SUFFIT PAS. `immersion.tsx` est catégorique : *« descendre
 * cache, TOUCHER montre, et rien d'autre »* — le défilement vers le haut ne
 * rallume PAS le chrome (sinon il clignoterait à chaque phrase relue). Seul un
 * TAP sur le texte le rappelle. On fait donc ce que fait déjà la 3ᵉ épreuve :
 * on tape `[data-fin-de-lecon]` (en vue après la reprise, tout en bas), ce qui
 * remonte la barre et son menu.
 */
async function rouvrirEtMenu(page, adresse) {
  await page.goto(adresse, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-rang]').waitFor({ state: 'visible', timeout: 20_000 })
  await page.waitForTimeout(400) // laisser la reprise se poser (scroll + immersif)
  await page.locator('[data-fin-de-lecon]').click({ position: { x: 5, y: 0 }, force: true })
  await expect(page.locator('[data-menu-lecture]')).toBeInViewport({ timeout: 10_000 })
  await page.locator('[data-menu-lecture]').click()
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
  await rendreNonLue(page)

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
  await rouvrirEtMenu(page, adresse)
  await expect(
    page.getByRole('button', { name: 'Marquer comme non lue' }),
    'rechargée, la leçon doit être lue côté serveur',
  ).toBeVisible({ timeout: 10_000 })
})

/**
 * ── 🔴 LE PIÈGE DE LA BASCULE, ET IL EST SÉRIEUX ─────────────────────────
 *
 * On démarque en restant SUR la leçon, au bas de la page — c'est-à-dire au
 * point exact où l'observateur marque. Sans verrou, le serveur dit « non
 * lue », l'observateur re-tire trois secondes plus tard, et **le geste est
 * défait par la page elle-même** : une décision annulée sans rien pour
 * l'expliquer.
 *
 * ⚠️ C'est précisément le genre de défaut qu'un build ne voit pas, qu'un
 * typecheck ne voit pas, et qu'une capture ne voit pas non plus — il faut
 * attendre, au bon endroit, et regarder si quelque chose se défait tout seul.
 */
test('démarquer tient, même en restant au bas de la page', async ({ page }) => {
  const adresse = await premiereLecon(page, { neuve: true })
  await rendreNonLue(page)

  // On lit jusqu'au bout : la leçon se marque.
  await page.evaluate(() =>
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }),
  )
  const dit = page.locator('[data-lecon-terminee]')
  await expect(dit).toBeVisible({ timeout: 15_000 })

  // ── On démarque, sans bouger ──
  // ⚠️ UN TOUCHER D'ABORD. Descendre déclenche le mode immersif : la barre du
  // haut s'efface, donc les trois points ne sont pas cliquables. C'est le
  // geste qu'un lecteur fait de toute façon, et sans lui ce clic expire à
  // soixante secondes sans rien dire du vrai sujet.
  await page.locator('[data-fin-de-lecon]').click({ position: { x: 5, y: 0 }, force: true })
  await expect(page.locator('[data-menu-lecture]')).toBeVisible({ timeout: 10_000 })
  await page.locator('[data-menu-lecture]').click()
  await page.getByRole('button', { name: 'Marquer comme non lue' }).click()
  await expect(dit, 'la confirmation doit tomber avec le démarquage').toHaveCount(0, {
    timeout: 15_000,
  })

  // ── Et on attend, là où l'observateur tire ──
  // Le délai est de 3 s : on laisse largement de quoi le voir re-tirer.
  await page.evaluate(() =>
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }),
  )
  await page.waitForTimeout(6_000)
  await expect(dit, 'la page a re-marqué la leçon toute seule').toHaveCount(0)

  // ── Et le serveur est d'accord ──
  await rouvrirEtMenu(page, adresse)
  await expect(
    page.getByRole('button', { name: 'Marquer comme terminée' }),
    'rechargée, la leçon doit être redevenue non lue',
  ).toBeVisible({ timeout: 10_000 })
})
