// LA LIGNE DE CONTRÔLE DE CONTACTS (V2) — 17 novembre 2026.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/ligne-controle-v2.spec.cjs
//
// Chercher · Filtrer · Regarder, et ce que le retrait des deux titres
// emportait avec lui.

const { test, expect, ADRESSE_FICHE, SANS } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('l’écart n’est plus de zéro, et les trois commandes sont en place', async ({
  page,
  pageErrors,
}) => {
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-bande]')).toBeVisible({ timeout: 20_000 })

  /**
   * 🔴 LE GARDE DU JOUR. Mesuré avant le changement : la bande finissait à
   * 147 px et la ligne commençait à 147 px — **zéro**. Et ça ne se voyait
   * pas, parce que les pastilles sont à droite et plus courtes que les
   * cartes : l'œil comble le vide latéral et croit à une respiration.
   *
   * 🧭 On ne fige pas 12, on exige qu'il y ait de l'air. Figer la valeur
   * ferait tomber la sonde au premier réglage de goût ; exiger un écart
   * attrape le retour du collage, qui est le vrai défaut.
   */
  const ecarts = await page.evaluate(() => {
    const b = (s) => document.querySelector(s)?.getBoundingClientRect()
    const bande = b('[data-bande]')
    const recherche = b('[data-recherche]')
    const filtres = b('[data-filtres]')
    const premier = b('[data-contact]')
    return {
      bandeVersRecherche: Math.round(recherche.top - bande.bottom),
      filtresVersPremier: Math.round(premier.top - filtres.bottom),
      filtresGauche: Math.round(filtres.left),
      vuesGauche: Math.round(b('[data-vue="liste"]').left),
    }
  })
  console.log(`  bande → recherche : ${ecarts.bandeVersRecherche} px`)
  console.log(`  ligne → 1er contact : ${ecarts.filtresVersPremier} px`)
  expect(ecarts.bandeVersRecherche, 'les commandes sont collées aux cartes').toBeGreaterThanOrEqual(8)
  expect(ecarts.filtresVersPremier, 'la liste est collée aux commandes').toBeGreaterThanOrEqual(8)

  /* 🔴 Filtres À GAUCHE, Liste/Carte À DROITE — la demande, et pas l'inverse. */
  expect(ecarts.filtresGauche, 'Filtres n’est pas à gauche de Liste').toBeLessThan(ecarts.vuesGauche)

  /* ⚠️ L'icône ET le mot. Une icône seule se devine. */
  for (const [cle, mot] of [['liste', 'Liste'], ['carte', 'Carte']]) {
    const b = page.locator(`[data-vue="${cle}"]`)
    await expect(b).toContainText(mot)
    expect(await b.locator('svg').count(), `${mot} n’a pas son icône`).toBe(1)
  }
  expect(await page.locator('[data-filtres] svg').count(), 'Filtres n’a pas son icône').toBe(1)

  /**
   * 🔴 ET « FILTRER » A QUITTÉ LE MENU ☰. Le garder en plus du bouton ferait
   * deux déclencheurs pour un même geste à dix centimètres d'écart — la
   * faute que cet écran retire partout depuis le 5 novembre.
   */
  await page.locator('[data-menu], [aria-label*="enu"]').first().click({ timeout: 5000 }).catch(() => {})
  const dansLeMenu = await page.getByRole('link', { name: 'Filtrer', exact: true }).count()
  expect(dansLeMenu, '« Filtrer » est encore dans le menu ET sur l’écran').toBe(0)

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})

test('les deux titres sont partis, et l’ordre ne l’est pas', async ({ page, seed }) => {
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-contact]').first()).toBeVisible({ timeout: 20_000 })
  const corps = await page.locator('main').innerText()

  // ⚠️ Insensible à la casse : `innerText` applique `text-transform`, le
  // piège le mieux documenté de cette maison.
  expect(/qui t.attend/i.test(corps), '« Qui t’attend » est revenu').toBe(false)
  expect(/ce qui stagne passe devant/i.test(corps), 'le sous-titre est revenu').toBe(false)
  expect(/en mouvement/i.test(corps), '« En mouvement » est revenu').toBe(false)

  /**
   * 🔴 CE QUE LE TITRE DISAIT, LA LIGNE DOIT LE DIRE. Le groupe coupait à
   * 3 jours, le badge rouge n'apparaissait qu'à 7 : les contacts entre les
   * deux auraient perdu le titre sans rien gagner. Le contact jetable n'a
   * jamais été touché — il doit donc porter son badge.
   */
  const ligne = page.locator(`[data-contact][href$="${seed.cid}"]`)
  await expect(ligne, 'le contact jetable n’est pas dans la liste').toBeVisible()
  await expect(ligne, 'une personne qui attend ne le dit plus nulle part').toContainText('jamais')
})

