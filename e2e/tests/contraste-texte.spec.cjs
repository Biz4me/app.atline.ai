// TOUT LE TEXTE DE L'APP EST-IL LISIBLE ?
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/contraste-texte.spec.cjs
//
// ── 🔴 CE QUI L'A FAIT NAÎTRE (11 novembre 2026) ──────────────────────────
//
// En réglant l'opacité du décor des modules, une mesure de côté a sorti un
// chiffre qu'on ne cherchait pas : **`--color-secondaire` sur `--color-fond`
// en thème clair vaut 4,43 — déjà sous le plancher de 4,5, sans aucun
// décor.** Le même gris sur une carte blanche vaut 4,83 : c'est donc la PAGE
// qui le coince, pas la couleur en soi, et aucune relecture du jeton ne
// pouvait le dire.
//
// 🧭 D'où cette sonde : **le contraste ne se lit pas dans une palette, il se
// mesure sur un écran rendu.** Une couleur n'a pas de contraste ; un couple
// texte-sur-fond en a un, et le fond dépend d'où le texte a atterri.
//
// ── CE QU'ELLE FAIT ───────────────────────────────────────────────────────
//
// Elle parcourt les écrans, relève CHAQUE morceau de texte visible, calcule
// sa couleur rendue et son fond EFFECTIF — en remontant les ancêtres et en
// composant les alphas, parce que `--color-voile` est translucide — puis
// applique le seuil WCAG qui correspond à sa taille et à sa graisse.
//
// ⚠️ ELLE IGNORE LES IMAGES DE FOND. Le décor d'un module n'entre pas dans ce
// calcul : il a sa propre sonde (`decor-module-contraste`), qui le compose
// pour de vrai au canvas. Ici on mesure les JETONS, là-bas le TABLEAU.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/**
 * ⚠️ LES SEUILS SONT CEUX DU WCAG AA, ET ON NE LES NÉGOCIE PAS ICI.
 * 4,5 pour le texte courant, 3 pour le gros texte (≥ 24 px, ou ≥ 18,66 px en
 * gras). 🧭 Un seuil qu'on abaisse pour faire passer la mesure du jour n'est
 * plus un seuil, c'est un constat.
 */
const seuilDe = (px, graisse) => (px >= 24 || (px >= 18.66 && graisse >= 700) ? 3 : 4.5)

/**
 * ── ⏳ LA DETTE CONNUE, NOMMÉE ET DATÉE (11 novembre 2026) ────────────────
 *
 * L'audit a sorti vingt-trois couples sous le seuil. Vingt et un sont
 * corrigés le jour même — le gris du texte assombri, et le blanc écrit en dur
 * sur trois pastilles de couleur. **Il reste UNE famille**, et elle ne se
 * corrige pas d'un jeton : ce sont **les couleurs de la charte employées
 * COMME TEXTE**, sur fond clair.
 *
 *   orange #F97316  2,42 → 2,79    teal #14B8A6  2,28 → 2,48
 *   vert   #22C55E  2,03           rouge #EF4444 3,61 → 3,76
 *
 * 🔴 CE N'EST PAS UN OUBLI, C'EST UNE DÉCISION QUI APPARTIENT À PATRICE : la
 * charte dit **sept couleurs, aucune autre**. Les assombrir pour le texte
 * reviendrait à en créer des variantes — défendable (c'est exactement ce
 * qu'on a fait avec `--color-sur-accent` pour l'autre sens), mais ça se
 * décide, ça ne se glisse pas dans un correctif.
 *
 * 🧭 ET UNE SONDE QUI ÉCHOUE POUR TOUJOURS EST UNE SONDE QU'ON CESSE DE LIRE.
 * D'où cette liste : elle ne masque rien — le détail reste imprimé à chaque
 * passage — mais elle laisse la sonde faire son vrai travail, qui est
 * d'attraper le PROCHAIN défaut. ⚠️ Elle n'a le droit que de rétrécir.
 */
const DETTE = ['rgb(249, 115, 22)', 'rgb(20, 184, 166)', 'rgb(34, 197, 94)', 'rgb(239, 68, 68)']

/** Les écrans où l'app écrit vraiment. */
const ECRANS = [
  ['accueil', '/accueil'],
  ['contacts', '/gens'],
  ['apprendre', '/parcours'],
  ['cours', '/parcours/cours'],
  ['competences', '/parcours/competences'],
  ['agenda', '/agenda'],
  ['atlas', '/atlas'],
  ['compte', '/compte'],
  ['entrainement', '/coach/repeter'],
]

