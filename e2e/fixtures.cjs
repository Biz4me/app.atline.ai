// Fixtures Playwright du harnais E2E — réutilise la forge de session PROUVÉE (server-helper.cjs,
// via SSH) et l'archi local→prod : aucun mot de passe, aucun navigateur téléchargé (Chrome système),
// aucune mutation du serveur (juste un contact JETABLE créé puis supprimé).
//
//   seed        -> {cid, token} : SSH `server-helper.cjs create` au setup, `delete` au teardown.
//   context     -> injecte le cookie de session forgé sur le domaine prod (surcharge le context Playwright).
//   pageErrors  -> collecte les exceptions JS NON capturées (pageerror) : le signal « régression client ».
const base = require('@playwright/test')
const { execFileSync } = require('child_process')
const os = require('os')
const path = require('path')

const BASE = process.env.E2E_BASE || 'https://app.atline.ai'
const KEY = process.env.E2E_SSH_KEY || path.join(os.homedir(), '.ssh', 'hetzner_atline')
const HOST = process.env.E2E_SSH_HOST || 'root@178.105.219.148'
const APP_DIR = process.env.E2E_APP_DIR || '/opt/atline/atline-app'

// SSH sans shell local (execFile) → zéro souci de quoting Windows/bash.
const ssh = (remote) =>
  execFileSync('ssh', ['-i', KEY, '-o', 'StrictHostKeyChecking=no', HOST, `cd ${APP_DIR} && ${remote}`], { encoding: 'utf8' })

const test = base.test.extend({
  // Contact jetable + token de session, forgés sur le serveur. Supprimé après le test.
  // 🔴 `E2E_COMME=<email>` choisit SOUS QUELLE IDENTITÉ le test tourne. Sans
  // lui, c'est le propriétaire du premier contact, et ce n'est pas celui
  // qu'on croit : cinq comptes de la base donnent les initiales « PH ». Un
  // test qui ignore qui il est ne prouve pas ce qu'on croit.
  seed: async ({}, use) => {
    const comme = process.env.E2E_COMME ? ` ${process.env.E2E_COMME}` : ''
    const { cid, token } = JSON.parse(ssh(`node e2e/server-helper.cjs create${comme}`).trim().split('\n').pop())
    await use({ cid, token })
    try { ssh(`node e2e/server-helper.cjs delete ${cid}`) } catch (e) { console.error('nettoyage KO', e.message) }
  },

  // Surcharge du context Playwright : le cookie de session est posé AVANT toute page.
  context: async ({ context, seed }, use) => {
    const host = new URL(BASE).hostname
    await context.addCookies([
      { name: '__Secure-next-auth.session-token', value: seed.token, domain: host, path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
    ])
    await use(context)
  },

  /**
   * 🔴 ON N'AGIT JAMAIS SUR UNE PAGE QUI N'EST PAS ENCORE VIVANTE.
   *
   * Le HTML du serveur est peint et parfaitement cliquable avant que React
   * n'attache ses écouteurs. `click()` n'attend que l'actionnabilité du DOM
   * — vraie pendant toute cette fenêtre — donc le geste part, atterrit, et
   * **personne ne dit qu'il s'est perdu**. Un humain ne tape pas dans cette
   * fenêtre ; Playwright, si, à chaque test.
   *
   * ⚠️ Pour une SAISIE, c'est pire qu'une course : la valeur se pose dans le
   * champ mais React garde son état vide **définitivement**, parce que son
   * traqueur de valeur naît à l'hydratation déjà égal au texte affiché.
   * Mesuré le 7 novembre 2026 : 369 remplissages en 25 s n'y changent rien.
   *
   * 🧭 D'OÙ CE CROCHET PLUTÔT QUE DES RATTRAPAGES. On patchait les clics un
   * par un — le menu des contacts, puis le déroulant de la fiche, puis le
   * lien de l'antichambre, puis le menu de l'agenda. Quatre fois la même
   * cause, quatre correctifs locaux, et le prochain écran l'aurait reprise.
   * L'app pose `data-vivant` dans un effet (donc après hydratation, donc ça
   * ne peut pas mentir) et on l'attend ICI, pour tous les tests à la fois.
   *
   * ⚠️ `waitForFunction` et non un `waitForSelector` : l'attribut est posé
   * sur `<html>`, qui existe dès la première peinture.
   */
  page: async ({ page }, use) => {
    const brut = page.goto.bind(page)
    page.goto = async (url, options) => {
      const r = await brut(url, options)
      await page
        .waitForFunction(() => document.documentElement.dataset.vivant === '1', undefined, {
          timeout: 30_000,
        })
        .catch(() => {
          // On ne fait pas échouer ici : certaines pages d'erreur ou de
          // redirection n'ont pas de React du tout, et c'est légitime.
          // L'assertion de l'appelant dira mieux ce qui manquait.
        })
      return r
    }
    await use(page)
  },

  // Exceptions JS non capturées survenues pendant le test (à asserter vide en fin de scénario).
  pageErrors: async ({ page }, use) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await use(errors)
  },
})