test('la recherche filtre pendant qu’on tape, accents compris', async ({ page, pageErrors }) => {
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  const champ = page.locator('[data-recherche] input')
  await expect(champ).toBeVisible({ timeout: 20_000 })
  const avant = await page.locator('[data-contact]').count()
  expect(avant, 'aucun contact : la sonde ne mesure rien').toBeGreaterThan(3)

  /**
   * 🔴 SANS ACCENT NI CASSE. « Émilie » doit répondre à « emi » : personne ne
   * tape les accents dans un champ de recherche, et une recherche qui exige
   * l'orthographe exacte ne sert qu'à ceux qui connaissent déjà la réponse.
   * Le compte réel vient d'être vérifié : Émilie Fontaine, Strasbourg.
   */
  /**
   * 🔴 « ÉMILIE » ÉTAIT ÉCRITE EN DUR, ET ELLE N'EST PAS SUR TOUS LES COMPTES.
   * La sonde annonçait « emi ne trouve personne, alors qu'Émilie existe » —
   * une phrase qui affirme la base de données de quelqu'un. Elle ne pouvait
   * passer au vert que là où cette personne est.
   *
   * 🧭 ON PREND UN NOM ACCENTUÉ DANS LA LISTE, et on cherche sa version SANS
   * accent. La preuve est la même — personne ne tape les accents — mais elle
   * se refait sur n'importe quel compte, avec le nom qui s'y trouve.
   */
  /**
   * ⚠️ `[data-prenom]`, ET PAS LE `textContent` DE LA CARTE. Première version :
   * elle lisait la carte entière et récoltait « ETE2EjamaisDans ta liste, rien
   * d'envoyé — lance la conversation.Nouveau ». L'accent qu'elle trouvait
   * était celui d'« envoyé », dans une phrase d'état. Elle cherchait ensuite
   * les trois premières lettres de tout ça. Un nom se lit là où il est écrit.
   */
  const noms = await page.locator('[data-contact] [data-prenom]').evaluateAll((n) =>
    n.map((e) => (e.textContent || '').trim()),
  )
  const accentue = noms.find((t) => /[À-ÿ]/.test(t) && t.replace(/[^A-Za-zÀ-ÿ]/g, '').length >= 4)
  test.skip(!accentue, SANS('aucun nom accentué dans la liste : l’insensibilité aux accents est indémontrable'))
  const sansAccent = accentue
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 3)
    .toLowerCase()
  console.log(`  « ${sansAccent} » doit retrouver « ${accentue} »`)

  await champ.fill(sansAccent)
  await expect(page.locator('[data-compte-recherche]')).toBeVisible({ timeout: 10_000 })
  const apres = await page.locator('[data-contact]').count()
  console.log(`  « ${sansAccent} » : ${apres} sur ${avant}`)
  expect(apres, 'la recherche ne réduit rien').toBeLessThan(avant)
  expect(apres, `« ${sansAccent} » ne trouve personne, alors que « ${accentue} » est dans la liste`).toBeGreaterThan(0)
  await expect(page.locator('[data-contact]').first()).toContainText(accentue.slice(0, 4))

  /* ⚠️ Le compte est annoncé : une liste qui rétrécit sans dire de combien se
     lit « j'ai perdu des contacts ». */
  await expect(page.locator('[data-compte-recherche]')).toContainText(`${apres} sur ${avant}`)

  /* La croix est la nôtre : celle de Chrome viderait le champ sans passer par
     React, et l'état resterait à l'ancienne valeur. */
  await page.locator('[data-effacer]').click()
  await expect(page.locator('[data-compte-recherche]')).toHaveCount(0)
  expect(await page.locator('[data-contact]').count(), 'effacer ne rend pas la liste').toBe(avant)

  /* 🔴 RIEN TROUVÉ N'EST PAS « TU N'AS PERSONNE ». */
  await champ.fill('zzzzqxv')
  await expect(page.getByText('Personne de ce nom-là.')).toBeVisible({ timeout: 10_000 })
  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})

test('la recherche vaut aussi pour la carte', async ({ page }) => {
  await page.goto('/gens?vue=carte', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-carte]')).toBeVisible({ timeout: 30_000 })
  const avant = await page.locator('[data-point]').count()
  expect(avant, 'aucun point : la sonde ne mesure rien').toBeGreaterThan(3)

  // 🧭 Deux vues d'une même recherche qui ne montreraient pas la même chose,
  // c'est la faute de la bande qui comptait 10 quand la liste en montrait 9.
  await page.locator('[data-recherche] input').fill('Lyon')
  await expect
    .poll(() => page.locator('[data-point]').count(), {
      timeout: 15_000,
      message: 'la carte ignore la recherche',
    })
    .toBeLessThan(avant)
  const apres = await page.locator('[data-point]').count()
  console.log(`  « Lyon » : ${apres} points sur ${avant}`)
  expect(apres, '« Lyon » ne laisse aucun point').toBeGreaterThan(0)
})

