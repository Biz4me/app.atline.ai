// TIRER LA PASTILLE VERS LE HAUT ROUVRE L'ÉCOUTE.
//
//   E2E_BASE=https://v2.atline.ai npx playwright test tests/geste-remonter.spec.cjs
//
// Patrice, le 21 novembre 2026 : *« je veux pouvoir faire le geste inverse à
// partir du curseur réduit, sauf que si je n'ai pas atteint les 3/4 d'écran
// il redescend si je lâche »* — seuil arrêté à la moitié de l'écran, qui vaut
// déjà 60 % de la course réelle de la pastille.
//
// 🧭 CE QUI SE MESURE N'EST PAS « ça ouvre », C'EST LE PARTAGE. Trois gestes
// partent du même doigt sur le même objet : vers la droite on ferme, vers le
// haut on rouvre, et un frôlement ne doit rien faire du tout. Un test qui ne
// vérifierait que l'ouverture laisserait les deux autres se dégrader en
// silence.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** La moitié de l'écran, le seuil choisi. */
const SEUIL = 0.5

const auLecteur = async (page) => {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const href = await page.locator('a[data-module="2"]').getAttribute('href')
  await page.goto(href, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)
  const ec = page.getByRole('link', { name: 'Écouter' })
  const pa = page.locator('[data-pastille-vers-lecon]')
  await expect
    .poll(async () => (await ec.count()) + (await pa.count()), { timeout: 20_000 })
    .toBeGreaterThan(0)
  await ((await ec.count()) ? ec : pa).first().click()
  await expect(page.locator('[data-titre-ecoute]')).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(700)
}

/**
 * ⚠️ À LA SOURIS, ET PAS EN ÉVÉNEMENTS TACTILES FABRIQUÉS. La pastille écoute
 * les POINTEURS — c'est écrit dans son fichier — et des `TouchEvent`
 * synthétiques n'en produisent aucun : la sonde glisserait dans le vide et
 * accuserait le produit. La souris, elle, en produit de vrais.
 */
const tirer = async (page, { haut, pas = 12, lenteur = 0 }) => {
  const b = await page.locator('[data-pastille-ecoute]').boundingBox()
  const x = b.x + b.width / 2
  const y0 = b.y + 20
  await page.mouse.move(x, y0)
  await page.mouse.down()
  for (let i = 1; i <= pas; i++) {
    await page.mouse.move(x, y0 - (haut * i) / pas)
    if (lenteur) await page.waitForTimeout(lenteur)
  }
  await page.mouse.up()
  await page.waitForTimeout(500)
}

test('la pastille remonte au doigt, et seulement assez haut', async ({ page, pageErrors }) => {
  test.setTimeout(400_000)
  const griefs = []

  // ── 1. Lâchée sous le seuil : elle redescend, et rien ne s'ouvre.
  await auLecteur(page)
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-pastille-ecoute]')).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(900)
  await tirer(page, { haut: Math.round(844 * SEUIL) - 120, lenteur: 25 })
  const apresCourt = new URL(page.url()).pathname
  const revenue = await page.evaluate(() => {
    const p = document.querySelector('[data-pastille-ecoute] .relative')
    return p ? getComputedStyle(p).transform : null
  })
  if (apresCourt !== '/accueil')
    griefs.push(`lâchée sous le seuil, elle a quand même ouvert ${apresCourt}`)
  if (revenue && revenue !== 'none' && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(revenue))
    griefs.push(`elle n’est pas redescendue : transform ${revenue}`)

  // ── 2. Tirée au-delà : elle rouvre la leçon qui joue.
  const attendu = await page.evaluate(
    () => document.querySelector('[data-pastille-vers-lecon]')?.getAttribute('href') ?? null,
  )
  await tirer(page, { haut: Math.round(844 * SEUIL) + 80, lenteur: 12 })
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe(attendu)

  // ── 3. Vers la droite, elle ferme encore : le partage des axes tient.
  await auLecteur(page)
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-pastille-ecoute]')).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(900)
  const b = await page.locator('[data-pastille-ecoute]').boundingBox()
  await page.mouse.move(b.x + 60, b.y + 20)
  await page.mouse.down()
  for (let dx = 20; dx <= 260; dx += 20) await page.mouse.move(b.x + 60 + dx, b.y + 20)
  await page.mouse.up()
  await expect(page.locator('[data-pastille-ecoute]')).toHaveCount(0, { timeout: 10_000 })
  if (new URL(page.url()).pathname !== '/accueil')
    griefs.push('un glissement vers la droite a ouvert l’écoute au lieu de fermer')

  console.log(`  sous le seuil → ${apresCourt} · au-delà → ${attendu} · à droite → fermée`)
  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})
