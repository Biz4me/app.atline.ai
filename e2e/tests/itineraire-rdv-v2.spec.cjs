// L'ITINÉRAIRE D'UN RENDEZ-VOUS (V2) — 17 novembre 2026.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/itineraire-rdv-v2.spec.cjs
//
// ── 🔴 CE QUI SE VÉRIFIE ICI, ET QU'AUCUN AUTRE CONTRÔLE NE VOIT ──────────
//
// ① **Le lien existe quand il y a où aller.** `Appointment.lieu` est une
//   colonne neuve : si rien ne l'écrivait ou si l'écran ne la lisait pas, on
//   aurait une colonne morte de plus — le miroir des tables vides que la
//   maison a passé une semaine à retirer.
//
// ② **Et il n'existe PAS autrement.** Un bouton « itinéraire » sur un appel
//   téléphonique est du bruit. C'est la moitié qu'on oublie de vérifier :
//   une sonde qui ne prouve que la présence laisse passer un bouton partout.
//
// ③ **L'adresse est encodée.** « Café de la Gare, 12 rue des Lilas » contient
//   des virgules et des espaces ; collée telle quelle dans l'URL, elle serait
//   coupée. Et le lien doit vraiment pointer chez le service de cartes, pas
//   dans le vide.
//
// 🧭 ON N'UTILISE PAS LE FORMULAIRE DE L'APP, et c'est délibéré : il pousse
// le rendez-vous dans l'agenda Google quand il est raccordé, donc la sonde
// déposerait de vrais rendez-vous « E2E » dans le calendrier de quelqu'un, à
// chaque passage. Elle écrit en base, sur le contact jetable, et retire sa
// ligne elle-même.

const { test, expect, poserRdv, retirerRdv } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

const LIEU = 'Café de la Gare, 12 rue des Lilas, 69002 Lyon'

test('un rendez-vous avec un lieu porte son itinéraire', async ({ page, seed, pageErrors }) => {
  const pose = poserRdv(seed.cid, 26, LIEU)
  expect(pose.lieu, 'le lieu n’a pas été écrit en base').toBe(LIEU)
  try {
    await page.goto('/agenda', { waitUntil: 'domcontentloaded' })
    await expect(page.locator(`[data-rdv="${pose.rid}"]`), 'le rendez-vous n’est pas là').toBeVisible(
      { timeout: 20_000 },
    )

    const lien = page.locator(`[data-itineraire="${pose.rid}"]`)
    await expect(lien, 'aucun itinéraire sur un rendez-vous qui a un lieu').toBeVisible()

    const href = await lien.getAttribute('href')
    console.log(`  ${href}`)
    // ③ Chez le bon service, et l'adresse encodée d'un bout à l'autre.
    expect(href.startsWith('https://www.google.com/maps/dir/?api=1&destination='), href).toBe(true)
    expect(href, 'l’adresse n’est pas encodée : elle sera coupée').toContain(
      encodeURIComponent(LIEU),
    )
    // 🔴 Et rien de brut n'a fui : une virgule ou une espace dans l'URL
    // signerait une concaténation sans encodage.
    expect(href.includes(' '), 'une espace brute dans l’URL').toBe(false)

    // ⚠️ `target="_blank"` SANS `rel` laisse la page de destination atteindre
    // la nôtre par `window.opener`. C'est une faute qu'on ne voit jamais.
    await expect(lien).toHaveAttribute('rel', /noreferrer/)

    expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
  } finally {
    retirerRdv(pose.rid)
  }
})

test('un rendez-vous sans lieu ne propose AUCUN itinéraire', async ({ page, seed }) => {
  /**
   * 🔴 LA MOITIÉ QU'ON OUBLIE. Une sonde qui ne prouve que la présence du
   * bouton laisserait passer un itinéraire affiché partout — y compris sur
   * un appel téléphonique, où il n'a aucun sens.
   *
   * ⚠️ Le contact jetable n'a ni adresse ni lieu, et le rendez-vous est créé
   * sans type : c'est exactement le cas où l'on ne sait pas où aller.
   */
  const pose = poserRdv(seed.cid, 27)
  try {
    await page.goto('/agenda', { waitUntil: 'domcontentloaded' })
    await expect(page.locator(`[data-rdv="${pose.rid}"]`)).toBeVisible({ timeout: 20_000 })
    await expect(
      page.locator(`[data-itineraire="${pose.rid}"]`),
      'un itinéraire s’affiche alors qu’on ne sait pas où aller',
    ).toHaveCount(0)
  } finally {
    retirerRdv(pose.rid)
  }
})
