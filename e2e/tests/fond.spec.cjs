// LE DÉCOR DE L'ACCUEIL SE VOIT-IL VRAIMENT ?
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/fond.spec.cjs
//
// 🔴 TROIS DÉFAUTS MUETS ONT PRÉCÉDÉ CE DÉCOR, et aucun n'aurait été vu par
// une assertion de présence — l'élément était là à chaque fois :
//
//   ① DESSINÉ PUIS RECOUVERT. La coquille portait un doublon du fond que
//      `body` pose déjà, et le fond d'un élément en flux se peint APRÈS la
//      couche à z négatif. J'ai accusé l'opacité et je l'ai montée jusqu'à
//      0,14 sans rien voir.
//   ② TROP PÂLE POUR SE VOIR. 17 % : « je ne suis vraiment pas satisfait ».
//   ③ UN SOMBRE ATTÉNUÉ EN GUISE DE CLAIR. Le rendu sombre multiplié par un
//      facteur tombait à 0,11 en thème clair — et mes captures forçaient le
//      sombre, donc elles ne pouvaient PAS le dire.
//
// 🧭 D'où trois contrôles qui visent la CAUSE, et un quatrième qui prouve que
// la sonde sait échouer. Le piège de ①, c'est qu'un contrôle d'absence qui
// n'a jamais rien trouvé ne vaut rien.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

const COUCHES = '[aria-hidden="true"].fixed > div'

/** Les deux couches : opacité calculée, et si leur image se charge. */
const etatDesCouches = (sel) =>
  Promise.all(
    [...document.querySelectorAll(sel)].map(async (e) => {
      const s = getComputedStyle(e)
      const m = s.backgroundImage.match(/url\("([^"]+)"\)/)
      return {
        opacite: Number(s.opacity),
        url: m ? m[1].replace(/^https?:\/\/[^/]+/, '') : null,
        charge: m
          ? await new Promise((r) => {
              const i = new Image()
              i.onload = () => r(true)
              i.onerror = () => r(false)
              i.src = m[1]
            })
          : false,
      }
    }),
  )

for (const theme of ['dark', 'light']) {
  test(`thème ${theme} : une seule couche, allumée, et son image existe`, async ({
    page,
    pageErrors,
  }) => {
    await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('navigation', { name: 'Raccourcis' })).toBeVisible({
      timeout: 20_000,
    })
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme)

    const couches = await page.evaluate(etatDesCouches, COUCHES)
    expect(couches.length, 'il doit y avoir un rendu par thème').toBe(2)

    const allumees = couches.filter((c) => c.opacite > 0.01)
    expect(allumees.length, 'un seul rendu à la fois, jamais les deux').toBe(1)

    const [vue] = allumees
    // ② et ③ : le seuil est bas exprès — il n'approuve pas un réglage, il
    // refuse un décor qu'on ne voit pas.
    expect(vue.opacite, `décor trop pâle en ${theme}`).toBeGreaterThan(0.4)
    expect(vue.charge, `l'image ${vue.url} ne se charge pas`).toBe(true)
    // Le bon fichier pour le bon thème : un sombre servi en clair, c'est le
    // défaut ③ sous une autre forme.
    expect(vue.url).toContain(theme === 'dark' ? 'atlas-sombre' : 'atlas-clair')

    expect(pageErrors).toEqual([])
  })
}

