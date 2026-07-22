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
  seed: async ({}, use) => {
    const { cid, token } = JSON.parse(ssh('node e2e/server-helper.cjs create').trim().split('\n').pop())
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

module.exports = { test, expect: base.expect, BASE }
