// LE RACCORDEMENT DE L'AGENDA — le départ, et ce qui NE s'écrit pas.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/agenda-raccordement.spec.cjs
//
// 🔴 Le consentement lui-même n'est PAS joué : il appartient au compte Google
// de Patrice, et le donner à sa place n'est pas à moi. Ce qui se vérifie, et
// qui est l'essentiel, c'est tout ce qui l'encadre :
//
//   · l'adresse de retour envoyée à Google est EXACTEMENT celle déclarée dans
//     la console — un caractère de travers rend un `redirect_uri_mismatch` ;
//   · `include_granted_scopes`, sans quoi raccorder l'agenda RETIRERAIT les
//     permissions Gmail de V1 ;
//   · et 🔴 qu'un retour falsifié ou en échec n'écrit RIEN.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

const BASE = process.env.E2E_BASE || 'https://v2.atline.ai'

test('le départ vers Google porte ce qu’il faut', async ({ page }) => {
  // On ne SUIT pas la redirection : c'est son contenu qu'on inspecte.
  const r = await page.request.get('/api/calendar/connect', { maxRedirects: 0 })
  expect(r.status(), 'la route doit rediriger').toBeGreaterThanOrEqual(300)
  const vers = new URL(r.headers()['location'])

  expect(vers.origin + vers.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
  const p = vers.searchParams

  // 🔴 L'ADRESSE DE RETOUR, AU CARACTÈRE PRÈS. C'est cette chaîne exacte qui
  // est déclarée dans la console Google ; en changer un seul rend un écran
  // d'erreur Google et pas un message de l'application.
  expect(p.get('redirect_uri')).toBe(`${BASE}/api/calendar/callback`)

  // Le bon client : celui qu'Atline Web porte, pas celui de Cal.
  expect(p.get('client_id'), 'client_id vide').toBeTruthy()

  // 🔴 SANS CECI, ON COUPE GMAIL EN BRANCHANT L'AGENDA. Google remplace les
  // permissions au lieu de les cumuler.
  expect(p.get('include_granted_scopes')).toBe('true')

  // Le sélecteur de compte TOUJOURS (sinon on raccorde le mauvais compte en
  // silence), et `consent` pour obtenir un jeton de renouvellement — sans
  // lequel l'accès meurt dans une heure.
  expect(p.get('prompt')).toBe('select_account consent')
  expect(p.get('access_type')).toBe('offline')

  expect(p.get('scope')).toContain('https://www.googleapis.com/auth/calendar.readonly')
  // ⚠️ Et RIEN de plus que ce qu'on vient demander : pas de Gmail glissé dans
  // la même demande. On ne demande jamais tout d'un coup.
  expect(p.get('scope')).not.toContain('gmail')

  expect(p.get('state'), 'pas d’état : la garde CSRF n’existe pas').toBeTruthy()
})

test('un retour falsifié ou en échec n’écrit RIEN', async ({ page }) => {
  // L'état du raccordement AVANT.
  await page.goto('/agenda/connexion', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: 'Mon agenda' })).toBeVisible({
    timeout: 20_000,
  })
  const avant = await page.locator('main').innerText()

  // ── 1. ÉTAT FALSIFIÉ ──
  // 🔴 Sans la comparaison au cookie, le code d'autorisation de n'importe qui
  // pourrait aboutir dans la session d'un autre — et le compte raccordé ne
  // serait pas celui qu'on croit.
  const faux = await page.request.get('/api/calendar/callback?code=bidon&state=pas-le-bon', {
    maxRedirects: 0,
  })
  expect(faux.headers()['location']).toContain('resultat=erreur')

  // ── 2. ÉTAT VALABLE, CODE INVALIDE ──
  // Le vrai chemin d'échec : Google refuse l'échange. Rien ne doit s'écrire
  // non plus — et surtout pas une connexion sans jeton utilisable.
  const depart = await page.request.get('/api/calendar/connect', { maxRedirects: 0 })
  const etat = new URL(depart.headers()['location']).searchParams.get('state')
  const rate = await page.request.get(
    `/api/calendar/callback?code=bidon&state=${encodeURIComponent(etat)}`,
    { maxRedirects: 0 },
  )
  expect(rate.headers()['location']).toContain('resultat=')
  expect(rate.headers()['location']).not.toContain('resultat=ok')

  // ── L'état n'a pas bougé ──
  await page.goto('/agenda/connexion', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: 'Mon agenda' })).toBeVisible()
  expect(
    (await page.locator('main').innerText()).replace(/\s+/g, ' '),
    'le raccordement a changé alors que tout a échoué',
  ).toBe(avant.replace(/\s+/g, ' '))
})