const releve = (page) =>
  page.evaluate(() => {
    /**
     * ── 🔴 ON PEINT LA COULEUR, ON NE LA LIT PAS ──────────────────────────
     *
     * Première version : une regex sur `[\d.]+`. Elle a annoncé des fonds à
     * `rgb(1,1,1)` EN THÈME CLAIR, et un contraste de 1,19 pour de l'encre
     * sur du blanc. **Chrome rend `color-mix()` en `color(srgb 0.94 …)`** —
     * des flottants de 0 à 1 — et la regex les lisait comme des valeurs sur
     * 255.
     *
     * 🧭 LA MAISON CONNAISSAIT DÉJÀ CETTE FAUTE : c'est elle qui avait fait
     * annoncer « 1,1 contre 19,2 » pour la MÊME couleur en mesurant le décor
     * de l'accueil, et le remède était déjà écrit. Je l'ai refaite en toutes
     * lettres. Un canvas, lui, résout `rgb`, `rgba`, `color(srgb …)`,
     * `oklch`, tout — parce qu'il PEINT au lieu d'interpréter.
     *
     * On peint deux fois, sur blanc puis sur noir, ce qui donne l'alpha par
     * différence et la couleur pure par division. Rien à deviner.
     */
    const toile = document.createElement('canvas')
    toile.width = toile.height = 1
    const ctx = toile.getContext('2d', { willReadFrequently: true })
    const nb = (css) => {
      if (!css || css === 'none') return null
      let ok = true
      const peindre = (base) => {
        ctx.clearRect(0, 0, 1, 1)
        ctx.fillStyle = base
        ctx.fillRect(0, 0, 1, 1)
        ctx.fillStyle = '#000'
        ctx.fillStyle = css
        // Si la valeur n'est pas une couleur valide, `fillStyle` garde la
        // précédente — on le détecte en comparant à un témoin.
        if (ctx.fillStyle === '#000000' && !/^(#000000|black|rgb\(0, 0, 0\))$/.test(css)) ok = false
        ctx.fillRect(0, 0, 1, 1)
        return [...ctx.getImageData(0, 0, 1, 1).data]
      }
      const surBlanc = peindre('#fff')
      const surNoir = peindre('#000')
      if (!ok) return null
      const a = 1 - (surBlanc[0] - surNoir[0]) / 255
      if (a <= 0.004) return [0, 0, 0, 0]
      return [surNoir[0] / a, surNoir[1] / a, surNoir[2] / a, a]
    }
    const lum = ([r, g, b]) => {
      const f = (v) => {
        const c = v / 255
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const sur = (dessus, dessous) =>
      [0, 1, 2].map((i) => dessus[i] * dessus[3] + dessous[i] * (1 - dessus[3]))

    /**
     * LE FOND EFFECTIF : on remonte les ancêtres en composant les alphas.
     * ⚠️ Sans cette composition, `--color-voile` (blanc à 74 %) serait lu
     * comme du blanc pur et annoncerait un contraste qui n'existe pas.
     */
    const fondDe = (e) => {
      const pile = []
      for (let n = e; n && n !== document.documentElement; n = n.parentElement) {
        const c = nb(getComputedStyle(n).backgroundColor)
        if (c && c[3] > 0.004) {
          pile.push(c)
          if (c[3] >= 0.999) break
        }
      }
      const base = nb(getComputedStyle(document.documentElement).backgroundColor) ?? [255, 255, 255, 1]
      let out = base[3] >= 0.999 ? base.slice(0, 3) : [255, 255, 255]
      for (let i = pile.length - 1; i >= 0; i--) out = sur(pile[i], out)
      return out
    }

    const res = []
    for (const e of document.querySelectorAll('body *')) {
      const propre = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
      if (!propre) continue
      const s = getComputedStyle(e)
      if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) < 0.1) continue
      const r = e.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue
      // Hors écran : on ne juge pas ce que personne ne voit à ce moment-là.
      if (r.bottom < 0 || r.top > innerHeight) continue
      const col = nb(s.color)
      if (!col || col[3] < 0.1) continue
      const fond = fondDe(e)
      const texte = col[3] >= 0.999 ? col.slice(0, 3) : sur(col, fond)
      const [a, b] = [lum(texte), lum(fond)].sort((x, y) => y - x)
      res.push({
        mot: e.textContent.trim().slice(0, 40),
        px: parseFloat(s.fontSize),
        graisse: Number(s.fontWeight) || 400,
        couleur: s.color,
        fond: `rgb(${fond.map(Math.round).join(',')})`,
        ratio: +((a + 0.05) / (b + 0.05)).toFixed(2),
      })
    }
    return res
  })

test('aucun texte de l’app sous son seuil de contraste', async ({ page }) => {
  const fautes = new Map()

  for (const theme of ['light', 'dark']) {
    for (const [nom, url] of ECRANS) {
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      await page.emulateMedia({ colorScheme: theme })
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t
      }, theme)
      await page.locator('main').first().waitFor({ timeout: 20_000 })
      await page.waitForTimeout(600)

      const lignes = await releve(page)
      // 🔴 UN ÉCRAN SANS TEXTE EST UNE SONDE QUI N'A RIEN REGARDÉ.
      expect(lignes.length, `${theme} ${nom} : aucun texte relevé`).toBeGreaterThan(5)

      for (const l of lignes) {
        const seuil = seuilDe(l.px, l.graisse)
        if (l.ratio >= seuil) continue
        // On regroupe par COUPLE couleur/fond/taille : un même défaut répété
        // trente fois sur une liste est UN défaut, pas trente.
        const cle = `${theme} ${l.couleur} sur ${l.fond} ${l.px}px/${l.graisse}`
        const d = fautes.get(cle) ?? { ...l, theme, seuil, ou: new Set(), combien: 0 }
        d.ou.add(nom)
        d.combien++
        fautes.set(cle, d)
      }
    }
  }

  const liste = [...fautes.values()]
    .sort((a, b) => a.ratio - b.ratio)
    .map(
      (d) =>
        `${d.theme.padEnd(5)} ${String(d.ratio).padStart(5)} < ${d.seuil}  ` +
        `${d.px}px/${d.graisse}  ${d.couleur} sur ${d.fond}  ` +
        `×${d.combien} [${[...d.ou].join(', ')}]  « ${d.mot} »`,
    )
  if (liste.length) console.log('\n' + liste.join('\n') + '\n')

  const neuf = [...fautes.values()]
    .filter((d) => !DETTE.includes(d.couleur))
    .sort((a, b) => a.ratio - b.ratio)
    .map(
      (d) =>
        `${d.theme.padEnd(5)} ${String(d.ratio).padStart(5)} < ${d.seuil}  ` +
        `${d.px}px/${d.graisse}  ${d.couleur} sur ${d.fond}  ` +
        `×${d.combien} [${[...d.ou].join(', ')}]  « ${d.mot} »`,
    )
  expect(neuf, `${neuf.length} couple(s) sous le seuil, HORS dette connue :\n${neuf.join('\n')}`).toEqual(
    [],
  )

  /**
   * ⚠️ ET LA DETTE N'A PAS LE DROIT DE GROSSIR. Sans ce second contrôle, on
   * pourrait répandre l'orange sur dix écrans de plus sans qu'un seul test
   * bronche : la liste des couleurs tolérées couvrirait tout. On surveille
   * donc le NOMBRE de couples, pas seulement leur couleur.
   */
  const dus = [...fautes.values()].filter((d) => DETTE.includes(d.couleur)).length
  expect(dus, `la dette de contraste a grossi : ${dus} couples au lieu de 14 au plus`).toBeLessThanOrEqual(
    14,
  )
})

