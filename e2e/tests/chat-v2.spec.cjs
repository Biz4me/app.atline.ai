// LE CHAT D'ATLAS — ce que la refonte du 10 novembre 2026 doit tenir.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/chat-v2.spec.cjs
//
// 🔴 Trois des quatre contrôles visent une MESURE, pas une apparence : la
// taille de lecture, le contraste de la bulle, et le fait qu'une seule chose
// soit pleine à la fois. Un contrôle d'apparence se périme au premier
// changement de goût ; ceux-ci gardent des décisions.

const { test, expect } = require('../fixtures.cjs')

/**
 * ── 🔴 CES TROIS SONDES FABRIQUENT LEUR FIL (23 novembre 2026) ─────────────
 *
 * Elles lisent le fil d'Atlas : l'échelle de ses bulles, et le fait que la
 * bulle « moi » se VOIE sur le fond — un vrai défaut, mesuré le 10 novembre
 * 2026 à **1,07 : 1** là où la règle en demande 3. Il leur faut donc au moins
 * un échange.
 *
 * 🧭 ET AUCUN COMPTE DE LA BASE NE LES NOURRIT. Le compte de référence porte
 * 34 contacts et **zéro message** ; celui qui a des messages n'a que trois
 * contacts. Choisir l'un affame les sondes de l'autre — c'est la leçon du
 * 23 novembre, et elle ne se règle pas en changeant de compte.
 *
 * ⚠️ ELLES ONT SAUTÉ UNE NUIT, EN NOMMANT CE QUI MANQUAIT. C'est la troisième
 * option du harnais, après « fabriquer » et « mesurer la structure », et elle
 * ne prouve rien : un saut dit seulement ce qu'il faudrait. Le lendemain, on
 * l'a fabriqué.
 *
 * 🧭 LA FIXTURE `fil` POSE DEUX MESSAGES EN BASE, « moi » d'abord, et les
 * retire après. **Aucun appel au modèle** : faire répondre Atlas coûterait à
 * chaque passage, pour une question qui ne porte que sur du dessin.
 */

test.use({ viewport: { width: 390, height: 844 } })

/**
 * ÉCART PERCEPTIF (ΔE, CIELAB) entre une couleur et son fond, calculé DANS la
 * page, EN PEIGNANT.
 *
 * ── 🔴 DEUX INSTRUMENTS FAUX AVANT CELUI-CI ──────────────────────────────
 *
 * ① **Une regex sur `getComputedStyle().color`.** Elle a annoncé
 *    **1,1 : 1 en sombre et 19,2 : 1 en clair pour la MÊME couleur** —
 *    impossible, donc instrument faux. Chrome rend un `color-mix()` sous la
 *    forme `color(srgb 0.97 0.45 0.09 / 0.14)`, et la regex prenait `0.97`
 *    pour un rouge sur 255 : elle mesurait du noir, qui se détache en clair
 *    et disparaît en sombre. Exactement les deux chiffres observés.
 *
 * ② **Le rapport de contraste WCAG**, même une fois la couleur correctement
 *    composée. Mesuré sur les deux bulles, dans les deux thèmes :
 *
 *      ancienne  1,07 → teintée 1,20  (sombre)
 *      ancienne  1,09 → teintée 1,15  (clair)
 *
 *    Il ne bouge presque pas, alors que l'œil voit une différence nette sur
 *    la capture. 🧭 **Le rapport WCAG ne mesure QUE la luminance : il est
 *    aveugle à la teinte.** Or c'est précisément la teinte qui fait le
 *    travail ici. Un instrument aveugle à ce qu'on a changé ne peut pas dire
 *    si on l'a bien changé.
 *
 * ── CE QUI SÉPARE VRAIMENT, mesuré avant d'être choisi ───────────────────
 *
 *      ancienne  ΔE 3,8 → teintée ΔE 16,9  (sombre)
 *      ancienne  ΔE 3,5 → teintée ΔE 11,2  (clair)
 *
 * Un facteur 3 à 4, dans les deux thèmes. Le seuil est posé à **8**, entre
 * les deux groupes et loin des deux — pas réglé pour faire passer le test.
 *
 * 🧭 ON PEINT PLUTÔT QUE DE PARSER : un canevas résout toutes les notations
 * CSS, et surtout il COMPOSE l'alpha. Une teinte à 14 % n'est pas de
 * l'orange, c'est de l'orange MÉLANGÉ à ce qu'il y a dessous — et c'est ce
 * mélange que l'œil voit.
 */
const ECART = `(() => {
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  const peindre = (couches) => {
    const c = document.createElement('canvas'); c.width = c.height = 1
    const x = c.getContext('2d')
    for (const col of couches) { x.fillStyle = col; x.fillRect(0, 0, 1, 1) }
    const d = x.getImageData(0, 0, 1, 1).data
    return [d[0], d[1], d[2]]
  }
  const lab = (rgb) => {
    const [r, g, b] = rgb.map(lin)
    const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
    const Y = r * 0.2126 + g * 0.7152 + b * 0.0722
    const Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883
    const t = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116)
    const fx = t(X), fy = t(Y), fz = t(Z)
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
  }
  return (dessus, fond) => {
    const a = lab(peindre([fond, dessus])), b = lab(peindre([fond]))
    return Math.round(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * 10) / 10
  }
})()`

