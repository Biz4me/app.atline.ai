// UN SEUL `h1` PAR ÉCRAN, ET IL EXISTE.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/un-seul-titre.spec.cjs
//
// ── 🔴 POURQUOI CE FICHIER EXISTE ────────────────────────────────────────
//
// La coquille pose un `h1` sur TOUS les écrans — c'est son travail, et c'est
// ce qui donne à chaque page un point de départ pour un lecteur d'écran et
// pour l'onglet. Un écran qui en écrit un second ne casse rien de visible :
// deux titres dessinés à deux tailles ressemblent à une hiérarchie réussie.
//
// `antichambre-repeter.spec.cjs` le vérifiait déjà — sur UNE page, et son
// commentaire disait la bonne chose : « la faute déjà payée sur les leçons ».
// Une faute déjà payée deux fois mérite un contrôle qui balaie, pas un
// contrôle posté à l'endroit où elle s'est montrée.
//
// 🧭 **Le poids visuel n'est pas le niveau.** Rien n'interdit à une page
// d'avoir son plus gros texte dans le corps ; il doit juste être un `h2`.
//
// Trouvé le 10 novembre 2026 par une sonde qui vérifiait une flèche de retour
// et qui est tombée sur « 2 elements » en cherchant le titre d'un module.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/**
 * ⚠️ LES ÉCRANS À PARAMÈTRE SE RÉSOLVENT, ils ne s'écrivent pas. Une sonde
 * qui porte un identifiant de module surveille cet identifiant ; celle-ci
 * suit le vrai chemin et couvre donc le module du jour, quel qu'il soit.
 */
const FIXES = [
  '/accueil',
  '/accueil?menu=1',
  '/parcours',
  '/parcours/cours',
  '/parcours/competences',
  '/coach/repeter',
  '/agenda',
  '/gens',
  '/compte',
]

const titres = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('h1')].map((h) => ({
      mot: h.textContent.trim().slice(0, 50),
      cache: h.className.includes('sr-only'),
    })),
  )

test('chaque écran porte exactement un h1', async ({ page, pageErrors }) => {
  const dus = []

  for (const chemin of FIXES) {
    await page.goto(chemin, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main')).toBeVisible({ timeout: 20_000 })
    dus.push([chemin, await titres(page)])
  }

  /**
   * Le module et la leçon, atteints par leur vrai chemin.
   *
   * 🔴 ON ATTEND L'ADRESSE EXACTE DU LIEN, pas un gabarit. Ma première
   * version attendait `/\/parcours\/[^/]+$/` — or `/parcours/cours` LE
   * SATISFAIT. `toHaveURL` était donc vrai avant même le clic, la sonde
   * relevait la page de départ, et le relevé montrait `/parcours/cours` deux
   * fois : **elle n'a jamais vu une leçon tout en passant au vert**. Elle
   * mesurait moins que ce qu'elle annonçait, et seul le journal l'a dit.
   *
   * 🧭 Une attente qui est déjà vraie n'attend rien.
   */
  const suivre = async (lien) => {
    const ou = await lien.getAttribute('href')
    await lien.click()
    await expect(page).toHaveURL(new RegExp(`${ou.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), {
      timeout: 20_000,
    })
    await expect(page.locator('main')).toBeVisible({ timeout: 20_000 })
    dus.push([ou, await titres(page)])
    return ou
  }

  await page.goto('/parcours/cours', { waitUntil: 'domcontentloaded' })
  const modules = page.locator('main a[href^="/parcours/"]')
  await expect(modules.first()).toBeVisible({ timeout: 20_000 })
  const module = await suivre(modules.first())

  // ⚠️ Une leçon vit SOUS le module : deux segments, pas un. Sans cette
  // ancre, le premier lien venu — la flèche de retour comprise — passerait.
  const lecons = page.locator(`main a[href^="${module}/"]`)
  expect(await lecons.count(), 'aucune leçon trouvée : la sonde ne mesure rien').toBeGreaterThan(0)
  await suivre(lecons.first())

  for (const [chemin, liste] of dus) {
    console.log(`  ${String(liste.length)} · ${chemin} — ${liste.map((h) => h.mot).join(' | ')}`)
  }

  // 🔴 CE QU'ON ATTEND, DÉCLARÉ : sans ce compte, une sonde qui n'aurait
  // visité aucun écran passerait au vert.
  expect(dus.length, 'la sonde n’a pas visité tous les écrans').toBeGreaterThanOrEqual(
    FIXES.length + 1,
  )

  // 🔴 ON PROUVE QUE LE DÉTECTEUR DÉTECTE : on injecte le défaut sur la page
  // courante et il doit être vu. Un contrôle d'absence qui n'a jamais rien
  // trouvé ne vaut rien.
  await page.evaluate(() => document.querySelector('main')?.insertAdjacentHTML('afterbegin', '<h1>témoin</h1>'))
  expect(
    (await titres(page)).length,
    'la sonde ne voit pas le second titre qu’elle surveille',
  ).toBeGreaterThan(1)

  const fautifs = dus.filter(([, l]) => l.length !== 1)
  expect(
    fautifs.map(([c, l]) => `${c} en porte ${l.length} : ${l.map((h) => h.mot).join(' / ')}`),
    'un écran n’a pas exactement un titre de niveau 1',
  ).toEqual([])

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})