/**
 * ── 🔴 LA SONDE SAIT-ELLE ÉCHOUER ? ───────────────────────────────────────
 *
 * Sa première version lisait les couleurs à la regex et annonçait des fonds
 * `rgb(1,1,1)` **en thème clair** : elle a produit vingt-trois résultats dont
 * trois étaient des hallucinations. Un vert de sa part ne se croit pas sur
 * parole. On pose donc un texte volontairement illisible — et dans une
 * couleur qui n'est PAS dans la dette, sinon le contrôle se tairait tout seul.
 */
test('la-sonde-du-contraste-texte-sait-echouer', async ({ page }) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  await page.locator('main').first().waitFor({ timeout: 20_000 })
  await page.evaluate(() => {
    const p = document.createElement('p')
    p.textContent = 'texte volontairement illisible'
    p.style.cssText =
      'position:fixed;top:200px;left:20px;z-index:99;font-size:13px;font-weight:400;' +
      'color:color-mix(in srgb, #FFFFFF 92%, #000000);background:#FFFFFF;padding:8px'
    document.body.append(p)
  })
  await page.waitForTimeout(200)
  const lignes = await releve(page)
  const faute = lignes.find((l) => l.mot.startsWith('texte volontairement'))
  expect(faute, 'la sonde n’a même pas vu le texte piège').toBeTruthy()
  // ⚠️ `color-mix()` exprès : c'est la notation que Chrome rend en
  // `color(srgb …)`, celle qui avait fait mentir la regex. Le piège vise la
  // faute d'hier autant que le seuil.
  expect(
    faute.ratio,
    `le piège devrait être très sous le seuil, il mesure ${faute.ratio} (couleur lue : ${faute.couleur})`,
  ).toBeLessThan(2)
})
