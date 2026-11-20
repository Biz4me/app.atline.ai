// DEUX RÉGLAGES DU 20 NOVEMBRE QUE RIEN NE RETENAIT
//
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/audio-voix-et-debut.spec.cjs
//
// 🔴 ET SEULEMENT DEUX, PARCE QUE LE RESTE EXISTE DÉJÀ. La reprise à cinq
// secondes, la pause au retour, le volume non muet et l'enchaînement à la fin
// sont mesurés par `audio-enchainement.spec.cjs`. Une première version de ce
// fichier les refaisait : deux descriptions d'une même règle finissent
// toujours par n'en avoir qu'une de juste, sans qu'on sache laquelle.
//
// Ce qui manquait, et qui ne se voit nulle part ailleurs :
//
//   · **changer de voix garde sa PLACE**, et la place n'est pas la seconde ;
//   · **un enchaînement commence au DÉBUT**, même si la leçon d'arrivée avait
//     déjà été entamée un autre jour — c'est le défaut que Patrice a signalé :
//     *« quand la leçon suivante démarre automatiquement, elle ne démarre pas
//     vraiment au début »*.
//
// ── 🔴 CE FILET EST TENDU AVANT LE DÉMÉNAGEMENT DU LECTEUR ─────────────────
//
// Le chantier suivant sort l'élément et l'état de la page pour les poser dans
// la coquille, afin que le son survive aux changements d'écran. Déménager deux
// cents lignes réglées au doigt sans rien pour dire ce qui a bougé, c'est la
// panne muette garantie — et elle s'appellerait « j'ai perdu ma place », trois
// jours plus tard, sans cause visible.
const { test, expect } = require('../fixtures.cjs')
const { AUDIO, attendrePiste, lancer, ou, ouvrirEcoute } = require('../son.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('changer de voix garde sa place dans la leçon', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)

  const avant = await page.evaluate((s) => {
    const a = document.querySelector(s)
    a.currentTime = 150
    return { d: a.duration, src: a.currentSrc }
  }, AUDIO)
  await expect.poll(() => ou(page), { timeout: 15_000 }).toBeGreaterThan(150)
  const place = await ou(page)

  // Le filtre de gauche de la barre du bas, puis l'autre prénom. On lit les
  // deux noms proposés plutôt que de les écrire : le jour où une troisième
  // voix arrive, la sonde choisit encore juste.
  await page.locator('[data-options-ecoute]').click()
  const prenoms = await page.getByRole('button', { name: /^(Dorian|Solène)$/ }).allTextContents()
  const cible = prenoms.find((n) => !avant.src.includes(n.toLowerCase().replace(/è/g, 'e')))
  expect(cible, `aucune voix différente parmi ${JSON.stringify(prenoms)}`).toBeTruthy()
  await page.getByRole('button', { name: cible, exact: true }).click()

  await attendrePiste(page, avant.src)
  await expect.poll(() => ou(page), { timeout: 20_000 }).toBeGreaterThan(1)

  const apres = await page.evaluate((s) => {
    const a = document.querySelector(s)
    return { t: a.currentTime, d: a.duration, joue: !a.paused }
  }, AUDIO)

  /**
   * 🔴 ON REPORTE LA PROPORTION, PAS LA SECONDE. Les deux enregistrements
   * disent le même texte à des rythmes différents — mesuré ici : 679 s contre
   * 702, soit près d'une minute d'écart sur une leçon de onze minutes.
   * Reporter « 2 min 30 » telle quelle tomberait de plus en plus loin à mesure
   * qu'on avance ; reporter « 22 % de la leçon » tombe au même ENDROIT du
   * propos, ce qui est la demande. ⚠️ Moins deux secondes : on écoutait il y a
   * une seconde, reculer de cinq ferait réentendre ce qu'on vient d'entendre.
   */
  const attendu = (place / avant.d) * apres.d - 2
  console.log(JSON.stringify({ place, dAvant: avant.d, ...apres, attendu }, null, 1))

  const griefs = []
  if (Math.abs(apres.t - attendu) > 4)
    griefs.push(
      `arrivé à ${apres.t.toFixed(1)} s alors que la même PLACE dans l’autre voix est à ${attendu.toFixed(1)} s`,
    )
  // 🧭 Changer de voix au milieu d'une écoute, c'est vouloir la suite dans
  // l'autre voix, pas s'arrêter.
  if (!apres.joue) griefs.push('la lecture s’est arrêtée en changeant de voix')

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

test('un enchaînement commence au début, même sur une leçon déjà entamée', async ({ page }) => {
  const srcUn = await ouvrirEcoute(page)

  /**
   * 🔴 ON LAISSE EXPRÈS UNE POSITION SUR LA LEÇON D'ARRIVÉE. C'est tout le
   * sujet : « reprendre » et « enchaîner » se disputaient la tête de lecture,
   * et la reprise gagnait. Sans cette mise en scène, le test passerait au vert
   * sur une leçon neuve et ne dirait rien du défaut.
   */
  const suivante = await page.locator('[data-pied-suivant]').getAttribute('href')
  expect(suivante, 'la leçon 1 doit avoir une suivante').toBeTruthy()
  await page.locator('[data-pied-suivant]').click()
  const srcDeux = await attendrePiste(page, srcUn)
  await lancer(page)
  await page.evaluate((s) => {
    document.querySelector(s).currentTime = 200
  }, AUDIO)
  await expect.poll(() => ou(page), { timeout: 15_000 }).toBeGreaterThan(201)

  // Retour sur la leçon 1 : on est déjà sur une page d'écoute, il n'y a donc
  // aucun lien « Écouter » à cliquer — seulement la piste à attendre.
  await page.locator('[data-pied-precedent]').click()
  await attendrePiste(page, srcDeux)
  await lancer(page)

  // On provoque la fin, et l'enchaînement part tout seul.
  await page.evaluate((s) => {
    const a = document.querySelector(s)
    a.currentTime = a.duration - 1.2
  }, AUDIO)
  await expect.poll(() => page.url(), { timeout: 25_000 }).toContain(`${suivante}?suite=1`)
  await attendrePiste(page, srcUn)

  /**
   * ⚠️ L'ACTIVATION DE LA PAGE EST CONSERVÉE par une navigation côté client —
   * c'est d'ailleurs pourquoi l'enchaînement peut jouer du tout. Si le son ne
   * repart pas ici, ce n'est donc pas une règle de navigateur : c'est
   * l'enchaînement qui est cassé.
   */
  await expect
    .poll(() => page.evaluate((s) => !document.querySelector(s)?.paused, AUDIO), { timeout: 25_000 })
    .toBe(true)
  const t = await ou(page)
  console.log(JSON.stringify({ arriveA: t }, null, 1))
  expect(
    t,
    `l’enchaînement a démarré à ${t.toFixed(1)} s : il a repris la position d’une écoute précédente au lieu du début`,
  ).toBeLessThan(10)
})
