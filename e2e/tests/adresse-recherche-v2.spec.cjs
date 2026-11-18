// LA RECHERCHE D'ADRESSE (V2) — 16 novembre 2026.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/adresse-recherche-v2.spec.cjs
//
// On tape le début d'une adresse, on touche une ligne, et cinq champs plus
// une position partent en une écriture.
//
// ── 🔴 CE QUE CETTE SONDE GARDE, ET QU'AUCUN AUTRE CONTRÔLE NE VOIT ───────
//
// ① **`lat` et `lng` ne s'affichent nulle part.** La fiche montre la rue, le
//   code postal, la ville, le pays — jamais la position. Un test de
//   navigateur ne peut pas les voir, et ce sont les deux seules valeurs dont
//   la carte des contacts dépendra. D'où la lecture en base, avant ET après.
//   Mesuré avant d'écrire une ligne de code : **0 contact sur 44** en portait.
//
// ② **Le clic sur une suggestion est le geste le plus fragile de l'app.** Un
//   clic n'existe que si `mousedown` et `mouseup` tombent sur le même
//   élément ; la façon habituelle d'écrire une liste de suggestions — la
//   cacher quand le champ perd le focus — les sépare, et le clic se perd sans
//   un mot. C'est le défaut du bouton d'envoi du chat, corrigé le matin même.
//   Ici la liste ne se ferme jamais au `blur` et le `mousedown` est empêché.
//
// ③ **La recherche doit être visible sur un contact NEUF.** Un bloc sans
//   champ rempli ne s'affiche pas, et 39 fiches sur 44 n'ont aucune adresse :
//   la règle commune aurait rendu l'outil invisible exactement là où il sert.
//
// ── 🔴 NI `remplir` NI `toucher` ICI, ET C'EST MESURÉ ─────────────────────
//
// Le premier jet les utilisait tous les deux. Il a échoué en 60 s — alors que
// la capture d'échec montrait l'adresse PARFAITEMENT ÉCRITE à l'écran. Les
// deux aides du harnais sont construites pour un écran qui ne bouge pas tout
// seul, et une liste de suggestions fait exactement le contraire :
//
// ① `remplir` revide puis réécrit le champ à chaque essai. Vider la saisie
//   efface la liste, la réécrire la reconstruit 300 ms plus tard : le
//   rattrapage FABRIQUE une fenêtre où la cible n'existe pas. La page est
//   vivante avant qu'on tape — la disposition pose `data-vivant` après
//   hydratation et le harnais l'attend pour tous les tests — donc une seule
//   frappe suffit, et c'est la seule qui ne crée pas de churn.
//
// ② `toucher` reclique tant que la conséquence est absente, pour un bouton
//   QUI RESTE. Celui-ci se retire au succès : Playwright a cliqué, la liste
//   a disparu, et son propre réessai a attendu le retour d'un élément que le
//   clic venait de supprimer. Un clic, une fois, puis on juge sur la
//   conséquence — c'est elle qui dira si le geste s'est perdu.
//
// 🧭 Une aide qui frappe plus vite que la chose qu'elle attend finit par la
// provoquer, le défaut qu'elle devait corriger. Le harnais l'écrit déjà pour
// `suivre` ; ça vaut aussi pour une cible qui s'efface.

const { test, expect, adresseDe, ouvrirInfos } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

// Une adresse réelle de la Base Adresse Nationale, vérifiée à la main contre
// le service. Ses coordonnées sont le cœur de l'assertion.
const CHERCHE = '8 boulevard du port amiens'
const VILLE = 'Amiens'
const LAT = 49.897442
const LNG = 2.290084

