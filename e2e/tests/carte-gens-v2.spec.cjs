// LA CARTE DES CONTACTS (V2) — 17 novembre 2026.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/carte-gens-v2.spec.cjs
//
// ── 🔴 CE QU'AUCUN AUTRE CONTRÔLE NE VOIT ─────────────────────────────────
//
// Une carte a l'air juste dès qu'elle s'affiche. Trois défauts la rendent
// inutile sans rien casser de visible :
//
// ① **Les marqueurs empilés.** MapLibre place ses marqueurs par un `transform`
//   CSS, mais leur `position: absolute` vient de SA feuille de style. Si elle
//   manque, les trente points se superposent au coin du cadre : on voit un
//   tas au lieu d'une France, et rien n'est en erreur. La sonde mesure donc
//   l'ÉCART RÉEL entre les points à l'écran.
//
// ② **La latitude et la longitude inversées.** GeoJSON range la longitude en
//   premier. Les inverser pose tout le monde au large de la Somalie — et la
//   carte s'affiche parfaitement. On vérifie donc qu'un point connu tombe au
//   bon endroit RELATIVEMENT aux autres : Lille au nord de Marseille.
//
// ③ **Le compte muet.** 17 contacts n'ont aucune adresse. Une carte qui en
//   montre 27 et se tait sur les 17 autres se lit « voilà tout mon monde ».
//
// 🧭 Et elle prend une capture : une carte se juge à l'œil, pas au texte.

const { test, expect, suivre } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('la carte place les gens, et ne les empile pas', async ({ page, pageErrors }) => {
  /**
   * ── 🔴 LE GARDE CONTRE LA CARTE GRISE ────────────────────────────────
   *
   * Vécu le 17 novembre 2026 : la carte s'affichait ENTIÈREMENT GRISE en
   * production. L'attribution était là, les marqueurs étaient bien placés,
   * aucune requête n'échouait, et cette sonde passait au vert — elle ne
   * vérifiait que les points. MapLibre décode ses tuiles dans un web worker
   * que le bundler n'arrivait pas à démarrer : **pas de worker, pas de
   * tuile décodée, et un fond uni qui ressemble à un fond qui charge
   * encore.**
   *
   * 🧭 CE QU'ON MESURE, C'EST LE RÉSEAU. Une carte peinte demande des
   * morceaux de l'archive ET des polices pour ses étiquettes. Une carte
   * grise n'en demande presque rien. C'est observable de l'extérieur, et
   * ça aurait attrapé le défaut du jour exactement.
   */
  /**
   * ON NE VISE PAS UN NOM DE FICHIER. Il porte la date de l'extraction --
   * parce qu'une archive mise en cache trente jours DOIT changer d'adresse
   * quand elle change de contenu -- donc un nom ecrit ici se perimerait a la
   * prochaine extraction. Et il s'est perime : cette sonde a crie « le fond
   * est gris » alors que la carte allait tres bien, le 17 novembre 2026.
   */
  const recu = []
  page.on('response', (r) => {
    const u = r.url()
    if (u.includes('/tuiles/')) recu.push({ code: r.status(), url: u })
  })
  const erreursConsole = []
  page.on('console', (m) => {
    if (m.type() === 'error') erreursConsole.push(m.text().slice(0, 160))
  })

  await page.goto('/gens?vue=carte', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-carte]'), 'la carte ne s’ouvre pas').toBeVisible({
    timeout: 30_000,
  })

  // Le canevas WebGL existe : MapLibre a vraiment démarré.
  await expect(page.locator('[data-carte] canvas')).toBeVisible({ timeout: 20_000 })

  const points = page.locator('[data-point]')
  const combien = await points.count()
  console.log(`  ${combien} points sur la carte`)
  expect(combien, 'aucun point : la sonde ne mesure rien').toBeGreaterThan(5)

  /**
   * ① L'ÉCART RÉEL, EN PIXELS. On ne demande pas « sont-ils positionnés ? »
   * — ils le sont toujours — on demande **s'ils occupent des endroits
   * différents**. Empilés, la largeur et la hauteur du nuage valent zéro.
   */
  const boites = await points.evaluateAll((n) =>
    n.map((e) => {
      const r = e.getBoundingClientRect()
      return { x: Math.round(r.x), y: Math.round(r.y), nom: e.getAttribute('aria-label') }
    }),
  )
  const xs = boites.map((b) => b.x)
  const ys = boites.map((b) => b.y)
  const largeur = Math.max(...xs) - Math.min(...xs)
  const hauteur = Math.max(...ys) - Math.min(...ys)
  console.log(`  nuage : ${largeur} px de large · ${hauteur} px de haut`)
  expect(largeur, 'les points sont empilés horizontalement').toBeGreaterThan(80)
  expect(hauteur, 'les points sont empilés verticalement').toBeGreaterThan(80)

  /**
   * ② LE NORD EST EN HAUT. Si latitude et longitude étaient inversées, la
   * carte s'afficherait quand même — joliment, et faux. Lille (50,6°) doit
   * être AU-DESSUS de Marseille (43,3°), donc avoir un `y` plus petit.
   *
   * ⚠️ On s'arrête en le DISANT si l'un des deux manque, au lieu de passer :
   * un contrôle qui saute son cas est un contrôle qui ment.
   */
  const trouve = (debut) => boites.find((b) => (b.nom ?? '').startsWith(debut))
  const nord = trouve('Nicolas') // Lille
  const sud = trouve('Olivier') // Marseille
  if (!nord || !sud) {
    console.log(`  repères absents — noms vus : ${boites.map((b) => b.nom).join(' · ')}`)
    throw new Error('les deux repères géographiques ne sont pas sur la carte : rien n’est prouvé')
  }
  console.log(`  ${nord.nom} y=${nord.y} · ${sud.nom} y=${sud.y}`)
  expect(nord.y, 'le nord n’est pas en haut : latitude et longitude sont inversées').toBeLessThan(
    sud.y,
  )

  /* ③ La carte compte ce qu'elle ne montre pas. */
  const compte = page.locator('[data-carte-compte]')
  await expect(compte).toBeVisible()
  await expect(compte, 'la carte ne dit pas combien de gens elle laisse dehors').toContainText(
    'sans adresse',
  )
  console.log(`  compte : ${(await compte.innerText()).replace(/\s+/g, ' ')}`)

  /* ── 🔴 LE FOND EST-IL VRAIMENT PEINT ? ── */
  await expect
    .poll(() => recu.filter((r) => r.url.endsWith('.pmtiles')).length, {
      timeout: 20_000,
      message: 'aucun morceau de l’archive demandé : le fond est gris',
    })
    .toBeGreaterThan(2)
  await expect
    .poll(() => recu.filter((r) => r.url.includes('/fonts/')).length, {
      timeout: 20_000,
      message: 'aucune police demandée : la carte n’a aucune étiquette, donc rien n’est peint',
    })
    .toBeGreaterThan(0)

  const ratees = recu.filter((r) => r.code >= 400)
  expect(ratees.map((r) => `${r.code} ${r.url}`), 'une ressource de carte manque').toEqual([])
  console.log(
    `  réseau : ${recu.filter((r) => r.url.endsWith('.pmtiles')).length} plages d’archive · ` +
      `${recu.filter((r) => r.url.includes('/fonts/')).length} polices · ` +
      `${recu.filter((r) => r.url.includes('/sprites/')).length} sprites`,
  )

  // ⚠️ `pageErrors` n'attrape que les exceptions NON capturées. MapLibre,
  // lui, se plaint dans la console sans lever — c'est par là qu'est passée
  // l'erreur du worker, et c'est la seule chose qui l'a dite.
  expect(erreursConsole, 'la carte se plaint dans la console').toEqual([])

  await page.screenshot({ path: 'carte-gens.png' })
  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})

