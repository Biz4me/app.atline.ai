// LA PISTE FINIT-ELLE SANS JAMAIS ATTEINDRE SA FIN ?
//
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/ecoute-arriere-plan.spec.cjs
//
// Patrice, le 20 novembre 2026 : *« on termine le lecteur audio en arrière
// plan »*. La parade construite ce jour-là repose sur un fait d'iOS qu'aucune
// documentation Apple n'énonce : **WebKit ferme la session audio quand une
// piste atteint sa fin NATURELLE en arrière-plan**, et refuse de la rouvrir.
// On s'arrête donc 350 ms avant, et `loop` interdit à la piste de finir.
//
// 🔴 CE QU'ON MESURE EST UNE ABSENCE, ET C'EST POURQUOI ELLE A BESOIN D'UNE
// SONDE. « ended ne part jamais » ne se voit sur aucun écran : la leçon se
// termine, l'enchaînement part, tout a l'air normal — et la seule différence
// est invisible jusqu'au jour où le téléphone est dans une poche.
//
// ⚠️ UN CONTRÔLE D'ABSENCE NE VAUT QUE SI LA SONDE A DÉJÀ TROUVÉ LA CHOSE.
// Le témoin compte AUSSI les mises en pause : s'il en voit zéro, c'est que
// rien ne s'est produit du tout et le « ended : 0 » ne prouve rien. Les deux
// chiffres se lisent ensemble ou pas du tout.
const { test, expect } = require('../fixtures.cjs')
const { lancer, ouvrirEcoute } = require('../son.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('la leçon se termine sans que la piste atteigne sa fin', async ({ page }) => {
  await ouvrirEcoute(page)

  // L'adresse que l'enchaînement doit atteindre, LUE SUR LA PAGE et non
  // devinée : une sonde à qui l'on donne la cible ne protège pas d'une cible
  // fausse.
  const attendu = await page.locator('[data-pied-suivant]').getAttribute('href')
  expect(attendu, 'la leçon 1 doit avoir une suivante pour que ce test ait un sujet').toBeTruthy()

  // Les témoins se posent AVANT de toucher au son, et retiennent l'état au
  // moment de la pause : trois secondes plus tard l'enchaînement remplace
  // l'élément, et il serait trop tard pour l'interroger.
  await page.evaluate(() => {
    const a = document.querySelector('audio')
    window.__fin = { ended: 0, pauses: 0, boucle: a.loop, auPause: null }
    a.addEventListener('ended', () => {
      window.__fin.ended++
    })
    a.addEventListener('pause', () => {
      window.__fin.pauses++
      window.__fin.auPause ??= { t: a.currentTime, d: a.duration, ended: window.__fin.ended }
    })
  })

  await lancer(page)

  // La durée n'est connue qu'après `loadedmetadata` : s'y placer avant est
  // ignoré en silence.
  await page.waitForFunction(
    () => {
      const a = document.querySelector('audio')
      return a && Number.isFinite(a.duration) && a.duration > 0
    },
    null,
    { timeout: 30_000 },
  )
  const duree = await page.evaluate(() => {
    const a = document.querySelector('audio')
    a.currentTime = a.duration - 1.2
    return a.duration
  })

  // La mise en pause doit venir d'elle-même : personne ne la demande.
  await expect
    .poll(() => page.evaluate(() => window.__fin?.auPause), { timeout: 25_000 })
    .not.toBeNull()

  const t = await page.evaluate(() => window.__fin)
  console.log(JSON.stringify({ duree: Math.round(duree * 100) / 100, ...t }, null, 1))

  const griefs = []
  if (!t.boucle) griefs.push('`loop` n’est pas posé : la piste peut atteindre sa fin, donc fermer la session d’iOS')
  if (t.pauses === 0) griefs.push('aucune mise en pause observée : la sonde n’a rien vu, « ended : 0 » ne prouve donc rien')
  if (t.ended > 0) griefs.push(`« ended » est parti ${t.ended} fois — c’est l’événement même qu’on existe pour éviter`)

  // Deux chemins sont acceptables, et le journal dit lequel a servi :
  //   · net — on s’est arrêté dans les 500 ms avant la fin ;
  //   · rattrapé — la piste avait rebouclé, et le filet a joué.
  if (t.auPause) {
    const reste = t.auPause.d - t.auPause.t
    const net = reste >= 0 && reste <= 0.5
    const rattrape = t.auPause.t < 1
    if (!net && !rattrape)
      griefs.push(
        `arrêt à ${t.auPause.t.toFixed(2)} s sur ${t.auPause.d.toFixed(2)} : ni juste avant la fin, ni un rebouclage`,
      )
    else console.log(net ? 'chemin : arrêt net avant la fin' : 'chemin : rebouclage rattrapé par le filet')
    if (t.auPause.ended > 0) griefs.push('« ended » avait déjà été tiré au moment de la pause')
  }

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])

  /**
   * 🔴 ET L'ENCHAÎNEMENT PART QUAND MÊME. C'est la moitié oubliable du
   * contrat : supprimer `ended` sans rien à la place rendrait une leçon qui
   * s'arrête et ne mène nulle part — un défaut bien plus visible que celui
   * qu'on corrigeait.
   */
  await expect.poll(() => page.url(), { timeout: 20_000 }).toContain(`${attendu}?suite=1`)
})

