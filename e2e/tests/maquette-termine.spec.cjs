// ⏳ MAQUETTE JETABLE — quatre façons de dire « module terminé ».
//
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/maquette-termine.spec.cjs
//
// Patrice, le 20 novembre 2026 : *« le v vert en haut du livre ne va pas, il
// faut qu'il soit ailleurs, même sa couleur ne me va pas »*. Ce fichier existe
// pour qu'il tranche sur des images, pas sur une description. **Il se supprime
// le jour où il a choisi.**
//
// ── 🔴 LE DIAGNOSTIC, AVANT LES PROPOSITIONS ──────────────────────────────
//
// Le ✓ actuel est une pastille verte pleine, en haut à droite de la
// couverture. Trois choses ne vont pas, et aucune n'est une question de goût :
//
//   ① LA PLACE EST DÉJÀ PRISE. Le haut de la couverture est la bande que le
//     prompt des scènes garde sombre et vide EXPRÈS pour y poser le titre, et
//     qu'une sonde mesure. La pastille se pose donc sur la typographie — sur
//     le module 1, dont le titre court sur trois lignes, elle mord dedans.
//   ② LE VERT EST DÉJÀ UN MOT. `#22C55E` est le DISC Vert : dans cette app il
//     nomme un profil de personnalité. Et un vert saturé sur une photographie
//     sourde casse la discipline d'UNE SEULE couleur d'accent qui fait tenir
//     la collection.
//   ③ UN DISQUE PLEIN EST LA FORME LA PLUS FORTE DISPONIBLE, pour le message
//     le plus calme de l'écran. « Terminé » n'est pas une alerte.
//
// ── OÙ IL RESTE DE LA PLACE, MESURÉ ET NON SUPPOSÉ ────────────────────────
//
//   · le haut de la couverture → pris par le titre ;
//   · la bordure de la couverture → prise par « recommandé », en orange. Un
//     second état porté par la bordure disputerait le même canal ;
//   · le corps de la photographie → le contraste n'y est garanti nulle part :
//     la sonde ne mesure que la bande du haut ;
//   · **la ligne sous la couverture** → « Module 1 », deux mots sur toute la
//     largeur. C'est le seul canal libre qui ne dispute rien à personne ;
//   · **le bas de la couverture** → libre de texte, et c'est là que les scènes
//     ont leur sol et leur ombre, rarement leur sujet.
const { test } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('quatre façons de dire « terminé », côte à côte', async ({ page }) => {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-module="1"]').waitFor({ state: 'visible', timeout: 20_000 })

  await page.evaluate(() => {
    const TEAL = '#14B8A6'

    /** La cellule d'un module : la couverture, et le label sous elle. */
    const cellule = (n) => {
      const lien = document.querySelector(`[data-module="${n}"]`)
      return { couverture: lien.querySelector('div'), label: lien.querySelector(':scope > p') }
    }

    /** La pastille ✓, posée en bas à droite de la couverture. */
    const pastille = (couverture, fond, encre) => {
      const p = document.createElement('span')
      p.textContent = '✓'
      p.style.cssText = `position:absolute;right:8px;bottom:8px;width:24px;height:24px;
        display:flex;align-items:center;justify-content:center;border-radius:50%;
        font-size:12px;font-weight:700;background:${fond};color:${encre};
        box-shadow:0 1px 6px rgba(0,0,0,.45)`
      couverture.appendChild(p)
    }

    // On retire le ✓ vert actuel partout : c'est lui qu'on remplace.
    for (const v of document.querySelectorAll('[data-module] span')) {
      if (v.textContent === '✓') v.remove()
    }

    // ── A · AUCUNE COULEUR. Un ✓ blanc sur un voile sombre, en bas à droite.
    //    Il tient sur N'IMPORTE QUELLE photographie sans rien demander à la
    //    charte, et il ne dispute rien à l'orange du « recommandé ».
    pastille(cellule(1).couverture, 'rgba(0,0,0,.62)', '#FFFFFF')

    // ── B · LE TEAL D'APPRENDRE, même place. La couleur du lieu, pas une
    //    couleur de plus. ⚠️ Mais c'est aussi celle du bouton d'action et de
    //    l'onglet : elle dit « ici », pas « fait ».
    pastille(cellule(2).couverture, TEAL, '#06302B')

    // ── C · UN BANDEAU en bas de la couverture. La forme d'une étiquette de
    //    bibliothèque : lisible à 146 px sans loupe, hors de la bande du
    //    titre, et elle ne recouvre que le sol de la scène.
    {
      const { couverture } = cellule(3)
      const bande = document.createElement('div')
      bande.textContent = 'Terminé'
      bande.style.cssText = `position:absolute;left:0;right:0;bottom:0;padding:5px 0;
        text-align:center;font-size:11px;font-weight:700;letter-spacing:.06em;
        text-transform:uppercase;background:${TEAL};color:#06302B`
      couverture.appendChild(bande)
    }

    // ── D · RIEN SUR LA COUVERTURE. La photographie reste intacte, et c'est
    //    le label dessous qui porte l'état. Le plus discret des quatre — et la
    //    question est justement de savoir si c'est trop discret.
    {
      const { label } = cellule(4)
      label.innerHTML = `Module 4 <span style="color:${TEAL};font-weight:700">· Terminé</span>`
    }

    // ⚠️ Les sept autres sortent du cadre : la maquette compare QUATRE
    // propositions, et sept couvertures intactes derrière ne feraient que
    // rallonger l'image sans rien dire de plus.
    for (let n = 5; n <= 11; n += 1) {
      document.querySelector(`[data-module="${n}"]`)?.closest('li')?.remove()
    }

    // Et une lettre sous chaque proposition, pour que la capture se lise seule.
    for (const [n, texte] of [
      [1, 'A · sans couleur'],
      [2, 'B · teal du lieu'],
      [3, 'C · bandeau'],
      [4, 'D · sous le livre'],
    ]) {
      const lettre = document.createElement('p')
      lettre.textContent = texte
      lettre.style.cssText = `margin-top:2px;font-size:11px;font-weight:700;
        letter-spacing:.04em;color:#8A8F98;text-align:center`
      document.querySelector(`[data-module="${n}"]`).append(lettre)
    }
  })

  await page.locator('[data-module="1"]').scrollIntoViewIfNeeded()
  const rangee = page.locator('[data-module="1"]').locator('xpath=ancestor::ul')

  // ⚠️ Repliée, la rangée passe derrière l'en-tête et la barre du bas : on
  // écarte le chrome collant, sinon deux propositions sur quatre arrivent
  // amputées — exactement ce qu'on vient regarder.
  await rangee.evaluate((ul) => {
    ul.style.flexWrap = 'wrap'
    ul.style.overflowX = 'visible'
    ul.style.rowGap = '16px'
    for (const n of document.querySelectorAll('body *')) {
      const p = getComputedStyle(n).position
      if ((p === 'fixed' || p === 'sticky') && !n.contains(ul)) n.style.visibility = 'hidden'
    }
  })

  await rangee.screenshot({ path: 'maquette-termine.png' })
})
