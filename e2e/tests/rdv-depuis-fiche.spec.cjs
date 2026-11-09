// PRENDRE UN RENDEZ-VOUS DEPUIS UNE FICHE.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/rdv-depuis-fiche.spec.cjs
//
// 🔴 ON NE CRÉE AUCUN RENDEZ-VOUS. Le contact jetable est supprimé au
// teardown ; un `Appointment` qui le référencerait pourrait faire échouer
// cette suppression et laisser un contact fantôme dans la base de Patrice.
// Ce qui a changé, c'est le CHEMIN jusqu'au formulaire — c'est donc lui qu'on
// mesure. `ajouterRendezVous` n'a pas été touché.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('la fiche propose le rendez-vous, et emmène la personne avec elle', async ({
  page,
  pageErrors,
  seed,
}) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  const porte = page.getByRole('link', { name: /Prendre un rendez-vous/ })
  await expect(porte).toBeVisible({ timeout: 20_000 })
  await expect(porte).toHaveAttribute('href', `/agenda/nouveau?contact=${seed.cid}`)

  await porte.click()
  await expect(page).toHaveURL(new RegExp(`/agenda/nouveau\\?contact=${seed.cid}$`), {
    timeout: 20_000,
  })

  // La personne reste sous les yeux pendant qu'on choisit.
  // ⚠️ `toContainText` lit la SOURCE : le surtitre est mis en capitales par
  // `text-transform`, mais le texte comparé est « Avec E2E ».
  await expect(page.locator('header')).toContainText('Avec E2E', { timeout: 20_000 })

  // 🔴 ET ELLE SURVIT À CHAQUE LIEN. Un paramètre qui tient sur la première
  // touche et tombe à la deuxième est pire que pas de paramètre : on croit
  // avoir dit avec qui, et le formulaire arrive vide.
  const jours = page.locator('a[href^="/agenda/nouveau?jour="]')
  await expect(jours.first()).toBeVisible()
  const sansContact = await jours.evaluateAll((n) =>
    n.map((e) => e.getAttribute('href')).filter((h) => !h.includes('contact=')),
  )
  expect(sansContact, `jours qui perdent la personne : ${sansContact.join(', ')}`).toHaveLength(0)

  // La flèche repart vers la FICHE, pas vers l'agenda : deux portes mènent
  // ici, une seule destination de retour renverrait ailleurs la moitié du
  // temps.
  await expect(page.getByRole('link', { name: /Retour à la fiche de E2E/ })).toHaveAttribute(
    'href',
    `/gens/${seed.cid}`,
  )

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toHaveLength(0)
})

test('le créneau choisi arrive sur un formulaire déjà rempli du bon nom', async ({
  page,
  seed,
}) => {
  await page.goto(`/agenda/nouveau?contact=${seed.cid}`, { waitUntil: 'domcontentloaded' })
  const creneaux = page.locator('a[href^="/agenda/nouveau/quoi?"]')
  await expect(creneaux.first()).toBeVisible({ timeout: 20_000 })
  await creneaux.first().click()

  await expect(page).toHaveURL(/\/agenda\/nouveau\/quoi\?/, { timeout: 20_000 })

  // 🔴 CE QUI SERAIT RÉELLEMENT ENVOYÉ, pas ce qui est écrit à l'écran. Le
  // déroulant pose un `<input type="hidden">` : c'est lui que le formulaire
  // soumet, donc c'est lui la preuve.
  await expect(page.locator('input[name="contact"]')).toHaveValue(seed.cid, { timeout: 20_000 })
  // Et ce que l'œil voit dit la même chose.
  await expect(page.getByRole('button', { name: /^Avec qui : / })).toContainText('E2E')
})

test('un identifiant qui n’est pas à soi tombe, en silence', async ({ page, seed }) => {
  // 🔴 L'IDENTIFIANT ARRIVE DU NAVIGATEUR : il ne prouve rien tout seul. Une
  // adresse forgée ne doit ni faire une erreur, ni — surtout — présélectionner
  // le contact de quelqu'un d'autre. Elle doit simplement ne rien faire.
  await page.goto('/agenda/nouveau?contact=cmaisnonvoyons0000000000', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.getByRole('heading', { level: 1, name: 'Quand ?' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByText(/couldn.t load|Application error/i)).toHaveCount(0)

  // Aucun surtitre « Avec … », et la flèche retourne à l'agenda.
  await expect(page.locator('header')).not.toContainText('Avec ')
  await expect(page.getByRole('link', { name: 'Retour à l’agenda' })).toBeVisible()

  // ⚠️ ET LA SONDE SAIT VOIR LA CHOSE : avec un VRAI identifiant, au même
  // endroit, le surtitre est là. Sans ce contrôle, « pas de surtitre » serait
  // vert même si le surtitre n'existait plus du tout.
  await page.goto(`/agenda/nouveau?contact=${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('header')).toContainText('Avec E2E', { timeout: 20_000 })
})