/**
 * OUVRIR UN FIL QUI A DU TEXTE DEDANS.
 *
 * 🔴 `/atlas` TOUT NU NE MARCHE PLUS DEPUIS LE 16 NOVEMBRE 2026. Patrice :
 * *« chaque matin je veux que Atlas s'ouvre sur une nouvelle conversation
 * avec un mantra différent »*. La porte d'entrée est donc un fil VIDE, et
 * ces deux sondes — qui mesurent l'interligne des bulles et le contraste de
 * la bulle « moi » — n'avaient plus rien à mesurer.
 *
 * ⚠️ ELLES NE SE TAISAIENT PAS, elles criaient « la sonde ne mesure rien ».
 * C'est la seule raison pour laquelle on a su quoi réparer : un contrôle qui
 * trouve zéro élément et se déclare content est un contrôle qui ment.
 *
 * 🧭 On prend donc le premier JOUR de l'historique plutôt qu'un identifiant
 * figé : il suit le compte, il ne se périme pas, et il porte forcément des
 * échanges — c'est ce qui en fait un jour.
 */
const ouvrir = async (page, theme) => {
  await page.goto('/atlas?historique=jours', { waitUntil: 'domcontentloaded' })
  const premierJour = page.locator('a[href^="/atlas?jour="]').first()
  await expect(premierJour, 'aucun jour dans l’historique : rien à lire').toBeVisible({
    timeout: 20_000,
  })
  await page.goto(await premierJour.getAttribute('href'), { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-composeur]')).toBeVisible({ timeout: 20_000 })
  if (theme) {
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme)
    await page.waitForTimeout(250)
  }
}

test('le fil se lit en 17 sur 26, et rien n’est hors échelle', async ({ page, pageErrors, fil }) => {
  // La fixture `fil` pose deux messages avant l'ouverture : sans eux il n'y a
  // pas de bulle à mesurer. Voir l'explication en tête de fichier.
  expect(fil.id, 'le fil jetable n’a pas été créé').toBeTruthy()
  await ouvrir(page)

  /**
   * 🔴 CE QU'ON GARDE N'EST PAS « 17 », C'EST « SUR L'ÉCHELLE ». Le défaut
   * n'était pas une taille trop petite mais une interligne INVENTÉE :
   * `leading-relaxed` sur 15 px donne 24,4, et l'échelle n'apparie 15 qu'avec
   * 21. On vérifie donc que la paire lue appartient aux six de `globals.css`.
   */
  const paires = await page.evaluate(() => {
    const v = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim()
    const echelle = ['display', 'titre', 'lecture', 'corps', 'label', 'micro'].map((n) => ({
      nom: n,
      taille: v(`--text-${n}`),
      interligne: v(`--text-${n}--line-height`),
    }))
    const bulles = [...document.querySelectorAll('main p, main div')].filter(
      (e) => e.className && String(e.className).includes('whitespace-pre-wrap'),
    )
    return {
      echelle,
      lus: bulles.slice(0, 6).map((e) => {
        const s = getComputedStyle(e.parentElement)
        return { taille: s.fontSize, interligne: s.lineHeight }
      }),
    }
  })

  expect(paires.lus.length, 'aucun bloc de texte trouvé : la sonde ne mesure rien').toBeGreaterThan(
    0,
  )
  console.log(`  lus : ${paires.lus.map((p) => `${p.taille}/${p.interligne}`).join(' · ')}`)

  const lecture = paires.echelle.find((e) => e.nom === 'lecture')
  expect(lecture.taille, 'l’échelle a changé sous la sonde').toBe('17px')

  // 🔴 ON PROUVE QUE LE DÉTECTEUR DÉTECTE : la paire fautive du 9 novembre
  // (15 px sur 24,4) ne doit appartenir à aucune des six.
  const surLEchelle = (t, i) =>
    paires.echelle.some((e) => e.taille === t && e.interligne === i)
  expect(surLEchelle('15px', '24.4px'), 'la sonde ne verrait pas la faute').toBe(false)
  expect(surLEchelle('17px', '26px'), 'la sonde ne reconnaît pas sa propre échelle').toBe(true)

  for (const { taille, interligne } of paires.lus) {
    expect(
      surLEchelle(taille, interligne),
      `le fil se lit en ${taille}/${interligne} — hors des six tailles`,
    ).toBe(true)
  }
  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})

