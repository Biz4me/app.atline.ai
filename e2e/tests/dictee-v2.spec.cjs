// LA DICTÉE DE V2 — la chaîne entière, de bout en bout.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/dictee-v2.spec.cjs
//
// 🔴 CE QU'ON NE PEUT PAS PROUVER ICI, ET QU'IL FAUT DIRE : la transcription
// elle-même. Chrome sans tête n'a pas de micro, donc `getUserMedia` échoue et
// le bouton ne démarre rien. Ce que cette sonde garde, c'est **tout le reste
// de la chaîne** — et c'est précisément ce qui cassait en silence :
//
//   · le TICKET est délivré, signé, et refusé à un anonyme ;
//   · le WebSocket est ROUTÉ sur v2 (il ne l'était que sur app.atline.ai, et
//     une dictée qui tombe sur la page d'authentification ne dit rien) ;
//   · le REPLI répond ;
//   · le micro n'apparaît QUE si la dictée est possible.
//
// ⚠️ Le vrai chemin audio doit être éprouvé sur le téléphone de Patrice.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('le ticket est signé, et refusé à qui n’est pas connecté', async ({ page, request }) => {
  await page.goto('/atlas', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-composeur]')).toBeVisible({ timeout: 20_000 })

  const t = await page.evaluate(async () => {
    const r = await fetch('/api/stt/ticket', { method: 'POST' })
    return { statut: r.status, corps: await r.json().catch(() => ({})) }
  })
  expect(t.statut, `le ticket répond ${t.statut}`).toBe(200)
  expect(typeof t.corps.ticket, 'pas de ticket dans la réponse').toBe('string')

  // ⚠️ IL A LA FORME ATTENDUE : une charge base64url, un point, une signature
  // de 64 caractères hexadécimaux. Un ticket vide ou tronqué ferait ouvrir un
  // WebSocket qui se refermerait sans un mot.
  expect(t.corps.ticket, `ticket mal formé : ${t.corps.ticket}`).toMatch(
    /^[A-Za-z0-9_-]+\.[0-9a-f]{64}$/,
  )
  const charge = JSON.parse(Buffer.from(t.corps.ticket.split('.')[0], 'base64url').toString())
  console.log(`  ticket : uid ${charge.uid.slice(0, 8)}… · expire dans ${charge.exp - Math.floor(Date.now() / 1000)} s`)
  expect(charge.uid, 'le ticket ne porte personne').toBeTruthy()
  // Court exprès : c'est un laissez-passer, pas une session.
  expect(charge.exp - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(130)

  // 🔴 ET L'INVERSE, celui qu'on oublie : sans session, pas de ticket. Sans
  // ce contrôle, la route serait une porte ouverte sur notre Deepgram.
  const anonyme = await request.post('/api/stt/ticket')
  expect(
    [401, 302, 307].includes(anonyme.status()),
    `un anonyme obtient ${anonyme.status()} sur le ticket`,
  ).toBe(true)
})

test('le WebSocket est ROUTÉ sur v2, pas avalé par l’application', async ({ request }) => {
  /**
   * 🔴 LE DÉFAUT QUE CE CONTRÔLE GARDE. `/sttws` n'était routé que sur
   * `app.atline.ai` : sur v2 il tombait dans l'application, qui répondait
   * **307 vers la page d'authentification**. Le navigateur aurait ouvert un
   * WebSocket vers une redirection, il se serait refermé sans un mot, et la
   * dictée serait passée au repli POST — donc elle aurait MARCHÉ, en plus
   * lent, sans que personne sache pourquoi.
   *
   * 🧭 On ne mesure pas « ça répond », on mesure **QUI répond** : 404 vient
   * du service de reconnaissance (un GET sur une adresse de WebSocket), 307
   * vient de Next. Les deux sont des « échecs » ; un seul est le bon.
   */
  const r = await request.get('/sttws/stream', { maxRedirects: 0 })
  console.log(`  /sttws/stream sur v2 : ${r.status()}`)
  expect(
    r.status(),
    `/sttws répond ${r.status()} : 307 voudrait dire qu'il tombe dans l'app, pas dans le service`,
  ).not.toBe(307)
  expect(r.status(), 'le service de reconnaissance ne répond pas').toBe(404)
})

test('le repli répond, et refuse un envoi vide', async ({ page }) => {
  await page.goto('/atlas', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-composeur]')).toBeVisible({ timeout: 20_000 })

  const vide = await page.evaluate(async () => {
    const r = await fetch('/api/stt', { method: 'POST', body: new Blob([]) })
    return r.status
  })
  console.log(`  /api/stt sur un envoi vide : ${vide}`)
  expect(vide, 'un envoi vide devrait être refusé proprement').toBe(400)
})

test('le micro est là, il se maintient, et il ne s’allume pas tout seul', async ({ page }) => {
  await page.goto('/atlas', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-composeur]')).toBeVisible({ timeout: 20_000 })

  const micro = page.locator('[data-dicter]')
  await expect(micro, 'pas de micro dans le composeur').toHaveCount(1)
  await expect(micro).toHaveAttribute('aria-label', 'Maintenir pour dicter')

  /**
   * ⚠️ LES GARDES TACTILES SE VÉRIFIENT, parce qu'elles ne se voient pas.
   * Sans `touch-none`, maintenir le micro fait DÉFILER la page sous le
   * doigt ; sans `select-none`, le mot se surligne en bleu. Deux gênes qu'on
   * ne reproduit pas sur un bureau, et qu'on ne remarquerait donc jamais ici.
   */
  const s = await micro.evaluate((e) => {
    const c = getComputedStyle(e)
    return { touche: c.touchAction, selection: c.userSelect || c.webkitUserSelect }
  })
  console.log(`  micro : touch-action ${s.touche} · user-select ${s.selection}`)
  expect(s.touche, 'sans touch-none, le maintien fait défiler la page').toBe('none')
  expect(s.selection, 'sans select-none, le maintien surligne').toBe('none')

  // 🔴 IL NE DOIT PAS ÊTRE ALLUMÉ AU REPOS. L'attribut n'est posé que pendant
  // l'enregistrement : si on le trouvait ici, le micro serait ouvert sans que
  // personne l'ait demandé.
  await expect(micro).not.toHaveAttribute('data-enregistre', '')
})
