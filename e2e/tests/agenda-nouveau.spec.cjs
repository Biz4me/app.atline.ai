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

test('l’agenda mène au sélecteur de créneau, qui est une pleine page', async ({
  page,
  pageErrors,
}) => {
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

  // ── LE SÉLECTEUR ──
  await expect(page).toHaveURL(/\/agenda\/nouveau/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { level: 1, name: 'Quand ?' })).toBeVisible()

  // Une PLEINE PAGE : pas de barre du bas, la flèche pour seule sortie. On ne
  // doit pas pouvoir partir ailleurs d'une touche au milieu d'une prise.
  await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Retour à l’agenda' })).toBeVisible()

  // La bande des 14 jours, et un seul jour allumé.
  const jours = page.locator('a[href^="/agenda/nouveau?jour="]')
  await expect(jours).toHaveCount(14)
  await expect(page.locator('[aria-current="date"]')).toHaveCount(1)

  // ── 🔴 L'AGENDA GOOGLE EST VRAIMENT LU ───────────────────────────────
  //
  // C'est LE contrôle de toute la chaîne, et il tient en une absence. Si la
  // clé de chiffrement manquait à V2, si le jeton ne se renouvelait pas, ou
  // si Google refusait l'appel, `occupeGoogle` rendrait `null` — et cette
  // bannière apparaîtrait. Le compte de test a raccordé son agenda le
  // 30 juillet 2026 avec `calendar.readonly` : elle ne doit pas être là.
  //
  // ⚠️ Et c'est bien une ABSENCE qu'on vérifie, pas une présence : il n'y a
  // rien d'autre à l'écran qui dise « Google a répondu ».
  await expect(page.getByText(/agenda Google n’est pas raccordé/)).toHaveCount(0)

  await page.screenshot({ path: 'capture-creneaux.png', animations: 'disabled' })

  // ── Un créneau libre mène au formulaire, créneau porté ──
  const libre = page.locator('a[href^="/agenda/nouveau/quoi"]').first()
  await expect(libre).toBeVisible()
  const heure = (await libre.innerText()).split(/\s+/)[0].trim()
  await libre.click()

  await expect(page).toHaveURL(/\/agenda\/nouveau\/quoi\?date=.+&heure=/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { level: 1, name: 'Le rendez-vous' })).toBeVisible()

  // 🔴 LE « QUAND » N'EST PLUS DEMANDÉ, il est ANNONCÉ. Le redemander en deux
  // champs serait poser deux fois la même question sur deux écrans.
  await expect(page.locator('#date')).toHaveCount(0)
  await expect(page.locator('#heure')).toHaveCount(0)
  const corps = await page.locator('main').innerText()
  expect(corps, `le créneau ${heure} n’est pas annoncé`).toContain(heure)
  // Et il voyage réellement jusqu'au serveur.
  expect(await page.locator('form input[name="heure"]').inputValue()).toBe(heure)
  await expect(page.getByRole('link', { name: 'Choisir un autre créneau' })).toBeVisible()

  // 🔴 PLUS AUCUN `<select>` NATIF. C'est lui qui faisait dessiner la moitié
  // de l'écran par le système : bordure grise, coins carrés, et sur téléphone
  // une roulette qui monte du bas — à l'autre bout de l'endroit touché.
  await expect(page.locator('form select')).toHaveCount(0)
  for (const champ of ['contact', 'minutes', 'canal']) {
    await expect(page.locator(`form input[name="${champ}"]`)).toHaveCount(1)
  }
  await expect(page.locator('form [name="description"]')).toHaveCount(0)
  expect(await page.locator('form input[name="canal"]').inputValue()).toBe('AUTRE')

  // ── Le geste est AU RAS DU BAS, pas à 64 px du vide ──
  const enregistrer = page.getByRole('button', { name: 'Enregistrer' })
  await expect(enregistrer).toBeVisible()
  await enregistrer.click({ trial: true })
  const cadre = await enregistrer.boundingBox()
  expect(844 - (cadre.y + cadre.height), 'le bouton flotte au-dessus du vide').toBeLessThan(32)

  // ── 🔴 UNE SAISIE ET UN DÉROULANT SONT LE MÊME OBJET À L'ŒIL ──────────
  //
  // L'invariant pour lequel la classe `CHAMP` existe, et celui qui a lâché le
  // 5 novembre 2026 : la constante vivait dans un module `'use client'`, donc
  // la page SERVEUR en recevait une référence. L'attribut `class` des saisies
  // contenait le texte d'un message d'erreur — build vert, console muette —
  // et elles faisaient 21 px de haut sans bordure contre 47 pour le déroulant.
  const mesures = await page.evaluate(() => {
    const lire = (el) => {
      const s = getComputedStyle(el)
      return { h: Math.round(el.getBoundingClientRect().height), b: s.borderTopWidth }
    }
    return {
      saisie: lire(document.querySelector('#titre')),
      deroulant: lire(document.querySelector('form button[aria-haspopup="listbox"]')),
    }
  })
  expect(
    mesures.saisie.h,
    `saisie ${mesures.saisie.h} px contre ${mesures.deroulant.h} px pour le déroulant`,
  ).toBe(mesures.deroulant.h)
  expect(mesures.saisie.b, 'la saisie n’a pas de bordure').toBe(mesures.deroulant.b)
  expect(mesures.saisie.b, 'personne n’a de bordure').not.toBe('0px')

  await page.screenshot({ path: 'capture-agenda-nouveau.png', animations: 'disabled' })
  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})

