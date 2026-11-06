// LES CONTACTS : un geste pour ajouter, un menu qui filtre ou montre les trous.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/contacts.spec.cjs
//
// 🔴 AUCUNE ÉCRITURE. Les contacts de Patrice sont sa matière première et
// rien dans l'app ne sait en effacer un. On vérifie le formulaire, le filtre
// et l'écran des manques — pas la création.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('le geste mène au formulaire, en pleine page', async ({ page, pageErrors }) => {
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: 'Contacts' })).toBeVisible({
    timeout: 20_000,
  })

  // 🔴 UN SEUL DÉCLENCHEUR. Le bouton « + Ajouter un nom » qui vivait dans la
  // liste a été retiré : deux gestes pour une même action, c'est la faute
  // déjà corrigée sur l'accueil et sur Formation.
  const ajouter = page.getByRole('link', { name: 'Ajouter un contact' })
  await expect(ajouter).toHaveCount(1)
  await expect(page.getByRole('button', { name: /Ajouter un nom/ })).toHaveCount(0)
  await ajouter.click({ trial: true })
  await ajouter.click()

  await expect(page).toHaveURL(/\/gens\/nouveau/, { timeout: 20_000 })
  // ⚠️ Sans population choisie, c'est « un prospect » : c'est le défaut de
  // la base comme du métier, et le mot le dit plutôt que de rester vague.
  await expect(page.getByRole('heading', { level: 1, name: 'Ajouter un prospect' })).toBeVisible()

  // Pleine page : pas de barre du bas, la flèche pour seule sortie — on ne
  // part pas ailleurs d'une touche au milieu d'une saisie.
  await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Retour aux contacts' })).toBeVisible()

  // ── 🔴 SEUL LE PRÉNOM EST OBLIGATOIRE ────────────────────────────────
  // Un champ obligatoire qu'on ne connaît pas encore, c'est un contact qu'on
  // n'enregistre pas — et un contact perdu coûte plus cher qu'une fiche
  // incomplète.
  await expect(page.locator('#prenom')).toHaveAttribute('required', '')
  for (const id of ['#nom', '#telephone', '#email']) {
    await expect(page.locator(id)).toBeVisible()
    expect(await page.locator(id).getAttribute('required'), `${id} exigé`).toBeNull()
  }

  // Les deux axes sont demandés, et ce sont des déroulants à nous.
  await expect(page.locator('form select')).toHaveCount(0)
  for (const champ of ['marche', 'etape']) {
    await expect(page.locator(`form input[name="${champ}"]`)).toHaveCount(1)
  }
  // ⚠️ L'étape part sur « Nouveau » et le marché sur RIEN : on ne devine pas
  // comment quelqu'un connaît une personne qu'il vient de nommer.
  expect(await page.locator('form input[name="etape"]').inputValue()).toBe('NOUVEAU')
  expect(await page.locator('form input[name="marche"]').inputValue()).toBe('')

  // Le geste au ras du bas, pas à 64 px du vide.
  const envoyer = page.getByRole('button', { name: /^Ajouter ce / })
  await envoyer.click({ trial: true })
  const cadre = await envoyer.boundingBox()
  expect(844 - (cadre.y + cadre.height), 'le bouton flotte au-dessus du vide').toBeLessThan(32)

  await page.screenshot({ path: 'capture-contact-nouveau.png', animations: 'disabled' })
  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})

