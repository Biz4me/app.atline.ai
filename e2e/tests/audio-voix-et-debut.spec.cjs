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
  /**
   * 🔴 `[data-rang-suivant]` ET PLUS `[data-rang-suivant]` (21 nov. 2026).
   * Le pied « Leçon suivante » a été supprimé : il était le troisième chemin
   * vers la même chose, après les chevrons de la couverture et le groupe de
   * transport de la carte du lecteur. Ce qui reste est le bouton du lecteur.
   *
   * ⚠️ ET C'EST UN BOUTON, PLUS UN LIEN : il n'a pas de `href` à lire. On
   * vérifie donc qu'il est ALLUMÉ — ce qui dit la même chose, « il y a une
   * suivante » — puis on le touche.
   */
  const versLaSuite = page.locator('[data-rang-suivant]')
  /**
   * ⚠️ ON ATTEND L'ÉTAT, ON NE LE LIT PAS AU VOL. Le pied était un lien rendu
   * par le SERVEUR : son `href` existait dès la première image. Ce bouton est
   * CLIENT, et il naît éteint — le lecteur ne sait pas encore quelle leçon il
   * joue. Un `isEnabled()` immédiat répondait donc « non » et la sonde
   * accusait la leçon de ne pas avoir de suivante.
   */
  await expect(versLaSuite, 'la leçon 1 doit avoir une suivante').toBeEnabled({ timeout: 20_000 })
  const depart = new URL(page.url()).pathname
  await versLaSuite.click()
  const srcDeux = await attendrePiste(page, srcUn)
  /**
   * 🔴 ET ON ATTEND QUE L'ADRESSE RATTRAPE LA PISTE (21 nov. 2026, soir).
   *
   * Le chevron ne navigue plus : il change de piste TOUT DE SUITE, avec la
   * donnée déjà en main, puis laisse `router.replace` suivre. Les deux ne
   * tombent donc plus ensemble — la piste change en ~40 ms, l'adresse en ~70.
   *
   * ⚠️ CETTE SONDE LISAIT L'ADRESSE JUSTE APRÈS LA PISTE, et relevait donc
   * celle de la leçon QU'ON VENAIT DE QUITTER. Elle a ensuite accusé
   * l'enchaînement d'être parti sur la mauvaise leçon, alors qu'il était
   * juste et que c'était sa référence qui était périmée.
   */
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 15_000 })
    .not.toBe(depart)
  /**
   * ⚠️ L'ADRESSE DE LA SUIVANTE SE RELÈVE APRÈS LE SAUT, plus avant. Le pied
   * portait un `href` qu'on lisait sans bouger ; le bouton du lecteur, lui,
   * ne dit pas où il mène — il le fait. On note donc où l'on est arrivé, et
   * c'est cette adresse que l'enchaînement devra retrouver plus bas.
   */
  const suivante = new URL(page.url()).pathname
  await lancer(page)
  await page.evaluate((s) => {
    document.querySelector(s).currentTime = 200
  }, AUDIO)
  await expect.poll(() => ou(page), { timeout: 15_000 }).toBeGreaterThan(201)

  // Retour sur la leçon 1 : on est déjà sur une page d'écoute, il n'y a donc
  // aucun lien « Écouter » à cliquer — seulement la piste à attendre.
  await page.locator('[data-rang-precedent]').click()
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
