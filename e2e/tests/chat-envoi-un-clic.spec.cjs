// LE BOUTON D'ENVOI DOIT MARCHER, DU PREMIER COUP.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/chat-envoi-un-clic.spec.cjs
//
// ── 🔴 DEUX DÉFAUTS, UN SEUL GESTE (16 novembre 2026) ──────────────────────
//
// Patrice : *« quand j'écris dans le chat le bouton envoyer ne fonctionne pas,
// de plus il faut appuyer dessus 2 fois »*.
//
// ① **LE BOUTON N'ENVOYAIT JAMAIS.** Il était branché `onClick={p.envoyer}`, et
//    `envoyer` prenait `texte?: string` en premier argument. React passe
//    l'événement de souris en premier argument : `(événement ?? saisie).trim()`
//    levait « texte.trim is not a function » dans une fonction `async` — donc
//    une promesse rejetée que personne n'attend. **Zéro message, zéro erreur à
//    l'écran.** La touche Entrée, elle, appelait `p.envoyer()` sans argument et
//    marchait : c'est ce qui a fait croire que l'envoi fonctionnait.
//
// ② **LE PREMIER APPUI N'ARRIVAIT PAS AU BOUTON.** Toucher le bouton retire le
//    focus du champ → le `onBlur` efface `data-clavier` → la barre du bas et
//    ses 64 px de rembourrage reviennent → tout le composeur saute. Ce saut
//    arrive **entre `mousedown` et `mouseup`**, et le navigateur dirige alors
//    le `click` vers l'ancêtre commun, pas vers le bouton.
//
// 🧭 CE QUE CETTE SONDE GARDE : **un clic, un message.** Pas « le code appelle
// la bonne fonction » — ça, un test de type le dirait — mais le fait qu'un
// doigt posé une fois sur ce bouton fasse apparaître ce qui a été écrit.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

const PHRASE = 'Sonde du bouton d’envoi, ne pas répondre'

test('un seul clic sur « Envoyer » poste le message', async ({ page, pageErrors }) => {
  /**
   * 🔴 L'APPEL AU MODÈLE EST COUPÉ, ET C'EST VOLONTAIRE. Cette sonde tourne
   * sur le VRAI compte de Patrice : la laisser écrire créerait une
   * conversation et une dépense pour prouver un clic. La bulle « moi » est
   * posée **avant** le `fetch` (optimiste), donc son apparition prouve que le
   * gestionnaire a tourné avec le bon texte — ce qui est exactement la
   * question. ⚠️ Une sonde ne doit RIEN écrire.
   */
  let appels = 0
  await page.route('**/api/atlas/chat', (route) => {
    appels++
    return route.abort()
  })

  await page.goto('/atlas?nouveau=1', { waitUntil: 'domcontentloaded' })
  const composeur = page.locator('[data-composeur]')
  await expect(composeur).toBeVisible({ timeout: 20_000 })

  const champ = composeur.locator('textarea')
  // ⚠️ `click` PUIS `fill` : il faut que le champ ait vraiment le focus, sinon
  // `data-clavier` n'est pas posé et le défaut ② ne peut pas se produire — la
  // sonde passerait au vert sans avoir rien éprouvé.
  await champ.click()
  await champ.fill(PHRASE)
  expect(
    await page.evaluate(() => 'clavier' in document.documentElement.dataset),
    'le champ n’a pas le focus : la sonde ne reproduit pas les conditions du défaut',
  ).toBe(true)

  const envoyer = composeur.locator('[data-bouton="Envoyer"]')
  await expect(envoyer, 'le bouton d’envoi n’est pas apparu avec le texte').toBeVisible()
  await expect(envoyer).toBeEnabled()

  // ── UN SEUL CLIC. C'est tout le sujet. ──────────────────────────────────
  await envoyer.click()

  /**
   * ① Le message est dans le FIL — pas dans le champ.
   *
   * 🔴 MA PREMIÈRE VERSION CHERCHAIT LE TEXTE DANS `main`, ET ELLE PASSAIT AU
   * VERT SUR LE DÉFAUT : le `<textarea>` vit dans `main`, et sa valeur EST son
   * contenu textuel. Le contrôle trouvait donc ce que la personne venait de
   * taper, et appelait ça « le message est parti ». 🧭 Un contrôle qui peut
   * être satisfait par la cause du défaut ne garde rien.
   *
   * La bulle « moi » est reconnue par `self-end` — la même prise que
   * `chat-v2.spec.cjs`, et c'est ce qui distingue ce qui est ENVOYÉ de ce qui
   * est ÉCRIT.
   */
  await expect(
    page.locator('main div.self-end').filter({ hasText: PHRASE }),
    'un clic n’a pas posté le message — le bouton d’envoi ne marche pas',
  ).toBeVisible({ timeout: 8_000 })

  // ① bis Le champ s'est vidé : c'est `envoyer` qui le fait, personne d'autre.
  await expect(champ, 'le champ ne s’est pas vidé : `envoyer` n’est pas allé jusqu’au bout').toHaveValue('')

  // ② Le focus est resté dans le champ, donc la barre n'est pas revenue, donc
  // le composeur n'a pas sauté sous le doigt.
  expect(
    await page.evaluate(() => 'clavier' in document.documentElement.dataset),
    'le focus a quitté le champ : le composeur saute, et le premier appui se perd',
  ).toBe(true)

  // ③ L'appel est bien parti (et a été coupé par la sonde, pas par un défaut).
  expect(appels, 'aucun appel à Atlas : le message n’est jamais sorti du navigateur').toBe(1)

  // ④ Le filet : une exception non capturée dit la panne muette d'origine.
  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})