test('le filtre annonce ce qu’il donnera, et la liste dit qu’elle est filtrée', async ({
  page,
  pageErrors,
}) => {
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: 'Contacts' })).toBeVisible({
    timeout: 20_000,
  })
  const total = await page.locator('main a[href="#"], main').count()

  await page.getByRole('button', { name: /^Menu Contacts$/ }).click()
  await expect(page.getByRole('link', { name: 'Ce qui manque' })).toHaveCount(1)
  await page.getByRole('link', { name: 'Filtrer' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Filtrer' })).toBeVisible({
    timeout: 20_000,
  })
  await page.screenshot({ path: 'capture-contact-filtre.png', animations: 'disabled' })

  // 🔴 LE BOUTON DIT LE RÉSULTAT, PAS L'ACTION. « Appliquer » ne renseigne
  // sur rien ; un compte dit ce qui va se passer, et surtout quand il ne va
  // rien se passer.
  //
  // ⚠️ ET ON NE FIGE AUCUN CHIFFRE. Ce contrôle exigeait d'abord « Personne
  // ne correspond » sur l'étape Leader — vrai le 6 novembre à 11 h, faux à
  // midi quand l'import a posé un Leader. **Une sonde qui fige un fait sur
  // les données le défend contre la réalité.** L'invariant, lui, survit :
  // ce que le bouton ANNONCE est ce que la liste MONTRE.
  const geste = page.getByRole('link', { name: /Voir|Personne ne correspond/ })
  await expect(geste).toHaveCount(1)

  await page.getByRole('link', { name: 'Closing', exact: true }).click()
  // 🔴 ON ATTEND L'ÉTAT QU'ON VIENT DE DEMANDER, pas un élément qui était
  // déjà là. Le bouton est visible AVANT comme APRÈS la navigation : une
  // attente sur sa visibilité passe instantanément, et on lit le compte de
  // la page d'avant.
  await expect(page).toHaveURL(/\/gens\/filtrer\?etape=CLOSING/, { timeout: 15_000 })

  const annonce = await page.getByRole('link', { name: /Voir|Personne ne correspond/ }).innerText()
  const promis = Number(annonce.match(/\d+/)?.[0] ?? 0)

  await page.getByRole('link', { name: /Voir|Personne ne correspond/ }).click()
  await expect(page).toHaveURL(/\/gens\?etape=CLOSING/, { timeout: 20_000 })

  // 🔴 LE COMPTE NE MENT PAS. Deux calculs séparés, et le bouton promettrait
  // 3 là où la liste en montre 2 — c'est pour ça que `lib/filtre-gens.ts` est
  // écrit une fois.
  const montres = await page.locator('[data-contact]').count()
  expect(montres, `annoncé ${promis}, montré ${montres}`).toBe(promis)

  // 🔴 LA LISTE DIT QU'ELLE EST FILTRÉE. Sans ça, une liste réduite se lit
  // « j'ai perdu des contacts » — la panne la plus inquiétante qu'on puisse
  // infliger à quelqu'un dont le carnet EST le métier.
  const corps = await page.locator('main').innerText()
  expect(corps, 'rien ne dit que la liste est filtrée').toMatch(/Closing/)
  await expect(page.getByRole('link', { name: 'Tout voir' })).toBeVisible()

  // Et on en sort.
  await page.getByRole('link', { name: 'Tout voir' }).click()
  await expect(page).toHaveURL(/\/gens$/, { timeout: 20_000 })

  expect(total).toBeGreaterThan(0)
  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})

test('ce qui manque compte des trous réels', async ({ page, pageErrors }) => {
  await page.goto('/gens/incomplets', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: 'Ce qui manque' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Retour aux contacts' })).toBeVisible()

  // ⚠️ Mesuré le 6 novembre 2026 : sur 13 contacts en base, 2 ont un métier
  // et 5 une ville. Le compte de test en a 3, tous incomplets. Si cet écran
  // n'affichait rien, c'est qu'il ne compte pas ce qu'il prétend compter.
  const dit = await page.locator('main').innerText()
  expect(dit, 'aucun manque trouvé alors que la base en est pleine').toMatch(/il manque/)

  await page.screenshot({ path: 'capture-contact-manques.png', animations: 'disabled' })
  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})

test('la bande des trois populations : le titre et le geste suivent', async ({
  page,
  pageErrors,
}) => {
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })

  // 🔴 PAR DÉFAUT, « TOUS » — et le titre de l'écran reste « Contacts ».
  // Une porte à trois choix casserait « ce qui stagne passe devant » :
  // l'écran demanderait « tu veux voir qui ? » au lieu de répondre.
  await expect(page.getByRole('heading', { level: 1, name: 'Contacts' })).toBeVisible({
    timeout: 20_000,
  })
  const bande = page.locator('main a[href^="/gens"]').filter({ hasText: /Tous|Prospects|Clients|Partenaires/ })
  await expect(bande).toHaveCount(4)
  await expect(page.locator('[aria-current="true"]').first()).toContainText('Tous')

  // 🔴 LES COMPTES S'ADDITIONNENT. Si « prospect » voulait dire deux choses
  // selon l'endroit, les trois populations ne feraient pas le total — et
  // personne ne saurait laquelle a raison.
  const nombres = await bande.evaluateAll((as) =>
    as.map((a) => Number((a.textContent || '').match(/\d+/)?.[0] ?? -1)),
  )
  expect(nombres.every((n) => n >= 0), 'une pastille sans compte').toBe(true)
  expect(nombres[1] + nombres[2] + nombres[3], 'les trois ne font pas le total').toBe(nombres[0])

  // ── Le titre ET le geste suivent la pastille ──
  await page.getByRole('link', { name: /Partenaires/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Partenaires' })).toBeVisible({
    timeout: 20_000,
  })
  // ⚠️ Regarder ses partenaires et toucher « ajouter un contact » pour
  // obtenir un prospect serait un petit mensonge.
  const geste = page.getByRole('link', { name: 'Ajouter un partenaire' })
  await expect(geste).toHaveCount(1)
  await page.screenshot({ path: 'capture-contact-bande.png', animations: 'disabled' })

  // Et le formulaire arrive avec la bonne population ET ses propres étapes.
  await geste.click()
  await expect(page.getByRole('heading', { level: 1, name: 'Ajouter un partenaire' })).toBeVisible({
    timeout: 20_000,
  })
  expect(await page.locator('form input[name="type"]').inputValue()).toBe('partenaire')
  // 🔴 Les étapes sont celles des PARTENAIRES, pas le tunnel prospect.
  expect(await page.locator('form input[name="etape"]').inputValue()).toBe('DEMARRAGE')
  await page.getByRole('button', { name: /^Comment|^Où il en est/ }).first().click().catch(() => {})

  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})

