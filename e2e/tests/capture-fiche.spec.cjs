// Une capture de la fiche, sur un VRAI contact. LECTURE SEULE.
//
// ⚠️ On évite le contact jetable : la fixture `seed` en crée un à chaque
// test, et comme la liste trie par dernière modification, il arrive EN TÊTE.
// Une capture prise dessus montrerait une fiche vide et ne prouverait rien.
const { test, expect, ouvrirInfos } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('capture de la fiche', async ({ page }) => {
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  const lignes = page.locator('[data-contact]')
  await expect(lignes.first()).toBeVisible({ timeout: 20_000 })

  const vrai = lignes.filter({ hasNotText: 'E2E' }).first()
  await expect(vrai).toBeVisible()
  await vrai.click()
  await expect(page).toHaveURL(/\/gens\/[a-z0-9]+$/i, { timeout: 20_000 })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  // 🔴 Une capture prise PENDANT une animation ment autant qu'une mesure.
  // On les termine toutes ; `finish()` lève sur une animation infinie, d'où
  // le try individuel.
  await page.evaluate(() => {
    document.getAnimations().forEach((a) => { try { a.finish() } catch {} })
  })
  // ⚠️ Sur une capture PLEINE PAGE, la barre du bas — qui est `fixed` — se
  // dessine à sa position d'écran, donc au MILIEU de l'image, et recouvre une
  // bande. Ce n'est pas un défaut de l'app : on le vérifie par l'arbre, pas
  // par l'œil.
  await page.screenshot({ path: 'capture-fiche.png' })

  /**
   * ── 🔴 CE QU'ELLE EXIGEAIT N'EXISTE PLUS, ET C'ÉTAIT VOULU ──────────────
   *
   * Elle attendait le titre « Ce que je sais d'elle ». Les cinq en-têtes de
   * bloc sont partis le 18 novembre 2026 : *« les champs parlent d'eux-mêmes »*
   * — cinq titres au-dessus de rangées déjà étiquetées, c'était chaque libellé
   * écrit deux fois.
   *
   * 🧭 On ne baisse donc pas l'exigence, on la RETOURNE : au lieu d'attendre
   * un titre, on exige que les deux premiers groupes n'en portent AUCUN. Sans
   * ça, un titre qui revient par mégarde ne serait signalé par rien.
   */
  await ouvrirInfos(page)
  await expect(page.locator('[data-champ="profession"]')).toBeVisible()

  for (const groupe of ['unefois', 'evolue']) {
    await expect(
      page.locator(`[data-groupe="${groupe}"] h2`),
      `le groupe « ${groupe} » a retrouvé un titre : les champs se nomment deux fois`,
    ).toHaveCount(0)
  }

  /**
   * ⚠️ ET LE TROISIÈME EN GARDE UN, exprès : rien dans « Dernier échange » ne
   * prévient qu'on ne le tape pas. C'est le seul endroit où un en-tête gagne
   * encore sa place, donc le seul qu'on exige.
   */
  await expect(page.locator('[data-groupe="mesure"] h2')).toHaveCount(1)

  await page.screenshot({ path: 'capture-fiche-infos.png', fullPage: true })
})
