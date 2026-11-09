// LES QUATRE GESTES DE LA FICHE V2, et l'icône d'Atlas.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/gestes-v2.spec.cjs
//
// 🔴 ON N'ÉCRIT QUE SUR LE CONTACT JETABLE. La fixture `seed` en crée un par
// test et le supprime : les contacts de Patrice sont sa matière première.

const { test, expect, toucher } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** Les quatre cartes, dans l'ordre du DOM. */
const gestes = (page) => page.locator('[data-geste]')
const geste = (page, nom) => page.locator(`[data-geste="${nom}"]`)

/** 🔴 CE QU'ON ATTEND, DÉCLARÉ. Une sonde qui ne dit pas combien d'éléments
 *  elle doit trouver passe au vert quand elle n'en trouve aucun — c'est ce
 *  qui a laissé deux sondes de hauteur mentir en même temps le 8 novembre. */
const ATTENDUS = ['Appeler', 'Simuler', 'SMS', 'E-mail']

test('les quatre gestes, dans l’ordre, et éteints sans coordonnée', async ({
  page,
  pageErrors,
  seed,
}) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })

  await expect(gestes(page)).toHaveCount(ATTENDUS.length)
  expect(
    await gestes(page).evaluateAll((n) => n.map((e) => e.getAttribute('data-geste'))),
  ).toEqual(ATTENDUS)

  // Le contact jetable n'a ni numéro ni adresse : trois cartes sur quatre
  // doivent être ÉTEINTES — ni liens morts, ni boutons qui crient au doigt.
  for (const nom of ['Appeler', 'SMS', 'E-mail']) {
    await expect(geste(page, nom)).toHaveAttribute('data-eteint', '')
    // ⚠️ Un `<span>` n'est pas un lien : c'est ça qu'on vérifie, pas la
    // couleur. Une carte grise qui navigue quand même serait le vrai défaut.
    expect(await geste(page, nom).evaluate((e) => e.tagName)).toBe('SPAN')
  }

  // 🔴 SIMULER EST TOUJOURS ALLUMÉ : `preparerRepetition` accepte un contact
  // sans recommandation et retombe sur l'exercice du point faible.
  await expect(geste(page, 'Simuler')).toHaveAttribute(
    'href',
    `/coach/repeter?contact=${seed.cid}`,
  )

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toHaveLength(0)
})

test('un numéro allume Appeler et SMS, et fait apparaître WhatsApp', async ({ page, seed }) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })

  // On renseigne le numéro PAR L'ÉCRAN, pas en base : c'est le chemin réel,
  // et il prouve au passage que « Ce qui manque » mène bien quelque part.
  const puce = page.locator('[data-manque="phone"]')
  await expect(puce).toBeVisible()
  await toucher(puce, page.getByRole('textbox').last())
  await page.getByRole('textbox').last().fill('+33 6 12 34 56 78')
  await page.getByRole('button', { name: 'Enregistrer' }).click()

  // 🔴 LE RECHARGEMENT EST LA SEULE PREUVE. Un état React qui a l'air
  // d'avoir enregistré ne dit rien du serveur.
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })

  // Les espaces tombent, le « + » reste : `tel:` et `sms:` en ont besoin.
  await expect(geste(page, 'Appeler')).toHaveAttribute('href', 'tel:+33612345678')
  await expect(geste(page, 'SMS')).toHaveAttribute('href', 'sms:+33612345678')
  for (const nom of ['Appeler', 'SMS']) {
    await expect(geste(page, nom)).not.toHaveAttribute('data-eteint', '')
  }

  // ⚠️ `wa.me` VEUT DES CHIFFRES SEULS. Un « + » ou une espace et WhatsApp
  // s'ouvre sur une erreur de numéro, ce qui ressemble à un bug de WhatsApp.
  await expect(
    page.getByRole('link', { name: /sur WhatsApp$/ }),
  ).toHaveAttribute('href', 'https://wa.me/33612345678')

  // ── LES CAPTURES, une fois les gestes ALLUMÉS ──
  // ⚠️ Ici et pas dans un test à part : une capture de la fiche vide
  // montrerait quatre cartes grises, c'est-à-dire pas ce qu'on veut regarder.
  // 🔴 REMONTER D'ABORD. La saisie du numéro a fait défiler la page ; un
  // `clip` part du haut du CADRE, pas du haut du document, et ma première
  // capture a donc montré le milieu de la fiche. Rien ne l'aurait dit : une
  // capture ratée est une image valide.
  await page.evaluate(() => window.scrollTo(0, 0))
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
    // Les animations figées, sinon la capture attrape une carte à mi-chemin —
    // la leçon du 8 novembre sur les mesures prises pendant une animation.
    await page.evaluate(() =>
      document.getAnimations().forEach((a) => {
        try {
          a.finish()
        } catch {}
      }),
    )
    await page.screenshot({
      path: `capture-gestes-${theme}.png`,
      clip: { x: 0, y: 0, width: 390, height: 430 },
      animations: 'disabled',
    })
  }
})