test('le déroulant s’ouvre sous le champ, et reste dans l’écran', async ({ page, pageErrors }) => {
  await page.goto('/agenda/nouveau', { waitUntil: 'domcontentloaded' })
  await page.locator('a[href^="/agenda/nouveau/quoi"]').first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'Le rendez-vous' })).toBeVisible({
    timeout: 20_000,
  })

  // « Comment » est le DERNIER champ, donc le plus bas : c'est précisément
  // celui dont le panneau déborderait sous l'écran s'il ne savait pas
  // remonter. Le tester sur le premier champ ne prouverait rien.
  const bouton = page.getByRole('button', { name: /^Comment : / })
  await expect(bouton).toBeVisible()
  await bouton.click()

  const liste = page.getByRole('listbox')
  await expect(liste).toBeVisible({ timeout: 5_000 })
  // Les animations finies : une mesure prise pendant l'ouverture ment comme
  // une capture prise pendant l'ouverture.
  await page.evaluate(() =>
    document.getAnimations().forEach((a) => {
      try {
        a.finish()
      } catch {}
    }),
  )

  const champ = await bouton.boundingBox()
  const panneau = await liste.boundingBox()

  // 🔴 IL EST COLLÉ À SON CHAMP, d'un côté ou de l'autre. C'est tout le
  // propos : un `<select>` natif ouvre sa roulette au bas de l'écran, loin du
  // doigt. On n'impose pas le sens — seulement l'adjacence.
  const dessous = Math.abs(panneau.y - (champ.y + champ.height))
  const dessus = Math.abs(champ.y - (panneau.y + panneau.height))
  expect(
    Math.min(dessous, dessus),
    `le panneau est à ${Math.round(Math.min(dessous, dessus))} px de son champ`,
  ).toBeLessThan(12)

  // 🔴 ET ENTIÈREMENT DANS L'ÉCRAN. Un panneau qui dépasse est un panneau
  // dont on ne voit pas les derniers choix — et personne ne devine qu'il
  // faut faire défiler une liste qu'on ne sait pas tronquée.
  expect(panneau.y, 'le panneau sort par le haut').toBeGreaterThanOrEqual(0)
  expect(panneau.y + panneau.height, 'le panneau sort par le bas').toBeLessThanOrEqual(844)

  // Et il est aligné sur la largeur du champ, pas posé n'importe où.
  expect(Math.abs(panneau.x - champ.x)).toBeLessThanOrEqual(1)

  // ── 🔴 ET IL NE MORD PAS SUR LE GESTE DU JOUR ────────────────────────
  //
  // Mesuré le 5 novembre 2026 : il restait **4 px**. Ça passait par accident,
  // parce que la hauteur estimée du panneau surestimait la vraie et
  // compensait un plancher calculé au bas de l'ÉCRAN au lieu du haut de la
  // barre d'action. Deux erreurs qui s'annulent, donc une bombe à retardement
  // — une option de moins et le panneau s'ouvrait par-dessus « Enregistrer ».
  const geste = await page.getByRole('button', { name: 'Enregistrer' }).boundingBox()
  const chevauche = !(panneau.y + panneau.height <= geste.y || geste.y + geste.height <= panneau.y)
  expect(chevauche, 'le panneau recouvre le geste du jour').toBe(false)

  await page.screenshot({ path: 'capture-deroulant.png', animations: 'disabled' })

  // ── Choisir met à jour CE QUI PART AU SERVEUR, pas seulement l'étiquette ──
  await page.getByRole('option', { name: 'En visio' }).click()
  await expect(liste).toHaveCount(0)
  await expect(bouton).toHaveAccessibleName(/En visio/)
  expect(await page.locator('form input[name="canal"]').inputValue()).toBe('VISIO')

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
