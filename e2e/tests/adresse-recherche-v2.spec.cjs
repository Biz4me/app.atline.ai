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
// ── 🔴 POURQUOI `remplir` EST RALENTI ICI ─────────────────────────────────
//
// `remplir` rejoue la saisie toutes les 50 ms par défaut. La recherche, elle,
// attend 300 ms de repos avant de demander quoi que ce soit : au rythme par
// défaut, **chaque réécriture relancerait l'attente et aucune requête ne
// partirait jamais**. Le rattrapage empêcherait la chose qu'il attend — la
// faute que le harnais documente déjà pour `suivre`. Six essais de 2,5 s.

const { test, expect, remplir, toucher, adresseDe } = require('../fixtures.cjs')

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

  /* ── ③ LA RECHERCHE EST LÀ, SUR UN CONTACT SANS AUCUNE ADRESSE ── */
  const champ = page.locator('[data-adresse-auto] input')
  await expect(champ, 'la recherche d’adresse est absente d’une fiche vide').toBeVisible({
    timeout: 15_000,
  })
  // Et la porte de secours aussi : la Base Adresse Nationale s'arrête aux
  // frontières, donc une adresse étrangère doit rester saisissable.
  await expect(
    page.locator('[data-adresse-main]'),
    'plus de chemin pour saisir une adresse à la main',
  ).toBeVisible()

  /* ── LA FRAPPE, puis les suggestions ── */
  const premiere = page.locator('[data-suggestion]').first()
  await remplir(
    champ,
    CHERCHE,
    () => premiere.isVisible().catch(() => false),
    // Voir l'en-tête : plus lent que le repos de 300 ms de la recherche.
    { essais: 6, pas: 2500 },
  )
  await expect(premiere, 'aucune suggestion n’est revenue').toBeVisible({ timeout: 10_000 })
  await expect(premiere).toContainText(VILLE)

  /* ── ② LE CLIC. La conséquence attendue est une rangée RENDUE PAR LE
        SERVEUR, pas le petit « Enregistré » du composant : celui-ci vit dans
        un état client qu'un rafraîchissement pourrait emporter, et une sonde
        qui s'appuie dessus prouverait l'affichage plutôt que l'écriture.

        🔴 `[data-champ="city"]` N'EXISTE PAS AVANT : une rangée ne se rend
        que remplie. Son APPARITION est donc le garde — un contrôle que
        l'ancien état peut satisfaire ne garde rien. ── */
  const rangeeVille = page.locator('[data-champ="city"]')
  await toucher(premiere, rangeeVille)
  await expect(rangeeVille, 'la ville n’est pas arrivée sur la fiche').toContainText(VILLE)

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
