// LA FICHE CONTACT DE V2 : une page, et chaque champ se corrige sur place.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/fiche-v2.spec.cjs
//
// 🔴 ON N'ÉCRIT QUE SUR LE CONTACT JETABLE. La fixture `seed` en crée un au
// démarrage et le supprime à la fin : les contacts de Patrice sont sa matière
// première, et l'app ne sait pas en effacer un.

const { test, expect, toucher } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** La rangée d'un champ, fermée : c'est le bouton qui porte son repère. */
const rangee = (page, cle) => page.locator(`[data-champ="${cle}"]`)

test('une LIGNE mène à une PAGE, et la page rend vraiment', async ({ page, pageErrors, seed }) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })

  // 🔴 LA PREUVE QU'UNE PAGE EST RENDUE, pas seulement servie. Un composant
  // client qui reçoit ce qu'il ne peut pas recevoir rend « This page couldn't
  // load » avec un code 200 : c'est arrivé sur /gens le 6 novembre 2026, en
  // production, sans que le build ni le typecheck n'aient rien dit.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText(/couldn.t load|Application error/i)).toHaveCount(0)

  // Une sous-page d'un lieu : la flèche ET la barre du bas. Ce n'est pas un
  // détour ouvert depuis un menu, on doit pouvoir partir ailleurs sans
  // d'abord faire marche arrière.
  await expect(page.getByRole('link', { name: 'Retour aux contacts' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible()

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toHaveLength(0)
})

test('la liste ne s’ouvre plus en feuille', async ({ page, seed }) => {
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  const lignes = page.locator('[data-contact]')
  await expect(lignes.first()).toBeVisible({ timeout: 20_000 })

  // ⚠️ `toBeVisible` NE DÉTECTE PAS L'OCCULTATION : seul `click({trial:true})`
  // le fait. La leçon date du 5 novembre et elle vaut ici aussi.
  await lignes.first().click({ trial: true })
  await lignes.first().click()

  // Une PAGE : l'URL change. Une feuille aurait laissé /gens affiché.
  await expect(page).toHaveURL(/\/gens\/[a-z0-9]+$/i, { timeout: 20_000 })
})

test('un champ se corrige sur place, et ça TIENT au rechargement', async ({ page, seed }) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })

  // ── 🔴 UN CHAMP VIDE NE S'AFFICHE PAS ────────────────────────────────
  // Le contact jetable n'a pas de métier : sa rangée ne doit pas être là.
  // Vingt-deux rangées qui disent « À renseigner » font une fiche qui
  // réclame au lieu de renseigner.
  await expect(rangee(page, 'profession')).toHaveCount(0)

  // …et « Ce qui manque » le nomme, en français, et le rend touchable.
  const puce = page.locator('[data-manque="profession"]')
  await expect(puce).toBeVisible()
  // ⚠️ `toucher` et non `click` : voir fixtures.cjs — un clic peut arriver
  // avant que React n'ait attaché son écouteur, et il est perdu en silence.
  await toucher(puce, page.getByRole('textbox').last())

  const valeur = `Boulanger ${Date.now() % 100000}`
  await page.getByRole('textbox').last().fill(valeur)
  await page.getByRole('button', { name: 'Enregistrer' }).click()

  // La rangée reprend sa place, fermée, avec la valeur.
  await expect(rangee(page, 'profession')).toBeVisible({ timeout: 20_000 })
  await expect(rangee(page, 'profession')).toContainText(valeur)

  // 🔴 LA SEULE PREUVE QUI COMPTE : le rechargement. Un état React qui a
  // l'air d'avoir enregistré ne prouve rien du serveur — c'est exactement la
  // classe de défaut que ce harnais existe pour attraper.
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(rangee(page, 'profession')).toContainText(valeur, { timeout: 20_000 })

  // Et il n'est plus dans « Ce qui manque » : les deux ne peuvent pas se
  // contredire, puisqu'ils lisent le même calcul.
  await expect(page.locator('[data-manque="profession"]')).toHaveCount(0)
})

