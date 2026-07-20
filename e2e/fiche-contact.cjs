// Harnais E2E « fiche contact » — tourne EN LOCAL, pilote le Chrome système via puppeteer-core,
// avec une session FORGÉE (aucun mot de passe) sur un contact JETABLE créé puis supprimé côté serveur.
// Vérifie des comportements CLIENT que le build/typecheck/200 ne prouvent pas (état React, cycle de vie).
//
// Prérequis :  cd e2e && npm install
// Lancer :     node e2e/fiche-contact.cjs        (depuis la racine du repo, ou `npm test` dans e2e/)
// Réglages (env, tous optionnels) :
//   E2E_BASE      URL cible               (défaut https://app.atline.ai)
//   E2E_SSH_KEY   clé SSH                 (défaut ~/.ssh/hetzner_atline)
//   E2E_SSH_HOST  user@host               (défaut root@178.105.219.148)
//   E2E_APP_DIR   dossier app serveur     (défaut /opt/atline/atline-app)
//   E2E_CHROME    binaire Chrome          (défaut chemin Windows standard)
const { execFileSync } = require('child_process')
const os = require('os')
const path = require('path')
const puppeteer = require('puppeteer-core')

const BASE = process.env.E2E_BASE || 'https://app.atline.ai'
const KEY = process.env.E2E_SSH_KEY || path.join(os.homedir(), '.ssh', 'hetzner_atline')
const HOST = process.env.E2E_SSH_HOST || 'root@178.105.219.148'
const APP_DIR = process.env.E2E_APP_DIR || '/opt/atline/atline-app'
const CHROME = process.env.E2E_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

// SSH sans shell local (execFile) → zéro souci de quoting Windows/bash.
const ssh = (remote) => execFileSync('ssh', ['-i', KEY, '-o', 'StrictHostKeyChecking=no', HOST, `cd ${APP_DIR} && ${remote}`], { encoding: 'utf8' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const out = []
  const check = (name, ok, extra = '') => { out.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); if (!ok) process.exitCode = 1 }

  console.log('… création du contact jetable (serveur)')
  const { cid, token } = JSON.parse(ssh('node e2e/server-helper.cjs create').trim().split('\n').pop())

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 900 })
    const host = new URL(BASE).hostname
    await page.setCookie(
      { name: '__Secure-next-auth.session-token', value: token, domain: host, path: '/', httpOnly: true, secure: true },
      { name: 'next-auth.session-token', value: token, domain: host, path: '/', httpOnly: true, secure: false },
    )
    const click = (sel) => page.waitForSelector(sel, { timeout: 15000 }).then((el) => el.click())
    const situation = () => page.$eval('[data-testid="ctx-situation"]', (e) => e.value).catch(() => null)

    await page.goto(`${BASE}/contacts/${cid}`, { waitUntil: 'networkidle2', timeout: 40000 })
    check('auth OK (pas de redirection login)', !/login|signin|api\/auth/i.test(page.url()), page.url())
    await page.waitForSelector('[data-testid="tab-details"]', { timeout: 20000 })

    // Saisir « SITU_E2E » dans Détails › Contexte (clear robuste puis frappe).
    await click('[data-testid="tab-details"]'); await sleep(300)
    await click('[data-testid="subtab-contexte"]'); await sleep(300)
    const inp = await page.$('[data-testid="ctx-situation"]')
    check('champ situation présent dans Contexte', !!inp)
    await inp.click(); await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control'); await page.keyboard.press('Backspace')
    await inp.type('SITU_E2E'); await sleep(300)

    // #2 — Qualification LIT le contexte : carte « Son contexte » + la valeur saisie.
    await click('[data-testid="tab-qualif"]'); await sleep(500)
    const card = await page.$('[data-testid="qualif-son-contexte"]')
    check('#2 Qualification affiche « Son contexte »', !!card)
    check('#2 Qualification affiche la valeur saisie', card ? (await page.$eval('[data-testid="qualif-son-contexte"]', (e) => e.innerText)).includes('SITU_E2E') : false)

    // #1a — la valeur (non sauvée) survit au reload d'une action immédiate (tunnel → save + reload).
    await click('[data-testid="tab-apercu"]'); await sleep(400)
    await click('[data-testid="stage-INVITATION"]'); await sleep(1800)
    await click('[data-testid="tab-details"]'); await sleep(300); await click('[data-testid="subtab-contexte"]'); await sleep(400)
    check('#1 valeur survit au reload d’une action immédiate', (await situation()) === 'SITU_E2E', 'v=' + (await situation()))

    // #1b — filet keepalive : quitter sans sauver → le serveur a la valeur.
    await page.goto(`${BASE}/contacts`, { waitUntil: 'networkidle2', timeout: 40000 }).catch(() => {})
    await sleep(2000)
    const persisted = await page.evaluate(async (c) => { try { const r = await fetch('/api/contacts/' + c); return (await r.json())?.qualification?.situation ?? null } catch { return 'ERR' } }, cid)
    check('#1 auto-save au départ (keepalive) persistée', persisted === 'SITU_E2E', 'serveur=' + persisted)
  } finally {
    await browser.close()
    try { ssh(`node e2e/server-helper.cjs delete ${cid}`); console.log('… contact jetable supprimé') } catch (e) { console.error('nettoyage KO', e.message) }
  }

  console.log('\n' + out.join('\n'))
  console.log(process.exitCode ? '\n❌ ÉCHEC' : '\n✅ TOUT PASSE')
})().catch((e) => { console.error('HARNESS_ERR', e.stack || e.message); process.exit(1) })
