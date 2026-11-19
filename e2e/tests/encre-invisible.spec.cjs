// DE L'ENCRE DE LA COULEUR DE SON FOND.
//
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/encre-invisible.spec.cjs
//
// ── 🔴 CE QUE CETTE SONDE EXISTE POUR ATTRAPER ────────────────────────────
//
// Le 20 novembre 2026, les numéros 1, 2 et 3 du rail de la carte mentale ont
// été mesurés à **contraste 1** : `rgb(20,184,166)` sur `rgb(20,184,166)`. Ils
// étaient invisibles depuis le premier jour, et personne ne l'avait vu —
// moi y compris, en relisant le fichier.
//
// La cause n'est pas une couleur oubliée, c'est **deux aides dont les noms ne
// disent pas leur domaine** : `surTexte()` rend une teinte lisible SUR LA
// SURFACE de la page, `aplat()` rend le couple fond + encre d'une pastille
// pleine. Appeler la première sur un fond teinté renvoie une encre teintée, et
// **rien ne proteste** : ça compile, ça passe le typecheck, ça se déploie.
//
// 🧭 **UNE RÈGLE NOMMÉE N'EST PAS UNE RÈGLE APPLIQUÉE.** Le commentaire qui
// tenait au-dessus de la ligne fautive disait exactement la bonne chose —
// *« la pastille est pleine, donc c'est l'encre posée DESSUS qu'il faut
// régler »*. Il a décrit le remède pendant un mois au-dessus du poison.
//
// ⚠️ ET LES SONDES EXISTANTES NE POUVAIENT PAS LE VOIR : elles mesurent le
// texte sur les SURFACES de l'app — les jetons `--color-fond`, `--color-surface`
// — pas l'encre posée sur un aplat peint en ligne.
//
// ── CE QU'ELLE MESURE, ET CE QU'ELLE NE MESURE PAS ────────────────────────
//
// Elle parcourt chaque écran et, pour tout élément qui porte DU TEXTE À LUI et
// un fond opaque à lui, calcule le contraste de son encre sur CE fond. Elle ne
// remonte pas la pile des parents : un fond hérité est le domaine des sondes
// de surface, déjà écrites. Ce qu'elle attrape est plus étroit et plus grave —
// **un élément qui se peint lui-même dans sa propre couleur**.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** Les écrans où un aplat teinté porte du texte. */
const ECRANS = ['/parcours', '/parcours/competences', '/agenda', '/gens']

test('aucune encre ne se perd dans son propre fond', async ({ page }) => {
  const fautes = []

  // La carte mentale et la fiche module n'ont pas d'adresse fixe : on les
  // prend par le premier module de l'étagère.
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const module1 = await page.locator('[data-module="1"]').getAttribute('href')

  for (const adresse of [...ECRANS, module1, `${module1}/carte`]) {
    await page.goto(adresse, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(400)

    const trouvees = await page.evaluate(() => {
      const lin = (v) => {
        const x = v / 255
        return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
      }
      const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
      const nombres = (c) => (c.match(/[\d.]+/g) || []).map(Number)

      const vues = []
      for (const n of document.querySelectorAll('body *')) {
        // ① Il porte du texte À LUI, pas celui de ses enfants.
        const sien = [...n.childNodes]
          .filter((e) => e.nodeType === 3)
          .map((e) => e.textContent.trim())
          .join('')
        if (!sien) continue

        // ② Il a un fond opaque à lui. Un fond transparent est hérité, donc
        //    hors sujet : c'est le domaine des sondes de surface.
        const s = getComputedStyle(n)
        const f = nombres(s.backgroundColor)
        if (f.length < 3 || (f[3] !== undefined && f[3] < 0.9)) continue

        // ③ Et il est visible. Un élément masqué ne trompe personne.
        if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) < 0.1) continue
        const r = n.getBoundingClientRect()
        if (r.width < 4 || r.height < 4) continue

        const e = nombres(s.color)
        const [a, b] = [lum(e), lum(f)]
        const contraste = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
        if (contraste < 4.5) {
          vues.push({
            texte: sien.slice(0, 24),
            balise: n.tagName.toLowerCase(),
            encre: e.slice(0, 3).join(','),
            fond: f.slice(0, 3).join(','),
            contraste: Number(contraste.toFixed(2)),
          })
        }
      }
      return vues
    })

    for (const f of trouvees) fautes.push({ adresse, ...f })
  }

  for (const f of fautes) {
    console.log(
      `  ✗ ${f.adresse} — <${f.balise}> « ${f.texte} » : ${f.encre} sur ${f.fond} → ${f.contraste}`,
    )
  }

  expect(
    fautes,
    `${fautes.length} élément(s) écrivent dans une encre trop proche de leur propre fond`,
  ).toEqual([])
})