/**
 * TOUCHER UN BOUTON QUI DÉPEND DE REACT, ET S'ASSURER QU'IL A ÉTÉ ENTENDU.
 *
 * ── 🔴 LE DÉFAUT QUE CECI CORRIGE (mesuré le 6 novembre 2026) ─────────────
 *
 * Trois sondes différentes tombaient par intermittence, toujours de la même
 * façon : elles passaient seules, échouaient dans la suite complète, et le
 * cliché d'erreur montrait le bouton AVEC LE FOCUS et rien d'ouvert. Le clic
 * atterrissait ; React ne le voyait pas.
 *
 * La cause est la fenêtre d'HYDRATATION. Le HTML du serveur est peint et
 * parfaitement cliquable avant que React n'attache ses écouteurs, et
 * `click()` n'attend que l'« actionnabilité » du DOM — visible, stable,
 * recevant les événements — ce qui est vrai pendant toute cette fenêtre.
 * **Le clic est perdu, et rien ne le signale** : ni erreur, ni console, ni
 * requête en échec.
 *
 * Mesure, contexte neuf à chaque tour, sur la fiche contact :
 *
 *     fenêtre morte (ms) : 97, 0, 0, 111, 55, 101, 0, 0   → pire cas 111 ms
 *
 * ⚠️ CE N'EST PAS UN DÉFAUT DE L'APP À CETTE ÉCHELLE : il faut environ
 * 250 ms à un humain pour réagir à quelque chose qui apparaît, donc personne
 * ne tape dans cette fenêtre. Playwright, lui, tape en quelques
 * millisecondes. La réparation appartient donc au HARNAIS. Elle serait à
 * revoir le jour où la fenêtre s'allongerait — sur un téléphone lent, elle
 * est plus large que 111 ms.
 *
 * 🧭 On ne dort pas, on ne devine pas : on retouche jusqu'à ce que la
 * CONSÉQUENCE attendue soit là. Un `waitForTimeout` arbitraire serait un
 * pari, et il mentirait le jour où la page devient plus lourde.
 */
/**
 * RÉPÉTER UN GESTE JUSQU'À CE QUE REACT L'AIT VU.
 *
 * 🔴 CHAQUE GESTE A DROIT À SON DÉLAI AVANT D'ÊTRE REJOUÉ, et c'est tout
 * l'intérêt. Une première version vérifiait **immédiatement** après le geste,
 * donc toujours avant que React n'ait rendu : elle rejouait 40 fois sans
 * jamais voir le résultat, puis abandonnait en silence. Sur l'import de
 * tableur, ça donnait un bouton « Regarder » grisé et une sonde qui expirait
 * au bout de 60 s — alors qu'un seul `fill` suffisait, mesuré.
 *
 * 🧭 Le piège était dans un refactor : la version d'origine attendait, j'ai
 * extrait la boucle et **perdu l'attente en chemin**. Ce qui faisait marcher
 * la fonction n'était pas la répétition, c'était la patience entre deux
 * répétitions.
 */
async function insister(geste, estFait, { essais = 40, pas = 50 } = {}) {
  for (let i = 0; i < essais; i++) {
    await geste()
    const limite = Date.now() + pas
    do {
      if (await estFait()) return true
      await new Promise((r) => setTimeout(r, 10))
    } while (Date.now() < limite)
  }
  return false
}

/**
 * CLIQUER, et s'assurer que React a entendu.
 *
 * ⚠️ On ne reclique QUE tant que la conséquence est absente : sur une
 * BASCULE, un second clic refermerait ce que le premier vient d'ouvrir.
 */
async function toucher(cible, consequence, options) {
  const vu = () => consequence.isVisible().catch(() => false)
  await insister(() => cible.click(), vu, options)
  // On laisse l'assertion de l'appelant produire le vrai message d'échec,
  // avec son cliché : c'est elle qui sait ce qu'on cherchait.
  await consequence.waitFor({ state: 'visible', timeout: 5000 })
}

/**
 * SUIVRE UN LIEN, et s'assurer qu'on est bien parti.
 *
 * 🔴 UN `<Link>` DE NEXT A UNE FENÊTRE OÙ IL AVALE LE CLIC. Avant
 * hydratation, c'est un `<a href>` ordinaire : le clic navigue pour de vrai.
 * Après, le routeur prend la main proprement. **Entre les deux**, React a
 * posé son écouteur — qui annule la navigation native — alors que le routeur
 * n'est pas encore prêt à la refaire : le clic ne fait rien, et rien ne le
 * dit. C'est ce qui faisait tomber « l'antichambre et l'appel ne peuvent pas
 * se contredire » environ une fois sur trois, et uniquement dans la suite
 * complète, où chaque test repart d'un contexte neuf.
 *
 * ⚠️ TROIS ESSAIS ESPACÉS DE TROIS SECONDES, ET SURTOUT PAS LE RÉGLAGE PAR
 * DÉFAUT. Sa première version héritait de `insister` : 40 clics en deux
 * secondes. Elle recliquait donc EN PLEINE NAVIGATION, et la cassait — la
 * sonde tombait alors avec `page.url()` à vide, ce qui n'arrive jamais sur
 * une page normale. 🧭 Un rattrapage qui frappe plus vite que la chose qu'il
 * attend finit par la provoquer, le défaut qu'il devait corriger.
 */
