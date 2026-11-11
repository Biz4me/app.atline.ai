// LE DÉCOR D'UN MODULE MANGE-T-IL LE TEXTE ?
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/decor-module-contraste.spec.cjs
//
// ── 🧭 LA RÈGLE QUI EXISTAIT AVANT CETTE SONDE ────────────────────────────
//
// Elle est écrite dans `fond.tsx` depuis le 7 novembre 2026, pour le voile de
// l'accueil : *« il se règlera au contraste mesuré du texte le plus pâle sur
// la zone la plus claire de l'image, pas à l'œil »*. Personne ne l'avait
// jamais exécutée. Les onze objets de module la rendent indispensable : **ils
// ne se valent pas** — le sablier est bien plus clair que le phare, et un
// seul réglage d'opacité les sert tous.
//
// ── CE QU'ELLE MESURE, ET POURQUOI DANS CE SENS ───────────────────────────
//
// On EFFACE le contenu et on ne garde que le sol : fond de page + objet. Le
// pire point n'est pas le même selon le thème, et s'y tromper donnerait une
// sonde qui mesure le confort au lieu du danger :
//
//   · en CLAIR, l'encre est sombre et l'objet ASSOMBRIT le sol → le pire est
//     le point le plus SOMBRE du décor ;
//   · en SOMBRE, l'encre est pâle et l'objet ÉCLAIRCIT le sol → le pire est
//     le point le plus CLAIR.
//
// ⚠️ ET ON MESURE LE TEXTE POSÉ À NU, pas sur une carte. Sur cette page le
// titre et les libellés de leçon n'ont aucune carte sous eux : le voile ne
// les protège pas. Mesurer sur le cas protégé aurait donné un vert confortable
// et faux.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/**
 * ── ⚠️ DES PLANCHERS ABSOLUS, ET NON UNE PERTE RELATIVE ───────────────────
 *
 * Première version : « le décor n'a pas le droit de coûter plus d'un dixième
 * du contraste nu ». Mesuré, **c'est inatteignable** — un décor visible coûte
 * 30 à 40 %, et pour descendre à 10 % il faudrait une opacité de 0,05, le
 * chuchotement refusé sur l'accueil le 7 novembre.
 *
 * 🔴 ET LA PERTE RELATIVE CACHAIT LE VRAI CHIFFRE. En thème clair,
 * `--color-secondaire` sur `--color-fond` vaut **4,44 — déjà sous le plancher
 * de 4,5, sans aucun décor**. Le même « −35 % » part donc de 4,44 en clair et
 * de 7,21 en sombre : la même perte, deux situations sans rapport.
 *
 * 🧭 Ce qui compte n'est pas ce que le décor PREND, c'est ce qu'il LAISSE.
 *
 *   · l'encre ≥ 7 — elle part de 16, la marge est énorme ;
 *   · le gris ≥ 3,5 — le plancher des petits textes d'interface, avec un
 *     peu de marge. Il ne peut pas viser 4,5 : il n'y est déjà pas.
 *
 * ⚠️ Les 4,44 du gris en clair sont un défaut À PART, qui existait avant ce
 * décor et qu'il ne faut pas corriger en douce ici.
 */
const PLANCHER = { encre: 7, pale: 3.5 }

