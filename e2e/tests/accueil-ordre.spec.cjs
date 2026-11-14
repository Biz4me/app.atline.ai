// L'ORDRE DE L'ACCUEIL, ET L'HONNÊTETÉ DE CE QUI N'EXISTE PAS ENCORE.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/accueil-ordre.spec.cjs
//
// ── 🧭 POURQUOI L'ORDRE SE MESURE ─────────────────────────────────────────
//
// « La verticale tient les priorités, le rail tient les variantes. » C'est la
// leçon tirée de la capture de DuckDice, et elle a une conséquence : **l'ordre
// des blocs EST la décision de produit**, pas une mise en page. Or rien dans
// le code ne le protège — déplacer deux balises JSX ne casse aucun type, ne
// lève aucune erreur, et ne se voit qu'en ouvrant l'écran.
//
// Cette sonde fige l'ordre arrêté avec Patrice le 14 novembre 2026, sur le
// modèle de sa capture : une grande carte, une bande de petites cases, puis
// les familles, puis ce qui n'existe pas encore.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/**
 * ⚠️ « Bientôt » PEUT MANQUER, et c'est le bon comportement : sans
 * rendez-vous à venir, la famille ne s'affiche pas plutôt que d'annoncer
 * « 0 ». On vérifie donc l'ORDRE RELATIF de ce qui est présent, pas la
 * présence de chacun.
 */
const ORDRE = [
  ['[data-mantras]', 'la grande carte'],
  ['[data-bande]', 'la bande des gens'],
  ['[data-rail="rattraper"]', 'À rattraper'],
  ['[data-rail="bientot"]', 'Bientôt'],
  ['[data-rail="apprendre"]', 'Apprendre'],
  ['section[aria-labelledby="resume-titre"]', 'le résumé de nuit'],
  ['[data-a-venir]', 'Bientôt dans l’app'],
]

test('l’accueil empile ses blocs dans l’ordre décidé', async ({ page, pageErrors }) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-mantras]')).toBeVisible({ timeout: 20_000 })

  const vus = []
  for (const [sel, nom] of ORDRE) {
    const loc = page.locator(sel).first()
    if ((await loc.count()) === 0) continue
    const b = await loc.boundingBox()
    expect(b, `« ${nom} » existe mais n’a pas de boîte`).toBeTruthy()
    vus.push({ nom, y: Math.round(b.y) })
  }

  // 🔴 CONTRÔLE POSITIF. Si les sélecteurs se périment un à un, la liste se
  // vide et une liste vide est toujours « bien ordonnée ».
  expect(vus.length, `trop peu de blocs reconnus : ${vus.map((v) => v.nom).join(', ')}`).toBeGreaterThanOrEqual(5)

  const desordre = vus.filter((v, i) => i > 0 && v.y <= vus[i - 1].y)
  expect(
    desordre,
    `l’ordre est rompu : ${vus.map((v) => `${v.nom}@${v.y}`).join(' · ')}`,
  ).toEqual([])

  expect(pageErrors).toEqual([])
})

test('les cartes « bientôt » ne promettent rien', async ({ page, pageErrors }) => {
  /**
   * ── 🔴 LA RÈGLE QUE CES CARTES PLIENT, ET À QUELLES CONDITIONS ──────────
   *
   * La maison interdit de montrer ce qui n'existe pas : **une flèche est une
   * promesse**, et on a retiré un « Ouvrir le module 8 → » qui ne menait
   * nulle part. Patrice a demandé ces cartes quand même le 14 novembre 2026,
   * et c'est défendable — le socle dit *préparer → envoyer → une touche au
   * retour*, et l'envoyer n'existe pas : un accueil muet là-dessus laisse
   * croire que l'app est finie.
   *
   * 🧭 Mais l'autorisation tient à TROIS conditions, et une carte qui en
   * perdrait une redeviendrait le mensonge d'origine. Elles ne se relisent
   * pas dans le code — un `<a>` ajouté par réflexe passerait la revue — donc
   * elles se mesurent ici.
   */
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  const cartes = page.locator('[data-avenir]')
  await expect(cartes.first(), 'les cartes « bientôt » ont disparu').toBeVisible({ timeout: 20_000 })

  const n = await cartes.count()
  expect(n, 'une seule carte « bientôt » : la grille 2×2 est cassée').toBe(4)

  for (let i = 0; i < n; i++) {
    const c = cartes.nth(i)
    const cle = await c.getAttribute('data-avenir')
    const vu = await c.evaluate((el) => ({
      liens: el.querySelectorAll('a, button').length,
      texte: el.textContent,
    }))

    // ① Rien à toucher : pas de lien, pas de bouton.
    expect(vu.liens, `« ${cle} » est devenue cliquable alors que son écran n’existe pas`).toBe(0)

    // ② Aucun chiffre : il faudrait l'inventer.
    expect(
      /\d/.test(vu.texte),
      `« ${cle} » affiche un chiffre : « ${vu.texte.trim()} ». Il ne peut venir de nulle part.`,
    ).toBe(false)

    // ③ Aucune flèche : c'est le signe qui promet une destination.
    expect(vu.texte.includes('→'), `« ${cle} » porte une flèche, donc une promesse`).toBe(false)
  }

  /**
   * ⚠️ ET TOUT TIENT À L'ÉCRAN. C'est la quatrième règle : une grille, pas un
   * rail. Un rail promet une sortie (« Tout voir ») et il n'y en a aucune, et
   * ce qui est hors écran dans un rail n'est jamais lu. Ici la quatrième
   * carte doit être aussi visible que la première.
   */
  const largeur = page.viewportSize().width
  for (let i = 0; i < n; i++) {
    const b = await cartes.nth(i).boundingBox()
    expect(
      b.x + b.width,
      `la carte ${i + 1} dépasse de l’écran : une grille ne cache rien`,
    ).toBeLessThanOrEqual(largeur)
  }

  expect(pageErrors).toEqual([])
})
