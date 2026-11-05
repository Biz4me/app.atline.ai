// LA BULLE D'ATLAS NE PEUT PAS CONTREDIRE L'ÉCRAN QU'ELLE SURMONTE.
//
// 🔴 C'est le SEUL risque sérieux de cette bulle, et aucune assertion de
// présence ne le verrait : elle peut être là, lisible, bien tournée, et
// annoncer un autre chiffre que la carte juste en dessous. Un coach qui se
// contredit en trois centimètres est pire qu'un coach muet.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/bulle-atlas.spec.cjs

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('la bulle dit le même chiffre que le plan, et elle ne salue pas', async ({
  page,
  pageErrors,
}) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })

  const plan = page.getByRole('heading', { name: 'Le plan du jour' })
  await expect(plan).toBeVisible({ timeout: 20_000 })

  // La bulle est la section qui précède le plan.
  const bulle = page.locator('main section').first()
  await expect(bulle).toBeVisible()
  const dit = await bulle.innerText()

  // ── 1. elle ne salue pas ───────────────────────────────────────────────
  //
  // ⚠️ « Bonjour » servi à 23 h est un petit mensonge, et l'heure du serveur
  // n'est pas celle du distributeur.
  expect(dit, `la bulle salue : « ${dit} »`).not.toMatch(/Bonjour|Bonsoir|Bienvenue/i)

  // ── 2. elle NE RÉPÈTE PAS la carte ───────────────────────────
  //
  // 🔴 Première version de la bulle : elle annonçait « 5 sur 100 », soit
  // exactement le chiffre de la carte trois centimètres plus bas. Un chiffre
  // n'a qu'une place — sinon le jour où l'un change, l'autre ment.
  expect(dit, `la bulle porte un chiffre : « ${dit} »`).not.toMatch(/\d+ sur 100/)

  // …et les chiffres de l'écran, eux, sont tous le MÊME.
  const corps = await page.locator('main').innerText()
  const chiffres = [...corps.matchAll(/(\d+) sur 100/g)].map((m) => m[1])
  expect(new Set(chiffres).size, `chiffres divergents : ${chiffres.join(', ')}`)
    .toBeLessThanOrEqual(1)

  // ── 2 bis. elle reste une PHRASE, pas un paragraphe ───────────────
  //
  // ⚠️ Une bulle qui s'allonge cesse d'être une invitation et redevient du
  // contenu — que personne ne lit, parce qu'on l'a déjà lu en dessous.
  expect(dit.length, `bulle trop longue (${dit.length} caractères)`).toBeLessThan(220)
  // ── 3. elle justifie le geste, donc elle le précède ────────────────────
  const geste = page.getByRole('link', { name: 'Parler à Atlas' })
  await expect(geste).toBeVisible()

  await page.evaluate(() =>
    document.getAnimations().forEach((a) => {
      try {
        a.finish()
      } catch {}
    }),
  )
  await page.screenshot({ path: 'capture-bulle.png', animations: 'disabled' })

  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})
