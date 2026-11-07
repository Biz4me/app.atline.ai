// LA BANDE DE RACCOURCIS DE L'ACCUEIL.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/raccourcis.spec.cjs
//
// 🧭 CE QUE CETTE SONDE PROTÈGE VRAIMENT : que l'accueil et « Contacts » ne
// puissent pas dire deux choses différentes. Les deux écrans affichent les
// mêmes trois nombres, à un geste l'un de l'autre. S'ils divergeaient, aucun
// des deux ne serait croyable — et c'est exactement le défaut qui a fait
// réunir le plan du jour et `/coach/repeter` sur une source unique.
//
// ⚠️ ON NE VÉRIFIE PAS UNE VALEUR, ON VÉRIFIE UNE ÉGALITÉ. Écrire « 3
// partenaires » ici serait un test qui tombe le jour où Patrice ajoute un
// contact, sans qu'aucun défaut n'existe.

const { test, expect, suivre } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** Les cases de la bande, dans l'ordre de l'écran : [mot, nombre, adresse]. */
async function bande(page, dans) {
  return page.locator(`${dans} a[href^="/gens"]`).evaluateAll((as) =>
    as.map((a) => ({
      mot: a.textContent.replace(/\d+/g, '').trim(),
      combien: Number((a.textContent.match(/\d+/) ?? ['-1'])[0]),
      href: a.getAttribute('href'),
    })),
  )
}

test('l’accueil porte trois raccourcis, dans l’ordre voulu, et pas « Tous »', async ({
  page,
  pageErrors,
}) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('navigation', { name: 'Raccourcis' })).toBeVisible({
    timeout: 20_000,
  })

  const cases = await bande(page, 'nav[aria-label="Raccourcis"]')
  expect(cases.map((c) => c.mot), 'l’ordre demandé par Patrice').toEqual([
    'Partenaires',
    'Prospects',
    'Clients',
  ])

  // 🔴 PAS DE « TOUS ». Elle mènerait à `/gens` nu, que la barre du bas
  // atteint déjà d'une touche. Un second geste vers le même endroit est la
  // faute qui a fait supprimer le menu global.
  expect(cases.map((c) => c.href)).toEqual([
    '/gens?qui=partenaire',
    '/gens?qui=prospect',
    '/gens?qui=client',
  ])

  expect(pageErrors).toEqual([])
})

test('les trois nombres de l’accueil sont ceux de Contacts', async ({ page }) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('navigation', { name: 'Raccourcis' })).toBeVisible({
    timeout: 20_000,
  })
  const accueil = await bande(page, 'nav[aria-label="Raccourcis"]')

  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('navigation', { name: 'Populations' })).toBeVisible({
    timeout: 20_000,
  })
  const contacts = await bande(page, 'nav[aria-label="Populations"]')

  // La bande de Contacts porte « Tous » en plus, et son ordre est le sien.
  const par = Object.fromEntries(contacts.map((c) => [c.mot, c.combien]))
  for (const c of accueil) {
    expect(par[c.mot], `« ${c.mot} » diverge entre les deux écrans`).toBe(c.combien)
  }

  // Et le total se tient : les trois populations s'additionnent au « Tous ».
  // 🔴 Un prospect est ce qui n'est NI client NI partenaire — c'est ce qui
  // rend cette somme vraie. Compter une étiquette « prospect » la casserait.
  const somme = accueil.reduce((t, c) => t + c.combien, 0)
  expect(somme, 'les trois populations ne couvrent pas le carnet').toBe(par['Tous'])
})

test('un raccourci emmène bien sur la liste filtrée', async ({ page, pageErrors }) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  const lien = page.locator('nav[aria-label="Raccourcis"] a[href="/gens?qui=partenaire"]')
  await expect(lien).toBeVisible({ timeout: 20_000 })

  await suivre(lien, page, /\/gens\?qui=partenaire/)
  await expect(page.getByRole('heading', { name: 'Partenaires' })).toBeVisible({ timeout: 20_000 })

  expect(pageErrors).toEqual([])
})