test('aucun doublon : une seule porte vers la simulation, et plus de geste du jour', async ({
  page,
  seed,
}) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })

  // 🔴 LA RÈGLE DE LA MAISON : jamais deux gestes vers le même endroit. La
  // carte teal menait là où mène désormais la deuxième carte.
  await expect(page.locator('a[href*="/coach/repeter"]')).toHaveCount(1)

  // Et le geste du jour « Appeler X » au-dessus de la barre a disparu : la
  // coquille l'écrit — « la page ne doit JAMAIS répéter ce geste ».
  await expect(page.getByRole('link', { name: /^Appeler .+/ })).toHaveCount(0)
})

test('l’en-tête porte l’identité, et la carte « qui c’est » n’est plus là', async ({
  page,
  seed,
}) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  const titre = page.getByRole('heading', { level: 1 })
  await expect(titre).toBeVisible({ timeout: 20_000 })

  // Le nom COMPLET, pas le prénom seul comme avant.
  await expect(titre).toHaveText('E2E Test')

  const entete = page.locator('header')
  // ⚠️ « Nouveau » ET NON « NOUVEAU ». Les capitales viennent d'un
  // `text-transform: uppercase`, qui ne touche que l'affichage : le texte
  // comparé ici est celui de la SOURCE. Le piège est déjà écrit dans
  // `references/pieges.md` du harnais, et je suis tombé dedans quand même.
  await expect(entete).toContainText('Nouveau')
  // Les initiales remontent avec le reste : c'est la seule information de
  // l'ancienne carte qui soit purement visuelle.
  await expect(entete).toContainText('ET')

  // 🔴 ET LE NOM N'EST PLUS ÉCRIT DEUX FOIS. La carte « qui c'est » répétait
  // juste sous l'en-tête ce que l'en-tête disait déjà.
  expect(await page.getByText('E2E Test', { exact: true }).count()).toBe(1)
})

test('les quatre cartes tiennent, et à la MÊME hauteur, de 320 à 430', async ({ page, seed }) => {
  // 🔴 JAMAIS UNE SEULE LARGEUR. On s'est trompé deux fois là-dessus — la
  // liste des contacts, puis les titres de module — et les deux fois la
  // sonde était verte à 390.
  for (const largeur of [320, 360, 390, 430]) {
    await page.setViewportSize({ width: largeur, height: 844 })
    await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })
    await expect(gestes(page)).toHaveCount(ATTENDUS.length)

    const boites = await gestes(page).evaluateAll((n) =>
      n.map((e) => {
        const r = e.getBoundingClientRect()
        return { h: Math.round(r.height), droite: Math.round(r.right) }
      }),
    )
    const hauteurs = [...new Set(boites.map((b) => b.h))]
    expect(hauteurs, `à ${largeur} px, hauteurs différentes : ${hauteurs.join(', ')}`).toHaveLength(1)

    // Rien ne déborde : la rangée ne défile pas, un cinquième élément hors
    // écran serait invisible et inatteignable.
    const debord = Math.max(...boites.map((b) => b.droite))
    expect(debord, `à ${largeur} px, la rangée sort de ${debord - largeur} px`).toBeLessThanOrEqual(
      largeur,
    )

    // ⚠️ ET LE VERBE N'EST PAS ROGNÉ. `truncate` empêche le retour à la
    // ligne, mais une carte trop étroite afficherait « E-ma… » : c'est
    // lisible pour le code et faux pour l'œil.
    const rogne = await gestes(page).evaluateAll((n) =>
      n
        .map((e) => e.querySelector('span.truncate'))
        .filter((s) => s && s.scrollWidth > s.clientWidth + 1)
        .map((s) => s.textContent),
    )
    expect(rogne, `à ${largeur} px, verbes rognés : ${rogne.join(', ')}`).toHaveLength(0)
  }
})

test('Atlas et Contacts n’ont plus le même glyphe', async ({ page, seed }) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  const barre = page.getByRole('navigation', { name: 'Navigation principale' })
  await expect(barre).toBeVisible({ timeout: 20_000 })

  // 🔴 LE DÉFAUT ÉTAIT MUET : faute de cas `Atlas`, `icones.tsx` rendait son
  // REPLI — les deux silhouettes de « Contacts ». Un repli est un rendu
  // valide, donc rien ne pouvait échouer.
  const dessin = async (nom) =>
    barre.getByRole('link', { name: nom }).locator('svg').innerHTML()

  const atlas = await dessin('Atlas')
  const contacts = await dessin('Contacts')
  expect(atlas.length, 'le glyphe d’Atlas est vide').toBeGreaterThan(40)
  expect(atlas).not.toBe(contacts)
})