test('l’écran verrouillé sait quoi afficher', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)

  const vu = await page.evaluate(() => {
    const m = navigator.mediaSession?.metadata
    return {
      pris: !!m,
      titre: m?.title ?? null,
      auteur: m?.artist ?? null,
      album: m?.album ?? null,
      pochettes: (m?.artwork ?? []).map((a) => ({ src: a.src, type: a.type, sizes: a.sizes })),
      etat: navigator.mediaSession?.playbackState ?? null,
      ecran: document.querySelector('[data-titre-ecoute]')?.textContent.trim() ?? null,
    }
  })
  console.log(JSON.stringify(vu, null, 1))

  const griefs = []
  if (!vu.pris) griefs.push('aucune métadonnée : l’écran verrouillé affichera l’adresse du site')
  // 🔴 LE TITRE SE COMPARE À L'ÉCRAN, pas à une chaîne recopiée ici : une
  // constante dans le test se périme le jour où la leçon est renommée, et
  // ferait échouer une app parfaitement juste.
  if (vu.titre !== vu.ecran)
    griefs.push(`le titre annoncé (« ${vu.titre} ») n’est pas celui de l’écran (« ${vu.ecran} »)`)
  if (!vu.auteur || vu.auteur === 'Atline')
    griefs.push('le titre du module n’est pas passé : l’écran verrouillé ne dira pas de quel livre vient la leçon')
  if (!vu.album?.startsWith('Atline')) griefs.push(`album inattendu : « ${vu.album} »`)
  if (vu.etat !== 'playing') griefs.push(`l’état annoncé est « ${vu.etat} » alors que le son joue`)
  if (vu.pochettes.length !== 2)
    griefs.push(`${vu.pochettes.length} pochette(s) au lieu de 2 — le système doit pouvoir choisir sa taille`)

  // ⚠️ UNE POCHETTE DÉCLARÉE N'EST PAS UNE POCHETTE SERVIE. C'est la même
  // leçon que les tuiles de la carte : un chemin juste vers un fichier absent
  // rend un carré vide, sans un mot.
  for (const p of vu.pochettes) {
    const r = await page.request.get(p.src)
    if (!r.ok()) griefs.push(`pochette ${p.src} : HTTP ${r.status()}`)
    else if (!(r.headers()['content-type'] ?? '').includes('webp'))
      griefs.push(`pochette ${p.src} servie en ${r.headers()['content-type']}`)
  }
  if (!vu.pochettes.some((p) => p.src.includes('/modules/m01.')))
    griefs.push('aucune pochette du module 1 : la couverture annoncée n’est pas la sienne')

  // L'état doit SUIVRE l'élément, sinon l'écran verrouillé montre ▶ pendant
  // que le son tourne.
  await page.evaluate(() => document.querySelector('audio').pause())
  await expect
    .poll(() => page.evaluate(() => navigator.mediaSession?.playbackState), { timeout: 10_000 })
    .toBe('paused')

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})