test('① aucun fond opaque ne recouvre le décor, et la sonde sait le voir', async ({ page }) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  await expect(page.locator(COUCHES).first()).toHaveCount(1, { timeout: 20_000 })

  /**
   * Remonte du décor jusqu'à `body` et rend les ancêtres qui peignent un fond
   * OPAQUE : chacun recouvrirait la couche à z négatif.
   *
   * ⚠️ On lit la couleur CALCULÉE, pas la classe. `bg-[var(--color-fond)]`, un
   * `background` hérité d'une feuille ou une couleur en dur donnent le même
   * défaut et ne se ressemblent pas dans le source.
   */
  const recouvreurs = () =>
    page.evaluate((sel) => {
      const el = document.querySelector(sel)
      const trouves = []
      for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
        const p = getComputedStyle(n).backgroundColor.match(/[\d.]+/g)
        if (p && (p.length < 4 || parseFloat(p[3]) > 0)) trouves.push(n.className || n.tagName)
      }
      return trouves
    }, COUCHES)

  expect(await recouvreurs(), 'le décor est dessiné puis recouvert').toEqual([])

  // 🔴 ON REPRODUIT LE DÉFAUT pour prouver que la sonde le voit. Sans ça, ce
  // contrôle resterait vert même cassé.
  await page.evaluate((sel) => {
    document.querySelector(sel).closest('div.max-w-\\[430px\\]').style.background =
      'var(--color-fond)'
  }, COUCHES)
  expect(
    (await recouvreurs()).length,
    'la sonde ne voit pas le défaut qu’elle surveille',
  ).toBeGreaterThan(0)
})

test('les deux rendus sont le MÊME cadrage, pas deux photos', async ({ page }) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  await expect(page.locator(COUCHES).first()).toHaveCount(1, { timeout: 20_000 })

  /**
   * 🔴 LE DÉFAUT QUE CECI ATTRAPE, trouvé par Patrice à l'œil : les deux
   * rendus avaient été générés INDÉPENDAMMENT, donc c'étaient deux photos —
   * tête à 11 % du cadre dans l'une, 16 % dans l'autre. L'app changeait de
   * portrait quand on basculait le thème.
   *
   * 🧭 On mesure la PREMIÈRE RANGÉE QUI BOUGE : un fond plat a une variance
   * nulle, le haut de la tête la fait monter. Le critère ne dépend donc pas
   * de la clarté du fond, et c'est ce qui permet de comparer un rendu sombre
   * à un rendu clair.
   */
  const hauteurDeTete = (url) =>
    page.evaluate(
      (u) =>
        new Promise((res, rej) => {
          const i = new Image()
          i.onerror = () => rej(new Error('image illisible : ' + u))
          i.onload = () => {
            const c = document.createElement('canvas')
            c.width = i.naturalWidth
            c.height = i.naturalHeight
            const x = c.getContext('2d')
            x.drawImage(i, 0, 0)
            for (let y = 0; y < c.height; y += 2) {
              const d = x.getImageData(0, y, c.width, 1).data
              let somme = 0
              let carres = 0
              for (let p = 0; p < d.length; p += 4) {
                const l = 0.2126 * d[p] + 0.7152 * d[p + 1] + 0.0722 * d[p + 2]
                somme += l
                carres += l * l
              }
              const n = d.length / 4
              if (Math.sqrt(carres / n - (somme / n) ** 2) > 6) return res(y / c.height)
            }
            res(1)
          }
          i.src = u
        }),
      url,
    )

  /**
   * 🔴 LES ADRESSES SE LISENT SUR LA PAGE, ELLES NE S'ÉCRIVENT PAS ICI. Ma
   * première version portait `/fonds/atlas-sombre.webp` en dur ; le jour où
   * les fichiers ont pris un suffixe de version, la sonde est tombée sur deux
   * 404 et a crié sur un écran parfaitement correct. 🧭 **Une sonde qui
   * connaît un nom de fichier surveille le nom, pas le comportement** — et un
   * contrôle qui crie à tort cesse d'être écouté.
   */
  const adresses = await page.evaluate(
    (sel) =>
      [...document.querySelectorAll(sel)]
        .map((e) => getComputedStyle(e).backgroundImage.match(/url\("([^"]+)"\)/)?.[1])
        .filter(Boolean),
    COUCHES,
  )
  expect(adresses.length, 'il doit y avoir un rendu par thème').toBe(2)
  const sombre = await hauteurDeTete(adresses.find((u) => u.includes('sombre')))
  const clair = await hauteurDeTete(adresses.find((u) => u.includes('clair')))
  console.log(`  haut de la tête — sombre ${(sombre * 100).toFixed(0)} % · clair ${(clair * 100).toFixed(0)} %`)
  expect(
    Math.abs(sombre - clair),
    'les deux thèmes ne montrent pas le même cadrage',
  ).toBeLessThan(0.03)
})
