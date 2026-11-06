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
async function toucher(cible, consequence, { essais = 40, pas = 50 } = {}) {
  for (let i = 0; i < essais; i++) {
    await cible.click()
    try {
      await consequence.waitFor({ state: 'visible', timeout: pas })
      return
    } catch {
      // Le clic a pu être perdu avant hydratation : on retouche. Si le
      // bouton est une BASCULE, un second clic refermerait — d'où le fait
      // qu'on ne retouche que tant que la conséquence est ABSENTE.
    }
  }
  // On laisse l'assertion de l'appelant produire le vrai message d'échec,
  // avec son cliché : c'est elle qui sait ce qu'on cherchait.
  await consequence.waitFor({ state: 'visible', timeout: 5000 })
}

module.exports = { test, expect: base.expect, BASE, toucher }