const luminance = ([r, g, b]) => {
  const f = (v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const contraste = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

/**
 * LE SOL SOUS CHAQUE MORCEAU DE TEXTE, lu au canvas dans la page.
 *
 * ── 🔴 LA PREMIÈRE VERSION PRENAIT LE PIXEL LE PLUS NOIR DE TOUT L'ÉCRAN ──
 *
 * Elle annonçait **32 à 43 % de perte** et condamnait les onze modules. Or le
 * point qu'elle désignait est un liseré d'ombre de quelques pixels, **sur
 * lequel aucun texte ne se pose** : pour le ramener dans les clous il aurait
 * fallu descendre l'opacité à 0,05, c'est-à-dire exactement le chuchotement
 * refusé sur l'accueil le 7 novembre.
 *
 * 🧭 **Une mesure trop sévère ne protège pas mieux : elle fait refuser ce qui
 * marche.** La question n'a jamais été « quel est le pire pixel de l'image »,
 * c'est **« que vaut le contraste LÀ OÙ LE TEXTE EST »**. On relève donc le
 * cadre de chaque morceau de texte, et on cherche le pire sol à l'intérieur de
 * ce cadre-là.
 *
 * ⚠️ Le cadre est plus large que les lettres — il contient les blancs entre
 * les mots. C'est volontaire : il reste conservateur, simplement il ne va plus
 * chercher le pire à l'autre bout de l'écran.
 */
const solSousLeTexte = async (page, theme, cadres) => {
  const b64 = (await page.screenshot()).toString('base64')
  return page.evaluate(
    async ({ b64, theme, cadres }) => {
      const img = new Image()
      img.src = `data:image/png;base64,${b64}`
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b
      let pire = null
      let pireL = theme === 'light' ? 1e9 : -1
      for (const r of cadres) {
        const x = Math.max(0, Math.round(r.x))
        const y = Math.max(0, Math.round(r.y))
        const w = Math.min(c.width - x, Math.round(r.w))
        const h = Math.min(c.height - y, Math.round(r.h))
        if (w < 1 || h < 1) continue
        const d = ctx.getImageData(x, y, w, h).data
        for (let i = 0; i < d.length; i += 4) {
          const p = [d[i], d[i + 1], d[i + 2]]
          const l = lum(p)
          if (theme === 'light' ? l < pireL : l > pireL) {
            pireL = l
            pire = p
          }
        }
      }
      return pire
    },
    { b64, theme, cadres },
  )
}

/** Les cadres des morceaux de texte qui portent une couleur donnée. */
const cadresDuTexte = (page, jetonCouleur) =>
  page.evaluate((n) => {
    const cible = getComputedStyle(document.documentElement).getPropertyValue(n).trim()
    const sonde = document.createElement('div')
    sonde.style.color = cible
    document.body.append(sonde)
    const attendu = getComputedStyle(sonde).color
    sonde.remove()
    const out = []
    for (const e of document.querySelectorAll('main *')) {
      if (e.hasAttribute('data-decor-objet')) continue
      // Seulement les éléments qui portent EUX-MÊMES du texte : sinon un
      // conteneur hérite la couleur et son cadre couvre la moitié de l'écran.
      const propre = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
      if (!propre) continue
      if (getComputedStyle(e).color !== attendu) continue
      const r = e.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) out.push({ x: r.x, y: r.y, w: r.width, h: r.height })
    }
    return out
  }, jetonCouleur)

const jeton = (page, nom) =>
  page.evaluate((n) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(n).trim()
    const d = document.createElement('div')
    d.style.color = v
    document.body.append(d)
    const m = getComputedStyle(d).color.match(/[\d.]+/g).slice(0, 3).map(Number)
    d.remove()
    return m
  }, nom)

