// Lancer :
//     cd app.atline.ai/e2e
//     E2E_BASE=https://v2.atline.ai E2E_COMME=… npx playwright test tests/ecrire-message-v2.spec.cjs
//
// ── 🔴 CE QUE CETTE SONDE TIENT ───────────────────────────────────────────
//
// L'écran « écrire à quelqu'un » (18 novembre 2026) compose un message par le
// cerveau et le remet au téléphone. Trois choses doivent rester vraies, et
// aucune ne se vérifie toute seule :
//
//   · le brouillon arrive SANS qu'on le demande — l'écran existe pour ça, et
//     une boîte vide avec un bouton « Écrire » ferait deux gestes pour une
//     intention ;
//   · le lien EMPORTE le texte. Un `sms:` sans `?body=` ouvre l'application
//     vide, et on ne s'en aperçoit qu'une fois dedans ;
//   · l'écran dit qu'Atline n'envoie pas. Sans cette phrase, l'historique
//     affirme une chose que personne n'a vérifiée.
const { test, expect, toucher, suivre, compter, insister } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** Le cerveau met quelques secondes : c'est un vrai modèle, pas un gabarit. */
const CERVEAU = 60_000

async function poserUnNumero(page, cid) {
  await page.goto(`/gens/${cid}`, { waitUntil: 'domcontentloaded' })
  const puce = page.locator('[data-manque="phone"]')
  await expect(puce).toBeVisible({ timeout: 20_000 })
  await toucher(puce, page.locator('[data-saisie="phone"]'))
  await page.locator('[data-saisie="phone"]').fill('+33 6 12 34 56 78')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.locator('[data-champ="phone"]')).toContainText('+33', { timeout: 20_000 })
  await page.reload({ waitUntil: 'domcontentloaded' })
}

test('le brouillon s’écrit tout seul, et le lien l’emporte', async ({ page, seed, pageErrors }) => {
  await poserUnNumero(page, seed.cid)

  await suivre(page.locator('[data-geste="Message"]'), page, /\/ecrire$/)

  /**
   * 🔴 ON N'A RIEN DEMANDÉ, ET LE TEXTE ARRIVE. C'est toute la raison d'être
   * de l'écran : il remplace la frappe, il ne l'organise pas.
   */
  const champ = page.locator('[data-saisie-message]')
  await expect(champ, 'aucun brouillon n’est arrivé').toBeVisible({ timeout: CERVEAU })
  const texte = await champ.inputValue()
  expect(texte.length, 'le brouillon est vide').toBeGreaterThan(20)

  /**
   * 🔴 ET IL NE CONTIENT AUCUN CROCHET. « Salut [prénom] » envoyé à une vraie
   * personne est la faute la plus coûteuse de cet écran, et elle ne se voit
   * qu'après l'envoi. Le service la refuse déjà ; on le vérifie ici aussi,
   * parce qu'un garde côté serveur ne dit rien de ce que l'écran affiche.
   */
  expect(texte, `un crochet dans le brouillon : « ${texte} »`).not.toMatch(/\[[^\]]{1,40}\]/)
  expect(texte, 'du markdown dans le brouillon').not.toMatch(/\*\*/)

  /**
   * 🔴 LE LIEN EMPORTE LE TEXTE. Un `sms:` sans `?body=` ouvre l'application
   * VIDE — et comme elle s'ouvre bien, on croit que ça marche.
   */
  const bouton = page.locator('[data-envoyer]')
  await expect(bouton).toBeVisible()
  const href = await bouton.getAttribute('href')
  expect(href, 'le lien ne porte pas de corps de message').toMatch(/^sms:\+33612345678\?body=.+/)
  // Le texte affiché est bien celui qui part.
  expect(decodeURIComponent(href.split('?body=')[1])).toBe(texte)

  /**
   * 🔴 ET RIEN N'EST ÉCRIT PAR LE SEUL FAIT D'OUVRIR SMS. Remettre le
   * texte au téléphone ne prouve pas qu'on l'a envoyé : la ligne n'existe
   * qu'au RETOUR, et seulement si on répond. On le vérifie ici, dans la
   * sonde qui ne répond JAMAIS — c'est le seul endroit où l'absence prouve
   * quelque chose.
   */
  await bouton.click()
  await expect(page.locator('[data-question]')).toBeVisible({ timeout: 10_000 })
  expect(compter(seed.cid).interactions, 'un échange compté sans réponse').toHaveLength(0)

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})

test('l’écran dit qu’Atline n’envoie pas, et le journal garde le texte', async ({ page, seed }) => {
  await poserUnNumero(page, seed.cid)
  await suivre(page.locator('[data-geste="Message"]'), page, /\/ecrire$/)
  await expect(page.locator('[data-saisie-message]')).toBeVisible({ timeout: CERVEAU })
  const texte = await page.locator('[data-saisie-message]').inputValue()

  /**
   * 🔴 ON EMPÊCHE LA NAVIGATION EXTERNE, ET C'EST LE CŒUR DE CETTE SONDE.
   *
   * Le bouton d'envoi est un `<a href="sms:…">`. Le navigateur de bureau
   * l'avorte (`ERR_ABORTED`), ce qui déclenche un rafraîchissement du routeur
   * et un remontage de l'arbre. Une réponse qui tombe dans cette fenêtre
   * frappe un élément détaché : mesuré, `journaliser` n'est alors **jamais
   * appelé**, et la sonde échouait trois fois sur quatre.
   *
   * 🧭 CE N'EST PAS CE QU'ON VEUT MESURER ICI. La remise au téléphone est
   * déjà prouvée par la sonde du dessus, qui lit le `href` et son `?body=`.
   * Celle-ci porte sur LA BOUCLE DU JOURNAL — question au retour, écriture,
   * texte gardé. On neutralise donc le saut vers l'application, et le
   * `onClick` de React, lui, s'exécute normalement : la question s'arme.
   *
   * ⚠️ ET SUR UN TÉLÉPHONE LA FENÊTRE N'EXISTE PAS : l'application SMS
   * s'ouvre vraiment, la page passe à l'arrière-plan, et on revient longtemps
   * après le remontage.
   */
  await page
    .locator('[data-envoyer]')
    .evaluate((a) => a.addEventListener('click', (e) => e.preventDefault(), { once: true }))
  await page.locator('[data-envoyer]').click()
  await expect(page.locator('[data-question]')).toBeVisible({ timeout: 10_000 })
  await page.locator('[data-issue="POSITIF"]').click()
  let vus = 0
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(1500)
    vus = compter(seed.cid).interactions.length
    if (vus) break
  }
  expect(vus, 'la reponse n’a rien ecrit').toBe(1)

  /**
   * 🔴 LE TEXTE EST EN BASE. `Interaction.body` existait et n'était jamais
   * écrit : le compteur montait, le contenu se perdait. C'est lui qui rend
   * l'historique possible.
   */
  const etat = compter(seed.cid)
  expect(etat.interactions).toHaveLength(1)
  expect(etat.interactions[0].type).toBe('SMS')
  expect(etat.interactions[0].body, 'le message préparé ne s’est pas rangé').toBe(texte)

  /**
   * ⚠️ ET L'ÉCRAN LE DIT. Sans cette phrase, l'historique affirme un envoi
   * que personne n'a vérifié — Atline remet le texte au téléphone et ne sait
   * rien de ce qui part.
   */
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-deja-prepare]')).toContainText('ne sait pas si c’est parti', {
    timeout: 20_000,
  })
})
