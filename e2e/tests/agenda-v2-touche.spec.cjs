// LA TOUCHE DU RETOUR — la preuve que le geste du socle marche vraiment.
//
// 🔴 CE QUE CE TEST PROUVE ET QU'AUCUN AUTRE NE PEUT PROUVER : que cliquer
// « Positif » écrit bien en base. Un bouton qui a l'air de marcher et qui
// n'enregistre rien est exactement la panne muette qu'on passe nos journées à
// fermer — et c'est la plus coûteuse ici, parce que sans dossier rempli il
// n'y a pas de coach, et sans coach pas de produit.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=<email> \
//     npx playwright test tests/agenda-v2-touche.spec.cjs
//
// ⚠️ Les deux rendez-vous sont JETABLES et supprimés quoi qu'il arrive. Ils
// sont rattachés au contact jetable du harnais, donc rien de réel n'est
// touché.
//
// ⚠️ Le SQL voyage en base64. Les guillemets d'une commande SSH en ligne
// deviennent des identifiants SQL — piège rencontré quatre fois dans la même
// journée. Le base64 n'a ni guillemet ni apostrophe, donc le problème
// n'existe plus.
const { test, expect } = require('../fixtures.cjs')
const { execFileSync } = require('child_process')
const os = require('os')
const path = require('path')

const KEY = process.env.E2E_SSH_KEY || path.join(os.homedir(), '.ssh', 'hetzner_atline')
const HOST = process.env.E2E_SSH_HOST || 'root@178.105.219.148'

function sql(requete) {
  const b64 = Buffer.from(requete, 'utf8').toString('base64')
  return execFileSync(
    'ssh',
    [
      '-i', KEY, '-o', 'StrictHostKeyChecking=no', HOST,
      `echo ${b64} | base64 -d | sudo -u postgres psql -p 5433 -d atline_db -tA`,
    ],
    { encoding: 'utf8' },
  ).trim()
}

const PASSE = 'e2e-rdv-passe'
const VENIR = 'e2e-rdv-venir'

test("la touche du retour enregistre vraiment, et la ligne porte le visage", async ({ page, seed, pageErrors }) => {
  const userId = sql(`select "userId" from "Contact" where id = '${seed.cid}'`)
  expect(userId, 'le contact jetable doit avoir un propriétaire').toBeTruthy()

  // Un rendez-vous d'hier sans issue → zone « Comment ça s'est passé ? ».
  // Un rendez-vous de demain → zone « Ce qui vient ».
  sql(`
    insert into "Appointment" (id, "userId", "contactId", title, "startAt", "endAt", type, "updatedAt")
    values
      ('${PASSE}', '${userId}', '${seed.cid}', 'Présentation jetable', now() - interval '1 day', now() - interval '1 day' + interval '45 min', 'VISIO', now()),
      ('${VENIR}', '${userId}', '${seed.cid}', 'Suivi jetable',        now() + interval '1 day', now() + interval '1 day' + interval '30 min', 'PRESENTIEL', now())
    on conflict (id) do nothing
  `)

  try {
    await page.goto('/agenda', { waitUntil: 'domcontentloaded' })

    // ── Les deux zones portent bien leurs lignes ──
    await expect(page.getByRole('heading', { name: /Comment ça s.est passé/, level: 2 })).toBeVisible()
    await expect(page.getByText('Présentation jetable')).toBeVisible()
    await expect(page.getByText('Suivi jetable')).toBeVisible()

    // 🔴 LE VISAGE : le contact jetable s'appelle « E2E Test », donc la ligne
    // doit afficher son prénom et ses initiales, pas le titre du rendez-vous.
    // C'est tout l'intérêt d'Atline par-dessus Cal : Cal connaît une adresse
    // e-mail, Atline connaît la personne.
    await expect(page.getByText('E2E', { exact: true }).first()).toBeVisible()

    // Le canal lisible, pas l'étiquette de base.
    await expect(page.getByText(/En personne/).first()).toBeVisible()

    await page.screenshot({ path: 'test-results/agenda-v2-rempli.png', fullPage: true })

    // ── La touche ──
    expect(sql(`select coalesce(outcome::text, 'VIDE') from "Appointment" where id = '${PASSE}'`)).toBe('VIDE')

    /**
     * 🔴 LA LIGNE QUI EST LA NÔTRE, PAS LA PREMIÈRE VENUE. Cette sonde
     * cliquait `.first()` et a été rouge deux fois sans qu'on sache pourquoi,
     * verte en solo à chaque coup. La cause, mesurée le 10 novembre 2026 :
     * **sept rendez-vous passés sans issue** attendent dans cette zone, tous
     * réels. Le `.first()` dépendait d'un ordre que la sonde ne contrôle pas.
     *
     * ⚠️ ET ON VÉRIFIE QUE LA PRISE EXISTE AVANT DE CLIQUER. Sans ça, une
     * couture retirée du composant ferait échouer le clic dix lignes plus
     * loin, en désignant la base plutôt que le sélecteur.
     */
    const ligne = page.locator(`[data-rdv="${PASSE}"]`)
    await expect(ligne, 'la ligne du rendez-vous jetable est introuvable').toHaveCount(1)
    await ligne.getByRole('button', { name: 'Positif' }).click()

    // 🔴 On attend l'ÉCRITURE, pas l'écran : un bouton peut disparaître pour
    // dix raisons, la base ne ment pas.
    await expect
      .poll(() => sql(`select coalesce(outcome::text, 'VIDE') from "Appointment" where id = '${PASSE}'`), {
        timeout: 15_000,
        message: "la touche n'a rien écrit en base",
      })
      .toBe('POSITIF')

    // `done` suit du même geste : un rendez-vous dont on sait ce qu'il a donné
    // a forcément eu lieu.
    expect(sql(`select done::text from "Appointment" where id = '${PASSE}'`)).toBe('true')

    // Et la ligne quitte la zone, puisqu'elle n'attend plus rien.
    await expect(ligne, 'la ligne reste alors qu’elle n’attend plus rien').toHaveCount(0, {
      timeout: 15_000,
    })

    expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toEqual([])
  } finally {
    sql(`delete from "Appointment" where id in ('${PASSE}', '${VENIR}')`)
  }
})
