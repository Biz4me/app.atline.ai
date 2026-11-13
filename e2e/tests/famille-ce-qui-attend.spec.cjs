// LA FAMILLE « CE QUI T'ATTEND » — invisible faute de matière, prouvée quand même.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/famille-ce-qui-attend.spec.cjs
//
// ── 🔴 POURQUOI CETTE SONDE SÈME AU LIEU DE REGARDER ──────────────────────
//
// Le compte de travail n'a **aucun rendez-vous à venir** — mesuré le
// 13 novembre 2026 : zéro. La famille ne s'affiche donc jamais, et sans ce
// test on aurait livré une surface que personne ne peut voir et qu'aucune
// sonde ne peut exercer. C'est la famille de défauts qu'on a passé la semaine
// à retirer d'ailleurs : du code qui a l'air juste parce qu'il ne tourne pas.
//
// 🧭 Une surface qu'on ne peut pas prouver n'est pas finie. Alors on lui
// fabrique sa matière, le temps du test.
//
// ⚠️ LE RENDEZ-VOUS EST POSÉ SUR LE CONTACT JETABLE, comme tout ce que les
// tests écrivent, et ce fichier le supprime lui-même. Aucun rendez-vous réel
// n'est touché, et il ne reste rien après le passage.

const { test, expect, poserRdv, retirerRdv } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** Dans 26 h : assez loin pour ne pas tomber le jour même, assez près pour « sous 7 jours ». */
const HEURES = 26

test('elle apparaît dès qu’un rendez-vous existe, et dit dans combien de temps', async ({
  page,
  seed,
  pageErrors,
}) => {
  // ── CONTRÔLE NÉGATIF : avant de semer, la famille ne doit PAS être là ──
  // Sans lui, un rail affiché pour une tout autre raison ferait passer la
  // suite du test, et on prouverait l'inverse de ce qu'on croit.
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-tuile]').first()).toBeVisible({ timeout: 20_000 })
  expect(
    await page.locator('[data-tuile="prochain"]').count(),
    'un rendez-vous à venir existe déjà : ce test ne prouverait rien',
  ).toBe(0)

  const { rid } = poserRdv(seed.cid, HEURES)

  try {
    await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
    const prochain = page.locator('[data-tuile="prochain"]')
    await expect(prochain, 'la famille ne s’affiche pas alors qu’un rendez-vous existe').toBeVisible(
      { timeout: 20_000 },
    )

    // ── LE CHIFFRE EST UNE DURÉE, ET ELLE DOIT ÊTRE JUSTE ──
    // 26 h posées, donc « 26 » en heures (le seuil des jours est à 48).
    const texte = await prochain.innerText()
    const n = parseInt(texte, 10)
    expect(n, `la tuile annonce « ${texte.split('\n')[0]} », on attendait ~${HEURES}`).toBeGreaterThan(
      HEURES - 2,
    )
    expect(n).toBeLessThanOrEqual(HEURES)
    expect(texte.toLowerCase(), 'sous 48 h, la tuile doit parler en HEURES').toContain('heures')

    // Elle mène à l'agenda, et le « Tout voir » de la famille aussi.
    expect(await prochain.getAttribute('href')).toBe('/agenda')

    expect(pageErrors).toEqual([])
  } finally {
    // ⚠️ `finally` : un échec d'assertion ne doit pas laisser un rendez-vous
    // derrière lui. C'est la seule chose de ce fichier qui écrit en base.
    retirerRdv(rid)
  }

  // ── ET ELLE DISPARAÎT QUAND LA MATIÈRE DISPARAÎT ──
  // 🧭 Un rail qui resterait affiché à vide annoncerait « 0 », et un zéro
  // affiché fait d'une absence une information.
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-tuile]').first()).toBeVisible({ timeout: 20_000 })
  expect(await page.locator('[data-tuile="prochain"]').count()).toBe(0)
})