test('toucher un point ouvre un résumé, avec Voir et Itinéraire', async ({ page, pageErrors }) => {
  await page.goto('/gens?vue=carte', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-carte] canvas')).toBeVisible({ timeout: 30_000 })

  /**
   * 🔴 LE POINT N'ENVOIE PLUS SUR LA FICHE. Sur une carte, on touche un
   * point pour SAVOIR QUI C'EST — pas pour quitter la carte et devoir
   * retrouver son cadrage. Si l'ancien comportement revenait, l'adresse
   * changerait : c'est ça qu'on surveille.
   */
  /**
   * LE DERNIER, ET PAS LE PREMIER. Les marqueurs sont posés dans l'ordre de
   * la liste et se recouvrent quand deux personnes sont voisines ; le
   * dernier est au-dessus, donc toujours touchable. Viser le premier
   * revenait a dependre d'un voisinage que la sonde ne controle pas -- la
   * faute deja corrigee sur `agenda-v2-touche`, qui cliquait `.first()`.
   */
  const point = page.locator('[data-point]').last()
  const qui = await point.getAttribute('aria-label')
  await point.click()

  const bulle = page.locator('.maplibregl-popup')
  await expect(bulle, 'aucun résumé ne s’ouvre').toBeVisible({ timeout: 10_000 })
  await expect(page, 'toucher un point a quitté la carte').toHaveURL(/vue=carte/)

  const texte = await bulle.innerText()
  console.log(`  ${qui} →\n    ${texte.replace(/\n/g, '\n    ')}`)
  await expect(bulle, 'le résumé ne porte pas « Voir »').toContainText('Voir')

  /**
   * 🔴 ET L'ITINÉRAIRE DIT OÙ IL EMMÈNE. 25 contacts sur 26 n'ont qu'une
   * ville : « Itinéraire » tout court laisserait croire qu'on connaît leur
   * rue. Le bouton porte donc sa destination, et il mène vraiment chez le
   * service de cartes.
   */
  const route = bulle.locator('[data-itineraire]')
  if (await route.count()) {
    await expect(route).toContainText('→')
    const href = await route.getAttribute('href')
    expect(href.startsWith('https://www.google.com/maps/dir/?api=1&destination='), href).toBe(true)
    expect(href.includes(' '), 'une espace brute dans l’URL : l’adresse sera coupée').toBe(false)
    await expect(route).toHaveAttribute('rel', /noreferrer/)
  } else {
    throw new Error('aucun itinéraire sur un point qui a forcément une ville')
  }

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})

test('Entrée ouvre la personne quand il n’en reste qu’une', async ({ page, pageErrors }) => {
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  const champ = page.locator('[data-recherche] input')
  await expect(champ).toBeVisible({ timeout: 20_000 })

  /**
   * ON CHERCHE JUSQU'A N'EN AVOIR QU'UNE. « emi » ne rend qu'Emilie
   * Fontaine sur ce compte -- verifie au moment d'ecrire. Si un homonyme
   * arrivait un jour, la sonde le DIRAIT au lieu de passer a cote.
   */
  await champ.fill('emi')
  await expect(page.locator('[data-compte-recherche]')).toContainText(/^1 sur /, { timeout: 10_000 })

  await champ.press('Enter')
  await expect(page, 'Entrée n’a pas ouvert la fiche').toHaveURL(ADRESSE_FICHE, {
    timeout: 20_000,
  })
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Émilie|Emilie/)
  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})

test('Entrée range le clavier quand il en reste plusieurs', async ({ page }) => {
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  const champ = page.locator('[data-recherche] input')
  await expect(champ).toBeVisible({ timeout: 20_000 })
  await champ.fill('so')
  await expect(page.locator('[data-compte-recherche]')).toBeVisible({ timeout: 10_000 })
  const combien = await page.locator('[data-contact]').count()
  expect(combien, 'il faut plusieurs résultats pour éprouver ce cas').toBeGreaterThan(1)

  await champ.press('Enter')
  // On reste sur la liste -- Entrée ne choisit pas a la place de quelqu'un
  // quand il y a plusieurs reponses possibles.
  await expect(page).toHaveURL(/\/gens(\?|$)/)
  // Et le champ a rendu le focus : c'est ce qui range le clavier.
  expect(await champ.evaluate((e) => e === document.activeElement), 'le clavier reste ouvert').toBe(
    false,
  )
  expect(await page.locator('[data-contact]').count(), 'la recherche a été perdue').toBe(combien)
})
