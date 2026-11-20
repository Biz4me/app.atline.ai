// APPRENDRE : CE QUI EST EN BAS DE L'ÉCRAN RESTE ATTEIGNABLE.
//
//   E2E_BASE=https://v2.atline.ai npx playwright test tests/formation-action.spec.cjs
//
// ── 🔴 CETTE SONDE MESURAIT UN BOUTON SUPPRIMÉ LE 20 NOVEMBRE 2026 ─────────
//
// Elle cherchait le geste du jour d'Apprendre — « Reprendre le module 3 » —
// et vérifiait trois choses : qu'il soit unique, que ce qui est dessous reste
// cliquable, et qu'il mène à une vraie leçon. Patrice l'a fait retirer le
// matin même : *« le bouton commencer dans la page apprendre n'a plus lieu
// d'être, donc suppression »*. Deux de ses trois questions ont disparu avec
// lui.
//
// 🧭 LA TROISIÈME EST DEVENUE PLUS UTILE QU'AVANT, ET IL FALLAIT LA GARDER.
// Ce qu'elle protège n'est pas « le bouton ne recouvre rien », c'est **le
// mobilier du bas ne mange pas la fin de l'écran** — et ce mobilier a changé
// le même jour : la barre du bas, le lecteur audio collé dessus, et parfois
// un geste au-dessus. Trois étages empilés sur 160 px.
//
// 🔴 ET `toBeVisible` NE VOIT PAS LES RECOUVREMENTS. Un élément recouvert est
// « visible » pour Playwright : il a une taille, il n'est pas masqué. Seul un
// clic à blanc — qui vérifie que c'est bien LUI qui reçoit le pointeur —
// attrape ce défaut. C'est la seule raison d'être de ce fichier.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('le bas d’Apprendre reste cliquable sous le mobilier', async ({ page, pageErrors }) => {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('a[data-module]').first()).toBeVisible({ timeout: 20_000 })

  // ⚠️ Les animations finies d'abord : un élément en cours de glissement
  // n'est pas là où il sera, et le clic à blanc viserait à côté.
  await page.evaluate(() =>
    document.getAnimations().forEach((a) => {
      try {
        a.finish()
      } catch {}
    }),
  )

  /**
   * 🔴 LE GESTE DU JOUR A DISPARU D'ICI, ET ON LE VÉRIFIE. Sans ce contrôle,
   * son retour par mégarde ne se verrait pas : c'est une décision de Patrice,
   * pas un accident, et une décision qui ne vit que dans un commentaire finit
   * par se faire renverser sans que personne s'en aperçoive.
   */
  await expect(
    page.getByRole('link', { name: /^(Reprendre|Commencer) le module \d+$|^Faire le quiz du module \d+$/ }),
    'le geste du jour est revenu sur Apprendre, alors qu’il a été retiré le 20 novembre',
  ).toHaveCount(0)

  // ── Le dernier élément cliquable de la page ──────────────────────────────
  await page.evaluate(() => scrollTo(0, document.scrollingElement.scrollHeight))
  await page.waitForTimeout(400)

  const dernier = await page.evaluate(() => {
    const dedans = [...document.querySelectorAll('main a[href], main button')].filter((e) => {
      const r = e.getBoundingClientRect()
      return r.width > 8 && r.height > 8 && r.top < innerHeight && r.bottom > 0
    })
    if (!dedans.length) return null
    const e = dedans.reduce((a, b) => (b.getBoundingClientRect().bottom > a.getBoundingClientRect().bottom ? b : a))
    const r = e.getBoundingClientRect()
    const x = Math.round(r.left + r.width / 2)
    const y = Math.round(r.top + r.height / 2)
    const dessus = document.elementFromPoint(x, y)
    return {
      texte: (e.textContent || '').trim().slice(0, 40),
      bas: Math.round(r.bottom),
      // 🔴 CE QUI REÇOIT VRAIMENT LE POINTEUR, et pas ce qu'on croit viser.
      recouvertPar: dessus && !e.contains(dessus) && dessus !== e
        ? (dessus.closest('[data-pastille-ecoute]')
            ? 'le lecteur audio'
            : dessus.closest('[data-barre-bas]')
              ? 'la barre du bas'
              : dessus.closest('[data-barre-action]')
                ? 'le geste du jour'
                : dessus.tagName.toLowerCase() + '.' + String(dessus.className).slice(0, 30))
        : null,
    }
  })

  console.log(JSON.stringify(dernier))
  expect(dernier, 'aucun élément cliquable en bas d’Apprendre : la sonde n’éprouve rien').toBeTruthy()
  expect(
    dernier.recouvertPar,
    `« ${dernier.texte} » finit à ${dernier.bas} px et c’est ${dernier.recouvertPar} qui reçoit le doigt`,
  ).toBeNull()

  await page.screenshot({ path: 'capture-formation.png', animations: 'disabled' })
  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})
