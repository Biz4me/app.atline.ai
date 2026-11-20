// L'APPLICATION S'INSTALLE-T-ELLE COMME UNE APPLICATION ?
//
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/app-installable.spec.cjs
//
// Patrice, le 20 novembre 2026 : *« Chrome et logo Google encore sur Android
// quand j'ai désinstallé et réinstallé »*. Sur Android, Chrome pose soit une
// VRAIE application — son nom et son icône partout, y compris dans la
// notification du lecteur — soit un simple RACCOURCI qui rouvre Chrome.
//
// 🔴 ET LE PREMIER CORRECTIF N'A RIEN PU FAIRE, SANS QUE RIEN LE DISE :
// l'ouvrier de service était **redirigé vers l'écran de connexion** (307 vers
// `/auth?suite=/sw.js`). Un ouvrier qu'on redirige ne s'enregistre pas. C'est
// la panne muette typique : le fichier existe, il est déployé, il est juste
// inatteignable.
const { test, expect, request } = require('@playwright/test')
const { test: connecte } = require('../fixtures.cjs')

const BASE = process.env.E2E_BASE || 'https://v2.atline.ai'

/**
 * ── 🔴 SANS SESSION, ET C'EST TOUT LE SUJET ────────────────────────────────
 *
 * Une page d'attente sert précisément quand le réseau — donc la session — n'est
 * pas là, et un ouvrier s'enregistre avant toute authentification. Les
 * interroger avec le cookie du harnais ne prouverait rien.
 */
test('l’ouvrier et sa page d’attente répondent sans session', async () => {
  const nu = await request.newContext({ baseURL: BASE })
  const vus = []
  for (const chemin of ['/sw.js', '/hors-ligne.html', '/manifest.webmanifest']) {
    const r = await nu.get(chemin)
    vus.push({ chemin, code: r.status(), type: r.headers()['content-type'], octets: (await r.body()).length })
  }
  console.log(JSON.stringify(vus, null, 1))
  await nu.dispose()

  const griefs = vus.filter((v) => v.code !== 200).map((v) => `${v.chemin} répond ${v.code}`)
  const js = vus.find((v) => v.chemin === '/sw.js')
  if (js && !/javascript/.test(js.type ?? '')) griefs.push(`/sw.js servi en ${js.type}`)
  if (js && js.octets < 200) griefs.push(`/sw.js ne fait que ${js.octets} octets : il est vide ou tronqué`)

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

/**
 * ── 🔴 ET LE GARDE N'A PAS ÉTÉ OUVERT TROP GRAND ───────────────────────────
 *
 * Deux chemins ont été NOMMÉS dans le garde. La tentation était d'ajouter
 * `.js` et `.html` à la liste d'extensions qui passent — ce qui aurait ouvert
 * tout ce qui finira un jour par s'y terminer, y compris ce que personne n'a
 * encore écrit. Cette sonde est là pour que cette tentation se voie si elle
 * revient.
 */
test('les écrans privés restent fermés sans session', async () => {
  const nu = await request.newContext({ baseURL: BASE })
  const vus = []
  for (const chemin of ['/parcours', '/gens', '/accueil', '/atlas']) {
    const r = await nu.get(chemin, { maxRedirects: 0 })
    vus.push({ chemin, code: r.status(), vers: r.headers()['location'] ?? null })
  }
  console.log(JSON.stringify(vus, null, 1))
  await nu.dispose()

  const griefs = vus
    .filter((v) => v.code === 200)
    .map((v) => `${v.chemin} répond 200 SANS session : le garde laisse passer`)
  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

connecte('l’ouvrier prend la main sur la page', async ({ page }) => {
  await page.goto('/parcours', { waitUntil: 'load' })
  /**
   * ⚠️ ON ATTEND QU'IL CONTRÔLE, pas qu'il soit enregistré. Un ouvrier peut
   * être installé sans piloter la page qui l'a posé — c'est même le cas par
   * défaut, et c'est pour ça que celui-ci appelle `clients.claim()`. Mesurer
   * l'enregistrement laisserait passer un ouvrier inerte.
   */
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker?.controller), { timeout: 30_000 })
    .toBe(true)

  const etat = await page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration('/')
    return { portee: r?.scope ?? null, actif: r?.active?.state ?? null }
  })
  console.log(JSON.stringify(etat, null, 1))
  // 🔴 LA PORTÉE DOIT ÊTRE LA RACINE : un ouvrier posé depuis un sous-dossier
  // ne verrait pas les navigations du reste de l'app, et Android ne
  // considérerait pas le site comme installable.
  expect(etat.portee, 'portée inattendue').toBe(`${BASE}/`)
  expect(etat.actif).toBe('activated')
})