test('decor-module-ne-mange-pas-le-texte', async ({ page }) => {
  await page.goto('/parcours/cours', { waitUntil: 'domcontentloaded' })
  const liens = await page
    .locator('a[href^="/parcours/"]')
    .evaluateAll((as) =>
      [...new Set(as.map((a) => a.getAttribute('href')))].filter(
        // ⚠️ `length === 3` ÉCARTE LA LEÇON EN COURS. La page porte aussi un
        // « reprendre » qui pointe DANS un module (`/parcours/<m>/<leçon>`) :
        // sans ce filtre on comptait douze modules sur onze, et la sonde
        // serait morte sur un chiffre faux sans rien dire du décor.
        (h) =>
          h &&
          h.split('/').length === 3 &&
          !['/parcours/cours', '/parcours/competences'].includes(h),
      ),
    )
  expect(liens.length, 'les onze modules ne sont pas tous listés').toBe(11)

  const lignes = []
  const fautes = []

  for (const theme of ['light', 'dark']) {
    for (const href of liens) {
      await page.goto(href, { waitUntil: 'domcontentloaded' })
      await page.emulateMedia({ colorScheme: theme })
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t
      }, theme)
      await page.locator('h2').first().waitFor({ timeout: 20_000 })

      const encre = await jeton(page, '--color-encre')
      const pale = await jeton(page, '--color-secondaire')
      const fond = await jeton(page, '--color-fond')

      // ⚠️ RELEVÉS AVANT D'EFFACER : un élément masqué garde son cadre, mais
      // on ne dépend pas de ce détail-là pour une mesure qui décide.
      const cadreEncre = await cadresDuTexte(page, '--color-encre')
      const cadrePale = await cadresDuTexte(page, '--color-secondaire')
      expect(
        cadreEncre.length + cadrePale.length,
        `${theme} ${href} : aucun texte trouvé, la mesure porterait sur rien`,
      ).toBeGreaterThan(2)

      /**
       * ON N'EFFACE PAS « LE CONTENU », ON NE GARDE QUE LE DÉCOR.
       *
       * 🔴 DEUX FAUSSES MESURES ONT PRÉCÉDÉ CETTE LIGNE, le 11 novembre 2026,
       * et aucune des deux n'a planté :
       *
       *   ① `main { visibility: hidden }` → **0 % de coût partout**. Le décor
       *      vit DANS `main`, la visibilité s'hérite : on mesurait un écran
       *      sans décor. 🧭 Un coût nul ressemble à une bonne nouvelle ;
       *      c'était une absence.
       *   ② cacher les enfants de `main` sauf la couture → **77 à 86 % de
       *      coût**, et un « sol » valant **exactement 154,160,166**, c'est-à-
       *      dire `--color-secondaire` lui-même. La BARRE DU BAS restait
       *      visible, ses libellés sont de cette couleur, et les cadres de
       *      texte qui descendent bas tombaient dessus. On mesurait le
       *      mobilier.
       *
       * 🧭 Les deux fautes sont la même : **énumérer ce qu'on cache**. On
       * exprime donc l'intention à l'envers — tout se tait, seule la couture
       * parle — et il n'y a plus rien à oublier.
       */
      await page.addStyleTag({
        content: `*{visibility:hidden !important}[data-decor-objet],[data-decor-objet] *{visibility:visible !important}`,
      })
      await page.waitForTimeout(250)
      const solEncre = await solSousLeTexte(page, theme, cadreEncre)
      const solPale = await solSousLeTexte(page, theme, cadrePale)
      const sol = solEncre ?? solPale

      /**
       * ⚠️ LE CONTRÔLE QUI MANQUAIT. Si le sol vaut exactement le fond de
       * page, c'est qu'il n'y a PAS de décor — et tout le reste dirait
       * « aucun coût » avec aplomb. C'est très exactement l'erreur commise
       * ici le 11 novembre 2026.
       */
      const absent = sol.every((c, i) => Math.abs(c - fond[i]) <= 1)
      expect(absent, `${theme} ${href} : le sol vaut le fond, il n’y a pas de décor`).toBe(false)

      const nu = { encre: contraste(encre, fond), pale: contraste(pale, fond) }
      const avec = {
        encre: contraste(encre, solEncre ?? fond),
        pale: contraste(pale, solPale ?? fond),
      }
      const perte = {
        encre: 1 - avec.encre / nu.encre,
        pale: 1 - avec.pale / nu.pale,
      }
      const num = href.split('/').pop().slice(-6)
      lignes.push(
        `${theme.padEnd(5)} ${num}  sol ${String(sol).padEnd(15)} ` +
          `encre ${nu.encre.toFixed(2)}→${avec.encre.toFixed(2)} (${(perte.encre * 100).toFixed(0)}%)  ` +
          `pâle ${nu.pale.toFixed(2)}→${avec.pale.toFixed(2)} (${(perte.pale * 100).toFixed(0)}%)`,
      )
      if (avec.encre < PLANCHER.encre || avec.pale < PLANCHER.pale)
        fautes.push(lignes[lignes.length - 1])
    }
  }

  console.log('\n' + lignes.join('\n') + '\n')
  expect(
    fautes,
    `le décor descend sous le plancher (encre ${PLANCHER.encre}, gris ${PLANCHER.pale}) :\n${fautes.join('\n')}`,
  ).toEqual([])
})

/**
 * ── 🔴 LA SONDE SAIT-ELLE ÉCHOUER ? ───────────────────────────────────────
 *
 * Elle a déjà menti deux fois ce jour-là — une fois en annonçant 0 % parce
 * qu'elle cachait le décor, une fois en annonçant 86 % parce qu'elle mesurait
 * la barre du bas. **Un vert de sa part ne se croit pas sur parole.** On
 * remonte donc l'opacité à 0,30 et on exige qu'elle crie.
 */
test('la-sonde-du-contraste-sait-echouer', async ({ page }) => {
  await page.goto('/parcours/cours', { waitUntil: 'domcontentloaded' })
  const href = await page
    .locator('a[href^="/parcours/"]')
    .evaluateAll(
      (as) =>
        as
          .map((a) => a.getAttribute('href'))
          .filter(
            (h) =>
              h &&
              h.split('/').length === 3 &&
              !['/parcours/cours', '/parcours/competences'].includes(h),
          )[0],
    )
  await page.goto(href, { waitUntil: 'domcontentloaded' })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'light'
    document.documentElement.style.setProperty('--decor-objet', '0.3')
  })
  await page.locator('h2').first().waitFor({ timeout: 20_000 })

  const pale = await jeton(page, '--color-secondaire')
  const cadres = await cadresDuTexte(page, '--color-secondaire')
  expect(cadres.length).toBeGreaterThan(0)
  await page.addStyleTag({
    content: `*{visibility:hidden !important}[data-decor-objet],[data-decor-objet] *{visibility:visible !important}`,
  })
  await page.waitForTimeout(250)
  const sol = await solSousLeTexte(page, 'light', cadres)
  const c = contraste(pale, sol)
  expect(c, `à 0,30 le gris devrait tomber sous ${PLANCHER.pale}, il vaut ${c.toFixed(2)}`).toBeLessThan(
    PLANCHER.pale,
  )
})