test('importer : on regarde avant d’écrire, et rien n’est écrit en regardant', async ({
  page,
  pageErrors,
}) => {
  // 🔴 CETTE SONDE N'ÉCRIT RIEN. Elle s'arrête à l'aperçu — qui est
  // justement la moitié qu'on veut garantir : voir avant de toucher.
  // L'aller-retour complet (création, mise à jour partielle, vérification
  // que rien n'est effacé) a été joué une fois, à la main, sur un contact
  // d'essai supprimé ensuite.
  await page.goto('/gens/importer', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: 'Importer' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toHaveCount(0)

  const T = (l) => l.map((x) => x.join('\t')).join('\n')
  await page.locator('textarea').fill(
    T([
      ['Prénom', 'Nom', 'Marché', 'Couleur chaussette'],
      ['Aperçu', 'Seulement', 'Tiède', 'rayée'],
      ['Ligne', 'Fautive', 'Bouillant', ''],
      ['', 'Sans prénom', 'Chaud', ''],
    ]),
  )
  await page.getByRole('button', { name: /Regarder/ }).click()

  // ⚠️ Une ligne bonne, deux refusées — et chacune dit POURQUOI.
  //
  // ⚠️ 30 s ET NON 15 : ce qu'on attend ici n'est pas un rendu, c'est un
  // ALLER-RETOUR SERVEUR. Lancée seule la sonde passait, et elle a lâché une
  // fois dans la suite complète — un délai taillé pour un rendu mesure mal un
  // appel qui attend la base sous charge.
  await expect(page.getByText(/1 nouveau, 0 mis à jour/)).toBeVisible({ timeout: 30_000 })
  const dit = await page.locator('main').innerText()
  // 🔴 On nomme la valeur ET la colonne : « ça n'a pas marché » ne se corrige
  // pas, « Bouillant n'est pas attendu pour Marché » si.
  expect(dit, 'la valeur inconnue n’est pas nommée').toMatch(/Bouillant.+Marché/s)
  expect(dit, 'le prénom manquant n’est pas signalé').toMatch(/il manque le prénom/)
  // ⚠️ Une colonne qu'on ne sait pas lire se DIT. La taire laisserait croire
  // qu'elle a été prise en compte.
  expect(dit, 'la colonne inconnue n’est pas signalée').toMatch(/Couleur chaussette/)

  // 🔴 ET RIEN N'A ÉTÉ ÉCRIT : le bouton d'écriture est un SECOND geste, qu'on
  // ne touche pas ici. On vérifie que le carnet n'a pas bougé.
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  expect(await page.locator('main').innerText(), 'regarder a écrit').not.toMatch(/Aperçu/)

  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})

test('le prochain pas est une phrase française, même sans dernier échange', async ({
  page,
  pageErrors,
}) => {
  // 🔴 VU À L'ÉCRAN, PAS SUPPOSÉ. Après l'import de trente contacts dont
  // aucun n'avait de dernier échange, la liste affichait :
  //
  //   « Partenaire sans nouvelles depuis jamais contacté »
  //   « Client sans contact jamais contacté »
  //
  // Une seule variable portait deux grammaires. Le défaut dormait depuis le
  // début : il a fallu des contacts SANS date pour qu'il se voie.
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: 'Contacts' })).toBeVisible({
    timeout: 20_000,
  })
  const dit = await page.locator('main').innerText()

  expect(dit, 'deux grammaires dans la même phrase').not.toMatch(/depuis jamais/)
  expect(dit, '« sans contact jamais contacté »').not.toMatch(/sans (nouvelles|contact) jamais/)
  // ⚠️ Et la faute qui existait MÊME avec une date.
  expect(dit, '« depuis il y a N jours »').not.toMatch(/depuis il y a/)

  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})