async function suivre(lien, page, motif, options) {
  const arrive = () => Promise.resolve(motif.test(page.url()))
  await insister(() => lien.click().catch(() => {}), arrive, {
    essais: 3,
    pas: 3000,
    ...options,
  })
  await base.expect(page).toHaveURL(motif, { timeout: 10_000 })
}

/**
 * SAISIR, et s'assurer que React a entendu.
 *
 * 🔴 UN `fill()` SE PERD EXACTEMENT COMME UN CLIC. Il pose la valeur dans le
 * DOM et émet un événement `input` ; React 19 l'écoute par délégation depuis
 * la racine, et cet écouteur n'existe qu'après hydratation. Avant, la valeur
 * est bien DANS le champ mais l'état React reste vide — et un bouton piloté
 * par cet état reste `disabled` pour toujours.
 *
 * Vécu le 7 novembre 2026 sur l'import de tableur : « Regarder ce que ça
 * donnerait » restait grisé, la sonde expirait au bout de 60 s, et le champ
 * affichait pourtant le texte collé. **Le symptôme désigne le bouton, la
 * cause est dans le champ d'à côté.**
 *
 * `estFait` est une fonction : ce qui prouve que React a vu n'est pas
 * toujours quelque chose de VISIBLE — ici c'est un bouton qui cesse d'être
 * désactivé.
 */
async function remplir(champ, valeur, estFait, options) {
  /**
   * 🔴 ON VIDE AVANT DE REPOSER, ET C'EST LA SEULE CHOSE QUI MARCHE.
   *
   * Mesuré le 7 novembre 2026, contexte neuf à chaque cas, sur l'import :
   *
   *     six fois la MÊME valeur ............... ✗ jamais vu
   *     une valeur DIFFÉRENTE à chaque fois ... ✗ jamais vu
   *     une frappe clavier après le fill ...... ✗ jamais vu
   *     vider ('') puis reposer ............... ✓ vu
   *
   * Pourquoi : React suit la valeur d'un champ contrôlé par un « traqueur »
   * posé à l'hydratation, initialisé avec ce que le DOM contient À CE
   * MOMENT-LÀ. Si une saisie est arrivée AVANT, le traqueur naît déjà égal au
   * texte affiché alors que l'état React, lui, vaut `''`. Les deux ne se
   * recroiseront plus jamais : aucun `change` ne part, quoi qu'on tape.
   * Repasser par la chaîne vide les resynchronise.
   *
   * ⚠️ Le symptôme, lui, est muet : le texte est bien à l'écran et le bouton
   * reste grisé sans rien dire. 369 essais en 25 s n'y changeaient rien —
   * c'est ce qui prouve que ce n'était PAS une course de quelques
   * millisecondes, contrairement à ce que j'ai cru deux fois.
   */
  const poser = async () => {
    await champ.fill('')
    await champ.fill(valeur)
  }
  // 🔴 ELLE CRIE QUAND ELLE ABANDONNE. Sa première version se contentait de
  // revenir, et l'échec se manifestait vingt lignes plus loin par un clic sur
  // un bouton grisé — un symptôme qui désigne le mauvais coupable. Une aide
  // qui renonce en silence est exactement le défaut qu'on traque ailleurs.
  const ok = await insister(poser, estFait, options)
  if (!ok) {
    throw new Error(
      `remplir : la saisie n'a jamais été vue par React après ${options?.essais ?? 40} essais. ` +
        `Valeur posée dans le DOM : « ${(await champ.inputValue().catch(() => '?')).slice(0, 60)} ».`,
    )
  }
}

/**
 * CE QUE LE SERVEUR A VRAIMENT GARDÉ pour ce contact.
 *
 * 🔴 LA SEULE PREUVE QUI COMPTE POUR UNE ÉCRITURE. Un test de navigateur
 * montre qu'un écran a changé ; il ne dit rien de ce qui est persisté. Le
 * harnais le répète depuis le début à propos du rechargement — ici on va un
 * cran plus loin et on COMPTE EN BASE, parce qu'un `revalidatePath` peut
 * très bien rafraîchir un écran à partir de rien.
 *
 * Lecture seule. Rend `{ exposures, lastContact, interactions[] }`.
 */
const compter = (cid) => JSON.parse(ssh(`node e2e/server-helper.cjs compter ${cid}`).trim().split('\n').pop())

module.exports = { test, expect: base.expect, BASE, toucher, remplir, suivre, insister, compter }
