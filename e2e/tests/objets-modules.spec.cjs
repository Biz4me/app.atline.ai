// LES ONZE OBJETS DES MODULES.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/objets-modules.spec.cjs
//
// ── 🔴 ELLE A CHANGÉ DE PRISE LE 11 NOVEMBRE 2026 ─────────────────────────
//
// L'objet était une vignette `<img data-objet-module>` de 112 px ; il est
// devenu le DÉCOR plein écran de la page, un fond CSS porté par
// `[data-decor-objet]`. Cette sonde est passée au rouge, et **c'est ce qu'on
// lui demande** : elle surveillait une balise qui n'existe plus.
//
// 🧭 On la déplace, on ne la remplace pas. Ce qu'elle prouve n'a pas changé
// d'un pouce : **chaque module porte SON objet, et les octets arrivent
// vraiment.** Une erreur d'un caractère dans le nom donnerait onze fois la
// même image — toutes vertes, et personne ne le verrait.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('chacun des onze modules porte SON objet, et l’image arrive vraiment', async ({
  page,
  pageErrors,
}) => {
  await page.goto('/parcours/cours', { waitUntil: 'domcontentloaded' })
  const liens = page.locator('main a[href^="/parcours/"]')
  await expect(liens.first()).toBeVisible({ timeout: 20_000 })

  const adresses = await liens.evaluateAll((n) =>
    [...new Set(n.map((e) => e.getAttribute('href')).filter((h) => /^\/parcours\/[a-z0-9]+$/.test(h)))],
  )
  // 🔴 CE QU'ON ATTEND, DÉCLARÉ. Sans ce compte, une liste vide ferait une
  // boucle qui ne tourne pas et un test vert qui n'a rien regardé.
  expect(adresses, 'la liste ne donne pas onze modules').toHaveLength(11)

  const vus = new Set()
  for (const adresse of adresses) {
    await page.goto(adresse, { waitUntil: 'domcontentloaded' })
    const decor = page.locator('[data-decor-objet]')
    await expect(decor).toHaveCount(1, { timeout: 20_000 })

    /**
     * 🔴 UN FOND CSS N'A PAS DE `naturalWidth` — donc on le charge pour de
     * bon. C'est le même détour que `fond.spec.cjs` pour le décor de
     * l'accueil, et il reste indispensable : **un 404 ne se voit pas** sur un
     * fond CSS. Pas d'icône cassée, pas d'erreur console, rien. L'écran est
     * simplement nu, et un contrôle de présence le valide.
     */
    const etat = await decor.evaluate(async (e) => {
      const inner = e.querySelector('div') ?? e
      const s = getComputedStyle(inner)
      const m = s.backgroundImage.match(/url\("([^"]+)"\)/)
      if (!m) return { numero: e.getAttribute('data-decor-objet'), url: null }
      const url = m[1]
      const img = new Image()
      img.src = url
      const ok = await new Promise((r) => {
        img.onload = () => r(true)
        img.onerror = () => r(false)
      })
      return {
        numero: e.getAttribute('data-decor-objet'),
        url: url.replace(/^https?:\/\/[^/]+/, ''),
        charge: ok,
        largeur: img.naturalWidth,
        hauteur: img.naturalHeight,
        taille: s.backgroundSize,
        opacite: Number(s.opacity),
      }
    })

    expect(etat.url, `${adresse} : aucun fond sur la couture du décor`).toBeTruthy()
    expect(etat.charge, `${adresse} : ${etat.url} n'a pas chargé (404 ?)`).toBe(true)
    expect(etat.largeur, `${adresse} : ${etat.url} est vide`).toBeGreaterThan(0)
    // Carrées, toutes : c'est ce qui fait tenir la famille.
    expect(etat.largeur).toBe(etat.hauteur)
    // ⚠️ ET IL SE VOIT. Une opacité tombée à zéro laisserait tout le reste au
    // vert pour un écran sans décor — la faute exacte commise ce jour-là par
    // la sonde du contraste.
    expect(etat.opacite, `${adresse} : décor invisible (opacité ${etat.opacite})`).toBeGreaterThan(
      0.04,
    )

    expect(etat.url).toContain(`/modules/m${String(etat.numero).padStart(2, '0')}.`)
    expect(vus.has(etat.url), `${etat.url} servi deux fois`).toBe(false)
    vus.add(etat.url)
  }

  expect(vus.size, 'onze objets distincts attendus').toBe(11)
  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toHaveLength(0)
})

test('la liste des modules, elle, n’en porte aucun', async ({ page }) => {
  // 🧭 Décidé sur mesure le 9 novembre : la carte de la liste offre `W − 100`
  // px au titre, et un objet lisible y ferait passer un titre de 64 caractères
  // à quatre lignes. Le passage de la vignette au décor n'y change rien — onze
  // objets dans une liste qu'on parcourt du regard seraient le bruit qu'on a
  // refusé pour les compétences.
  await page.goto('/parcours/cours', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main a[href^="/parcours/"]').first()).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('[data-decor-objet]')).toHaveCount(0)
  // ⚠️ L'ANCIENNE PRISE AUSSI : si une vignette `data-objet-module` revenait,
  // ce contrôle doit la voir. Retirer son nom d'ici, c'est rouvrir la porte.
  await expect(page.locator('[data-objet-module]')).toHaveCount(0)
})

test('une leçon n’a pas de décor', async ({ page }) => {
  // 🧭 Tranché avec Patrice avant d'écrire une ligne : une leçon est un texte
  // qu'on lit longtemps, et un décor derrière un long texte se paie en
  // fatigue, pas en caractère. Sans ce contrôle, la décision ne vit que dans
  // un commentaire.
  await page.goto('/parcours/cours', { waitUntil: 'domcontentloaded' })
  const module = await page
    .locator('main a[href^="/parcours/"]')
    .evaluateAll((n) => n.map((e) => e.getAttribute('href')).find((h) => /^\/parcours\/[a-z0-9]+$/.test(h)))
  await page.goto(module, { waitUntil: 'domcontentloaded' })
  const lecon = page.locator('main a[href^="/parcours/"]').first()
  await expect(lecon).toBeVisible({ timeout: 20_000 })
  await lecon.click()
  await expect(page.locator('h1')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('[data-decor-objet]')).toHaveCount(0)
})