for (const theme of ['dark', 'light']) {
  test(`la bulle « moi » se VOIT, en ${theme}`, async ({ page, fil }) => {
    /**
     * 🔴 LE DÉFAUT MESURÉ LE 10 NOVEMBRE 2026 : la bulle était à
     * `--color-surface` sur `--color-fond`, soit **1,07 : 1** en sombre et
     * **1,09 : 1** en clair. WCAG 1.4.11 demande 3 : 1 pour qu'une FORME
     * d'interface se distingue de son fond.
     *
     * ⚠️ ON NE FIGE PAS LA TEINTE, on fige le fait qu'elle se voie. Demain on
     * peut la vouloir autrement — pas invisible.
     */
    await ouvrir(page, theme)
    const m = await page.evaluate(
      ([src]) => {
        const ecart = eval(src)
        const bulle = [...document.querySelectorAll('main div')].find((e) =>
          String(e.className || '').includes('self-end'),
        )
        if (!bulle) return null
        const s = getComputedStyle(bulle)
        const fond = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-fond')
          .trim()
        return {
          teinte: ecart(s.backgroundColor, fond),
          bordure: ecart(s.borderTopColor, fond),
          // Le témoin : ce que valait l'ancienne bulle, ICI et MAINTENANT —
          // pas un chiffre recopié d'hier.
          avant: ecart(
            getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim(),
            fond,
          ),
        }
      },
      [ECART],
    )
    expect(m, 'aucune bulle « moi » dans le fil : la sonde ne mesure rien').not.toBeNull()
    console.log(
      `  ${theme} — teinte ΔE ${m.teinte} · bordure ΔE ${m.bordure} · l’ancienne valait ΔE ${m.avant}`,
    )

    // 🔴 LE DÉTECTEUR SE PROUVE SUR LE VRAI DÉFAUT, mesuré en direct : si
    // l'ancienne bulle passait ce seuil, le contrôle ne garderait rien.
    expect(m.avant, 'la sonde ne verrait pas l’ancienne bulle invisible').toBeLessThan(8)

    // La bulle se distingue par sa teinte OU par sa bordure : on garde le
    // RÉSULTAT, pas le moyen — demain elle peut être autrement, pas invisible.
    expect(
      Math.max(m.teinte, m.bordure),
      `la bulle est à ΔE ${m.teinte} (bordure ΔE ${m.bordure}) — on ne la voit pas`,
    ).toBeGreaterThan(8)
  })
}

test('une seule chose PLEINE à la fois dans le composeur', async ({ page }) => {
  /**
   * 🔴 LA RÈGLE QUE ÇA GARDE : le plein désigne l'action principale de
   * l'instant. Champ vide → « Parler ». Du texte → « Envoyer », et « Parler »
   * redescend. Deux pleins, et l'orange ne dirait plus rien — la mire de
   * l'en-tête et les cartes « Ouvrir » le portent déjà dans le même écran.
   */
  await ouvrir(page, 'dark')

  const pleins = () =>
    page.evaluate(() => {
      const atlas = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-atlas')
        .trim()
      const d = document.createElement('div')
      d.style.color = atlas
      document.body.appendChild(d)
      const ref = getComputedStyle(d).color
      d.remove()
      return [...document.querySelectorAll('[data-composeur] button')]
        .filter((b) => getComputedStyle(b).backgroundColor === ref)
        .map((b) => b.dataset.bouton || b.textContent.trim())
    })

  // ⚠️ ON PROUVE QUE LE DÉTECTEUR VOIT UN PLEIN avant de compter : sans ça,
  // « zéro plein » passerait au vert alors que plus rien ne s'allume.
  expect(await pleins(), 'champ vide : c’est « Parler » qui est plein').toEqual(['Parler'])

  await page.locator('[data-composeur] textarea').fill('Prépare-moi l’appel de demain')
  await page.waitForTimeout(150)
  expect(await pleins(), 'avec du texte : c’est « Envoyer » qui est plein').toEqual(['Envoyer'])

  // ⚠️ Et on NE L'ENVOIE PAS : cette sonde ne doit rien écrire dans le vrai
  // fil de Patrice. On vide le champ et on s'en va.
  await page.locator('[data-composeur] textarea').fill('')
})

test('le champ grandit avec le texte, et redescend', async ({ page }) => {
  await ouvrir(page, 'dark')
  const champ = page.locator('[data-composeur] textarea')
  const h = async () => (await champ.boundingBox()).height

  const vide = await h()
  await champ.fill('une ligne\ndeux lignes\ntrois lignes\nquatre lignes')
  await page.waitForTimeout(200)
  const plein = await h()
  console.log(`  champ : ${Math.round(vide)} px vide · ${Math.round(plein)} px à quatre lignes`)
  expect(plein, 'le champ ne grandit pas').toBeGreaterThan(vide + 20)

  // 🔴 ET IL REDESCEND. `height = 'auto'` avant de lire `scrollHeight` : sans
  // ça le champ ne sait que grandir, et une boîte haute reste haute.
  await champ.fill('court')
  await page.waitForTimeout(200)
  expect(Math.round(await h()), 'le champ ne rétrécit pas').toBeLessThanOrEqual(Math.round(vide) + 2)
  await champ.fill('')
})