test('un champ n’est jamais proposé à deux endroits', async ({ page, seed }) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })

  const enHaut = await page.locator('[data-manque]').evaluateAll((n) =>
    n.map((e) => e.getAttribute('data-manque')),
  )
  const enBas = await page.locator('[data-ajouter]').evaluateAll((n) =>
    n.map((e) => e.getAttribute('data-ajouter')),
  )

  // La sonde doit prouver qu'elle sait TROUVER : sans ça, deux listes vides
  // passeraient aussi bien qu'une page correcte.
  expect(enHaut.length, '« Ce qui manque » devrait nommer des champs').toBeGreaterThan(0)
  expect(enBas.length, '« Ajouter autre chose » devrait rester non vide').toBeGreaterThan(0)

  // 🔴 Vu en production le 6 novembre 2026 : « Téléphone », « E-mail »,
  // « Marché », « Couleur DISC » et « Métier » étaient proposés DEUX FOIS sur
  // la même page, dans deux styles différents. Deux déclencheurs pour un même
  // geste, sans qu'on sache lequel est le bon.
  const deuxFois = enHaut.filter((c) => enBas.includes(c))
  expect(deuxFois, `proposés à deux endroits : ${deuxFois.join(', ')}`).toHaveLength(0)
})

test('le geste dominant apparaît avec le numéro, et ne se dédouble pas', async ({ page, seed }) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })

  // Sans numéro, pas de bouton d'appel : un geste dominant qui ne mène nulle
  // part occupe la place où l'œil a appris à trouver le vrai.
  await expect(page.locator('a[href^="tel:"]')).toHaveCount(0)

  await toucher(page.locator('[data-manque="phone"]'), page.getByRole('textbox').last())
  await page.getByRole('textbox').last().fill('0612345678')
  await page.getByRole('button', { name: 'Enregistrer' }).click()

  const appel = page.locator('a[href^="tel:"]')
  await expect(appel).toHaveCount(1, { timeout: 20_000 })
  await expect(appel).toHaveAttribute('href', 'tel:0612345678')

  // 🔴 UN SEUL DÉCLENCHEUR. Le numéro principal n'a PAS de lien d'appel dans
  // sa rangée : le geste du bas le porte déjà. Deux gestes pour une même
  // action, c'est la faute corrigée sur l'accueil et sur Formation.
  await expect(appel).toHaveCount(1)
})

test('un déroulant ne propose que les étapes de SA population', async ({ page, seed }) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })

  // Le contact jetable est un PROSPECT.
  // ⚠️ FERMÉE, une liste est une rangée comme les autres : on la trouve par
  // son repère, pas par le libellé « Étape : Nouveau » du déroulant — qui
  // n'existe plus qu'une fois la rangée ouverte.
  const rangeeEtape = page.locator('[data-champ="etape"]')
  await expect(rangeeEtape).toBeVisible()
  const options = page.getByRole('option')
  await toucher(rangeeEtape, options.first())
  await expect(options.filter({ hasText: 'Invitation' })).toHaveCount(1)
  // 🔴 « Ambassadeur » est une étape de CLIENT. L'offrir ici écrirait un
  // stade de client sur un prospect, et plus aucun écran ne saurait quoi en
  // dire — le plan du jour lit l'étape pour fabriquer le prochain pas.
  await expect(options.filter({ hasText: 'Ambassadeur' })).toHaveCount(0)
  await expect(options.filter({ hasText: 'Leader' })).toHaveCount(0)
})

test('la fiche d’un contact qui n’est pas le sien n’existe pas', async ({ page }) => {
  // 🔴 Un identifiant vient de l'URL. Lire puis comparer laisserait fuiter
  // l'existence d'une fiche par la différence entre « pas à toi » et « pas
  // là ». Les deux doivent donner la même réponse.
  const r = await page.goto('/gens/clxxxxxxxxxxxxxxxxxxxxxxxx', { waitUntil: 'domcontentloaded' })
  expect(r.status(), 'une fiche inconnue doit être un 404').toBe(404)
})
