// L'AUDIO : il enchaîne, il reprend, et il marque.
//
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/audio-enchainement.spec.cjs
//
// ── 🔴 POURQUOI CES TROIS-LÀ ENSEMBLE ─────────────────────────────────────
//
// Ce sont trois comportements qu'AUCUNE autre vérification ne peut voir. Un
// build ne lance pas un son, un typecheck ne connaît pas `localStorage`, et
// une capture ne montre pas ce qui se passe deux secondes après la fin d'une
// piste. Demandés par Patrice le 20 novembre 2026.
//
// ⚠️ ON PILOTE L'ÉLÉMENT `<audio>`, PAS LES BOUTONS. Attendre quinze minutes
// qu'une leçon se termine n'est pas une épreuve, c'est une panne de patience :
// on place la tête de lecture près de la fin et on laisse le navigateur faire
// le reste — `ended` part de la même façon.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** La page d'écoute de la première leçon du module 1. */
async function ouvrirEcoute(page) {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const versModule = await page.locator('[data-module="1"]').getAttribute('href')
  await page.goto(versModule, { waitUntil: 'domcontentloaded' })
  const ecouter = page.getByRole('link', { name: 'Écouter' })
  await expect(ecouter).toBeVisible({ timeout: 20_000 })
  await ecouter.click()
  await page.locator('audio').waitFor({ state: 'attached', timeout: 20_000 })
  // On attend que la durée soit connue : sans elle, impossible de viser la fin.
  await expect
    .poll(async () => page.evaluate(() => document.querySelector('audio')?.duration ?? 0), {
      timeout: 25_000,
    })
    .toBeGreaterThan(1)
  return page.url()
}

test('la position se retient, et l’écoute reprend là où on l’a laissée', async ({ page }) => {
  const adresse = await ouvrirEcoute(page)

  // On avance franchement dans la piste, puis on quitte la page.
  await page.evaluate(() => {
    const a = document.querySelector('audio')
    a.currentTime = 120
    a.dispatchEvent(new Event('timeupdate'))
  })
  // ⚠️ `timeupdate` est tiré À LA MAIN ci-dessus : React écoute l'événement,
  // pas la propriété, et poser `currentTime` ne le déclenche pas toujours
  // assez vite pour la suite du test.
  await page.waitForTimeout(500)

  const retenue = await page.evaluate(() =>
    Object.keys(localStorage)
      .filter((k) => k.startsWith('atline.ou-ecoute.'))
      .map((k) => [k, localStorage.getItem(k)]),
  )
  console.log(`  retenu : ${JSON.stringify(retenue)}`)
  expect(retenue.length, 'aucune position écrite dans le navigateur').toBeGreaterThan(0)
  expect(Number(retenue[0][1]), 'la position retenue ne correspond pas').toBeGreaterThan(100)

  // ── On revient : la tête de lecture doit être replacée ──
  await page.goto(adresse, { waitUntil: 'domcontentloaded' })
  await page.locator('audio').waitFor({ state: 'attached', timeout: 20_000 })
  await expect
    .poll(async () => page.evaluate(() => Math.round(document.querySelector('audio')?.currentTime ?? 0)), {
      timeout: 20_000,
    })
    .toBeGreaterThan(100)
})

test('la fin du son enchaîne sur la leçon suivante et marque la leçon', async ({ page }) => {
  const depart = await ouvrirEcoute(page)

  // On se place deux secondes avant la fin et on laisse jouer.
  await page.evaluate(async () => {
    const a = document.querySelector('audio')
    a.currentTime = Math.max(0, a.duration - 2)
    await a.play().catch(() => {})
  })

  /**
   * 🔴 ON ATTEND UN CHANGEMENT D'ADRESSE, PAS UN DÉLAI. L'enchaînement laisse
   * deux secondes après la fin — un `waitForTimeout` calé dessus mesurerait
   * notre propre constante au lieu du comportement.
   */
  await page.waitForURL((u) => u.toString() !== depart, { timeout: 30_000 })
  console.log(`  ${depart}\n  → ${page.url()}`)
  expect(page.url(), 'on doit arriver sur la page d’écoute de la suivante').toContain('/ecouter')

  /**
   * ── Et la leçon qu'on vient d'écouter est marquée ──
   *
   * ⚠️ ON LE DEMANDE À LA PAGE DE LECTURE, PAS À LA PAGE AUDIO. Celle-ci n'a
   * pas de menu `…` : sa barre porte une case vide à la place des options,
   * parce qu'il n'y a aucun texte à régler. Viser les trois points ici
   * expirait à soixante secondes sans rien dire du marquage.
   */
  await page.goto(depart.replace(/\/ecouter$/, ''), { waitUntil: 'domcontentloaded' })
  await page.locator('[data-menu-lecture]').click()
  await expect(
    page.getByRole('button', { name: 'Marquer comme non lue' }),
    'écoutée doit valoir lue, et le serveur doit s’en souvenir',
  ).toBeVisible({ timeout: 15_000 })
})
