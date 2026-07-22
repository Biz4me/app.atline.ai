// Porté de l'ancien fiche-contact.cjs (puppeteer) vers Playwright : mêmes garanties, auto-waiting
// à la place des sleep() fixes. Vérifie la SÉCURITÉ DES DONNÉES (aucune perte au reload d'une action
// immédiate ni au départ de la fiche via keepalive) + la LECTURE Qualification (« Son contexte »).
const { test, expect } = require('../fixtures.cjs')

test('Contexte → lu en Qualification, survit au reload et au départ (keepalive)', async ({ page, seed, pageErrors }) => {
  const { cid } = seed

  await page.goto(`/contacts/${cid}`, { waitUntil: 'networkidle' })
  await expect(page, 'auth OK (pas de redirection login)').toHaveURL(new RegExp(`/contacts/${cid}`))
  await expect(page.getByTestId('tab-details')).toBeVisible()

  // Saisir « SITU_E2E » dans Détails › Contexte (fill = clear + frappe).
  await page.getByTestId('tab-details').click()
  await page.getByTestId('subtab-contexte').click()
  const situ = page.getByTestId('ctx-situation')
  await expect(situ, 'champ situation présent dans Contexte').toBeVisible()
  await situ.fill('SITU_E2E')

  // #2 — Qualification LIT le contexte : carte « Son contexte » + la valeur saisie.
  await page.getByTestId('tab-qualif').click()
  const card = page.getByTestId('qualif-son-contexte')
  await expect(card, '#2 Qualification affiche « Son contexte »').toBeVisible()
  await expect(card, '#2 Qualification affiche la valeur saisie').toContainText('SITU_E2E')

  // #1a — la valeur (non sauvée) survit au reload d'une action immédiate (tunnel → save + reload).
  await page.getByTestId('tab-apercu').click()
  await page.getByTestId('stage-INVITATION').click()
  await page.waitForLoadState('networkidle')
  await page.getByTestId('tab-details').click()
  await page.getByTestId('subtab-contexte').click()
  await expect(page.getByTestId('ctx-situation'), '#1 valeur survit au reload d’une action immédiate').toHaveValue('SITU_E2E')

  // #1b — filet keepalive : quitter sans sauver → le serveur a la valeur.
  await page.goto('/contacts', { waitUntil: 'networkidle' })
  await expect
    .poll(async () => page.evaluate(async (c) => {
      try { const r = await fetch('/api/contacts/' + c); return (await r.json())?.qualification?.situation ?? null } catch { return 'ERR' }
    }, cid), { message: '#1 auto-save au départ (keepalive) persistée', timeout: 10_000 })
    .toBe('SITU_E2E')

  // Nouveau filet : aucune exception JS non capturée pendant tout le parcours.
  expect(pageErrors, 'aucune exception JS non capturée').toEqual([])
})