test('une adresse choisie écrit les cinq champs ET la position', async ({
  page,
  seed,
  pageErrors,
}) => {
  /* ── L'AVANT, EN BASE. Il prouve deux choses d'un coup : que l'outil de
        lecture marche, et que ce qu'on va constater après n'était pas déjà
        là. Sans lui, l'assertion finale pourrait être vraie sans que la
        recherche ait rien fait. ── */
  const avant = adresseDe(seed.cid)
  expect(avant.city, 'le contact jetable arrive avec une ville').toBeNull()
  expect(avant.lat, 'le contact jetable arrive avec une position').toBeNull()
  expect(avant.lng, 'le contact jetable arrive avec une position').toBeNull()

  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main')).toBeVisible({ timeout: 20_000 })

  /* ⚠️ LES CHAMPS VIVENT DERRIÈRE L'ONGLET « INFOS » depuis le 18 novembre
        2026, et la recherche d'adresse avec eux — elle est devenue une RANGÉE
        de la liste, posée juste avant « Adresse », là où son effet atterrit. */
  await ouvrirInfos(page)

  /* ── ③ LA RECHERCHE EST LÀ, SUR UN CONTACT SANS AUCUNE ADRESSE ── */
  const champ = page.locator('[data-adresse-auto] input')
  await expect(champ, 'la recherche d’adresse est absente d’une fiche vide').toBeVisible({
    timeout: 15_000,
  })
  // 🟢 ET L'AUTRE CHEMIN N'A PLUS BESOIN D'UNE PORTE : les cinq rangées sont
  // affichées, vides comprises, donc une adresse belge ou canadienne — que la
  // Base Adresse Nationale ne connaît pas — se tape directement en dessous.
  await expect(page.locator('[data-champ="country"]')).toBeVisible()

  /* ── LA FRAPPE, puis les suggestions. UNE SEULE FOIS : voir l'en-tête. ── */
  const premiere = page.locator('[data-suggestion]').first()
  await champ.fill(CHERCHE)
  await expect(premiere, 'aucune suggestion n’est revenue').toBeVisible({ timeout: 20_000 })
  await expect(premiere).toContainText(VILLE)

  /* ── ② LE CLIC. La conséquence attendue est une rangée RENDUE PAR LE
        SERVEUR, pas le petit « Enregistré » du composant : celui-ci vit dans
        un état client qu'un rafraîchissement pourrait emporter, et une sonde
        qui s'appuie dessus prouverait l'affichage plutôt que l'écriture.

        🔴 `[data-champ="city"]` N'EXISTE PAS AVANT : une rangée ne se rend
        que remplie. Son APPARITION est donc le garde — un contrôle que
        l'ancien état peut satisfaire ne garde rien. ── */
  const rangeeVille = page.locator('[data-champ="city"]')
  // ⚠️ LE CLIC PEUT LEVER EN RÉUSSISSANT. La liste se retire au succès, et
  // Playwright peut alors juger l'élément détaché. On avale donc l'échec du
  // GESTE — jamais celui de la CONSÉQUENCE : si le clic s'est vraiment perdu,
  // la rangée n'apparaît pas et l'assertion suivante le dit.
  await premiere.click({ timeout: 10_000 }).catch(() => {})
  await expect(rangeeVille, 'la ville n’est pas arrivée sur la fiche').toBeVisible({
    timeout: 20_000,
  })
  await expect(rangeeVille).toContainText(VILLE)

  /* ── ① CE QUE LE SERVEUR A VRAIMENT GARDÉ ── */
  const apres = adresseDe(seed.cid)
  expect(apres.city, 'la ville n’est pas en base').toBe(VILLE)
  expect(apres.postal, 'le code postal n’est pas en base').toBe('80000')
  expect(apres.country, 'le pays n’est pas posé').toBe('France')
  expect(apres.address ?? '', 'la rue n’est pas en base').toContain('Boulevard du Port')

  // La position, qui ne s'affiche nulle part. Une tolérance large : ce qu'on
  // garde, c'est qu'elle est écrite et qu'elle désigne le bon endroit — pas
  // la décimale, que le service peut affiner.
  expect(apres.lat, 'la latitude n’est pas écrite').not.toBeNull()
  expect(apres.lng, 'la longitude n’est pas écrite').not.toBeNull()
  expect(Math.abs(apres.lat - LAT), `latitude ${apres.lat} au lieu de ~${LAT}`).toBeLessThan(0.02)
  expect(Math.abs(apres.lng - LNG), `longitude ${apres.lng} au lieu de ~${LNG}`).toBeLessThan(0.02)

  /**
   * 🔴 ET LE COMPLÉMENT N'A PAS ÉTÉ TOUCHÉ. « Bâtiment B », « chez sa
   * sœur » : c'est écrit par une personne, le service d'adresses n'en sait
   * rien, et l'écraser à chaque choix détruirait une information que rien ne
   * pourrait rendre. Il arrive nul sur un contact jetable, il doit repartir
   * nul — et il faut qu'une sonde le dise, parce que personne ne verrait
   * jamais la différence à l'usage.
   */
  expect(apres.address2, 'le complément a été écrasé par la recherche').toBeNull()

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})

/**
 * LE PROFIL — la même recherche, l'autre écriture.
 *
 * 🔴 CELLE-CI N'ÉCRIT RIEN, ET C'EST VOLONTAIRE. Le chemin du succès du
 * profil écrit sur le VRAI compte de Patrice : il poserait une adresse chez
 * quelqu'un, et aucune sonde n'a le droit de faire ça. Le harnais n'écrit que
 * sur le contact jetable, qu'il supprime ensuite. On éprouve donc ce qui ne
 * grave rien — et on le DIT, plutôt que de laisser croire que tout est
 * couvert.
 *
 * 🧭 Ce qu'elle garde quand même est réel : la recherche suit les champs
 * qu'elle remplit, pas le nom de l'écran. Si l'adresse déménageait dans un
 * autre domaine du profil, elle resterait ici sans rien écrire — et personne
 * ne le verrait, puisqu'un champ de recherche qui ne sert à rien ressemble à
 * un champ de recherche.
 */
test('la recherche d’adresse est aussi sur le profil', async ({ page, pageErrors }) => {
  await page.goto('/profil/joindre', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main')).toBeVisible({ timeout: 20_000 })

  const champ = page.locator('[data-adresse-auto] input')
  await expect(champ, 'la recherche d’adresse est absente du profil').toBeVisible({
    timeout: 15_000,
  })
  // Elle dit de QUI est l'adresse : sur une fiche c'est « l'adresse de X »,
  // ici c'est la sienne. Le même composant, deux phrases différentes.
  await expect(champ).toHaveAttribute('placeholder', /ton adresse/i)

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})
