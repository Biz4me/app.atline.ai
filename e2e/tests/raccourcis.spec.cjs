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

/**
 * Les cases de la bande, dans l'ordre de l'écran.
 *
 * ⚠️ UNE CASE PEUT PORTER UN RAPPORT depuis le 14 novembre 2026 — « 33/34 ».
 * Le texte rendu est donc `33/34Sans échange`, et l'ancienne lecture
 * (`replace(/\d+/g,'')`) en tirait un mot `/Sans échange` : un test qui
 * échoue pour une raison illisible est à peine mieux qu'un test faux.
 */
async function bande(page, dans) {
  return page.locator(`${dans} a[href^="/gens"]`).evaluateAll((as) =>
    as.map((a) => {
      const m = a.textContent.match(/^(\d+)(?:\/(\d+))?(.*)$/) ?? []
      return {
        mot: (m[3] ?? a.textContent).trim(),
        combien: Number(m[1] ?? -1),
        sur: m[2] ? Number(m[2]) : null,
        href: a.getAttribute('href'),
      }
    }),
  )
}

test('l’accueil porte quatre raccourcis, dans l’ordre voulu, et pas « Tous »', async ({
  page,
  pageErrors,
}) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('navigation', { name: 'Raccourcis' })).toBeVisible({
    timeout: 20_000,
  })

  const cases = await bande(page, 'nav[aria-label="Raccourcis"]')
  /**
   * 🔴 « SANS ÉCHANGE » EN PREMIER, ET C'EST TOUT L'ARGUMENT (14 nov 2026).
   * Le 12 novembre cette bande avait été DESCENDUE parce qu'elle flattait :
   * « 22 prospects, 6 clients » quand presque personne n'a jamais reçu un
   * mot. Patrice l'a fait remonter en réclamant *« 33 sur 34 »* — le rapport
   * mis devant, elle commence par ce qui ne va pas. Remettre cette case
   * ailleurs que devant rendrait la bande flatteuse à nouveau.
   */
  expect(cases.map((c) => c.mot), 'l’ordre demandé par Patrice').toEqual([
    'Sans échange',
    'Partenaires',
    'Prospects',
    'Clients',
  ])

  // 🔴 PAS DE « TOUS ». Elle mènerait à `/gens` nu, que la barre du bas
  // atteint déjà d'une touche. Un second geste vers le même endroit est la
  // faute qui a fait supprimer le menu global.
  // ⚠️ ET AUCUNE NE MÈNE À `/a-faire` : le « Tout voir » du rail juste en
  // dessous y va déjà. C'est pour ça que la première case a demandé un
  // FILTRE plutôt qu'un raccourci.
  expect(cases.map((c) => c.href)).toEqual([
    '/gens?attente=jamais',
    '/gens?qui=partenaire',
    '/gens?qui=prospect',
    '/gens?qui=client',
  ])

  expect(pageErrors).toEqual([])
})

test('les nombres de l’accueil sont ceux de Contacts', async ({ page }) => {
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
  const populations = accueil.filter((c) => c.mot in par)
  expect(populations.length, 'aucune population commune : la sonde ne compare rien').toBe(3)
  for (const c of populations) {
    expect(par[c.mot], `« ${c.mot} » diverge entre les deux écrans`).toBe(c.combien)
  }

  // Et le total se tient : les trois populations s'additionnent au « Tous ».
  // 🔴 Un prospect est ce qui n'est NI client NI partenaire — c'est ce qui
  // rend cette somme vraie. Compter une étiquette « prospect » la casserait.
  const somme = populations.reduce((t, c) => t + c.combien, 0)
  expect(somme, 'les trois populations ne couvrent pas le carnet').toBe(par['Tous'])

  /**
   * 🔴 ET LE DÉNOMINATEUR DU RAPPORT EST CE MÊME CARNET. « 33 sur 34 » ne
   * veut dire quelque chose que si 34 est bien l'effectif total — un rapport
   * dont le bas est faux est pire qu'un compte nu, parce qu'il a l'air d'une
   * mesure. C'est la seule chose que la bande affirme et qu'elle ne peut pas
   * vérifier toute seule.
   */
  const rapport = accueil.find((c) => c.sur !== null)
  expect(rapport, 'la case « 33 sur 34 » a perdu son rapport').toBeTruthy()
  expect(rapport.sur, 'le dénominateur du rapport n’est pas l’effectif du carnet').toBe(par['Tous'])
  expect(
    rapport.combien,
    'le rapport annonce plus de gens sans échange qu’il n’y a de contacts',
  ).toBeLessThanOrEqual(rapport.sur)
})

test('un raccourci emmène bien sur la liste filtrée', async ({ page, pageErrors }) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  const lien = page.locator('nav[aria-label="Raccourcis"] a[href="/gens?qui=partenaire"]')
  await expect(lien).toBeVisible({ timeout: 20_000 })

  await suivre(lien, page, /\/gens\?qui=partenaire/)
  await expect(page.getByRole('heading', { name: 'Partenaires' })).toBeVisible({ timeout: 20_000 })

  expect(pageErrors).toEqual([])
})
