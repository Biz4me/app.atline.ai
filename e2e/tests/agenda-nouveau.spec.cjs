// POSER UN RENDEZ-VOUS À LA MAIN, ET L'HORLOGE QUI VA AVEC.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/agenda-nouveau.spec.cjs
//
// 🔴 CES TESTS N'ÉCRIVENT RIEN. L'agenda de production est à 0 rendez-vous à
// venir ; y déposer une ligne de test la mettrait sous les yeux de Patrice, et
// rien dans l'app ne sait l'effacer. On vérifie donc le FORMULAIRE et la
// CONVERSION, pas l'insertion — et la conversion est justement la seule partie
// qui pouvait se tromper en silence.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('l’agenda mène au formulaire, qui est une pleine page', async ({ page, pageErrors }) => {
  await page.goto('/agenda', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible({
    timeout: 20_000,
  })

  // ── Le geste du jour, et UN SEUL déclencheur ──
  //
  // ⚠️ L'état vide parle des deux chemins — « envoie ton lien, ou pose le
  // rendez-vous toi-même » — mais il ne doit pas poser un second bouton : le
  // geste du jour n'a qu'un déclencheur, c'est toute sa valeur.
  const ajouter = page.getByRole('link', { name: 'Ajouter un rendez-vous' })
  await expect(ajouter).toHaveCount(1)
  await ajouter.click({ trial: true })
  await ajouter.click()

  await expect(page).toHaveURL(/\/agenda\/nouveau/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { level: 1, name: /Nouveau rendez-vous/ })).toBeVisible()

  // ── Une PLEINE PAGE : pas de barre du bas, la flèche pour seule sortie ──
  // On ne doit pas pouvoir partir ailleurs d'une touche au milieu d'une saisie.
  await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Retour à l’agenda' })).toBeVisible()

  // ── 🔴 LE GESTE EST AU RAS DU BAS, PAS À 64 PX DU VIDE ──
  //
  // C'est la mesure de la correction : `ConteneurAction` posait sa hauteur en
  // dur, calée sur une barre du bas qui n'existe pas ici. Sans ce contrôle, le
  // bouton flotterait au-dessus d'une bande vide et personne ne saurait dire
  // pourquoi « ça fait bizarre ».
  const enregistrer = page.getByRole('button', { name: 'Enregistrer' })
  await expect(enregistrer).toBeVisible()
  await enregistrer.click({ trial: true })
  const cadre = await enregistrer.boundingBox()
  const vide = 844 - (cadre.y + cadre.height)
  expect(vide, `le bouton laisse ${Math.round(vide)} px de vide sous lui`).toBeLessThan(32)

  // ── Les champs, et CEUX QU'ON NE DEMANDE PAS ──
  await expect(page.locator('#date')).toHaveAttribute('required', '')
  await expect(page.locator('#heure')).toHaveAttribute('required', '')
  // La date part sur aujourd'hui ; l'heure reste vide, parce que c'est une
  // décision et pas un défaut.
  expect(await page.locator('#date').inputValue()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(await page.locator('#heure').inputValue()).toBe('')
  for (const id of ['#contact', '#titre', '#minutes', '#canal']) {
    await expect(page.locator(id)).toBeVisible()
  }
  // 🔴 AUCUN CHAMP QUI NE SE VOIT PAS SUR L'AGENDA. `description` existe en
  // base et n'est lu nulle part : le proposer inviterait à écrire dans le vide.
  //
  // ⚠️ `form [name=…]` ET NON `[name=…]` : le document porte un
  // `<meta name="description">` dans sa tête, que mon premier sélecteur
  // comptait comme un champ. Il a donc échoué — en accusant l'app d'un défaut
  // qui était dans la sonde.
  await expect(page.locator('form [name="description"]')).toHaveCount(0)

  // Et le canal ne présélectionne rien : l'agenda préfère se taire plutôt que
  // d'annoncer « Autre », qui n'apprend à personne.
  expect(await page.locator('#canal').inputValue()).toBe('AUTRE')

  await page.screenshot({ path: 'capture-agenda-nouveau.png', animations: 'disabled' })
  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})

test('le point de contrôle de la production est au vert', async ({ page }) => {
  // 🔴 `/api/verif` recoupe ce qui doit concorder — et depuis le 5 novembre
  // 2026, l'horloge qui ÉCRIT un rendez-vous et celle qui l'AFFICHE. Ce
  // contrôle-là tourne sur le SERVEUR, avec ses propres données de fuseaux :
  // un `tzdata` périmé là-bas donnerait un résultat juste sur ma machine et
  // faux là où ça compte. Il demande une session, donc il passe par ici.
  const r = await page.request.get('/api/verif')
  expect(r.status(), 'le point de contrôle doit répondre').toBe(200)
  const d = await r.json()
  expect(d.ok, `problèmes : ${(d.problemes ?? []).join(' | ')}`).toBe(true)
})