test('la carte suit les populations, et la forme est rappelée', async ({ page }) => {
  await page.goto('/gens?vue=carte', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-carte]')).toBeVisible({ timeout: 30_000 })
  const tous = await page.locator('[data-point]').count()

  /**
   * 🔴 LE GARDE DE LA DEMANDE : *« il faudra penser qu'il s'adapte aux
   * filtres tous partenaires prospects ou clients »*. Les cases de la bande
   * sont des LIENS, donc elles rechargent la page — si la vue ne voyageait
   * pas dans l'adresse, toucher « Partenaires » ramènerait à la liste.
   */
  const partenaires = page.locator('nav[aria-label="Populations"] a').nth(3)
  await expect(partenaires).toContainText('Partenaires')
  /**
   * ⚠️ `suivre` ET PAS `click`, ET L'ADRESSE EXIGE LES DEUX MORCEAUX.
   *
   * 🔴 Le premier jet attendait `/vue=carte/` — que l'adresse de DÉPART
   * contenait déjà. L'assertion passait donc que le clic ait porté ou non,
   * et le test a échoué vingt lignes plus loin en accusant le filtre. Un
   * contrôle que la cause du défaut peut satisfaire ne garde rien.
   *
   * ⚠️ Et un `<Link>` de Next avale le clic pendant sa fenêtre
   * d'hydratation : `suivre` réessaie, espacé, jusqu'à ce qu'on soit parti.
   */
  await suivre(partenaires, page, /qui=partenaire(.*)vue=carte|vue=carte(.*)qui=partenaire/)
  await expect(page.locator('[data-carte]'), 'choisir une population a refermé la carte').toBeVisible(
    { timeout: 30_000 },
  )
  const filtres = await page.locator('[data-point]').count()
  console.log(`  tous : ${tous} points · partenaires : ${filtres} points`)
  expect(filtres, 'le filtre ne réduit rien : la carte ignore la population').toBeLessThan(tous)
  expect(filtres, 'le filtre a tout vidé').toBeGreaterThan(0)

  /**
   * ⚠️ LE RAPPEL DE LA FORME. Sans lui, les trois formes seraient un alphabet
   * à deviner — et quelqu'un finirait par croire que le cercle plein veut
   * dire « important ». Il est sur les trois populations, et PAS sur
   * « Tous », qui n'en est pas une.
   */
  const cases = page.locator('nav[aria-label="Populations"] a')
  const formes = await cases.evaluateAll((n) => n.map((e) => e.querySelectorAll('svg').length))
  console.log(`  formes par case : ${formes.join(' · ')}`)
  expect(formes[0], '« Tous » porte une forme, alors qu’il n’est pas une population').toBe(0)
  expect(formes.slice(1), 'une population n’a pas son rappel de forme').toEqual([1, 1, 1])

  await page.screenshot({ path: 'carte-gens-partenaires.png' })
})
