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

/**
 * LE COMPTE DE RÉFÉRENCE DE LA SUITE — voir la raison sur `seed`, plus bas.
 * ⚠️ Il se change ICI, en un endroit, et jamais dans une sonde : une sonde qui
 * choisit son compte dans son coin redevient un verdict qui dépend d'elle.
 */
const COMPTE_DE_REFERENCE = 'humanstring@gmail.com'

const test = base.test.extend({
  // Contact jetable + token de session, forgés sur le serveur. Supprimé après le test.
  /**
   * ── 🔴 L'IDENTITÉ SE DÉCLARE, ELLE NE SE DEVINE PLUS (23 novembre 2026) ───
   *
   * `E2E_COMME=<email>` choisit sous quelle identité le test tourne. Ce
   * commentaire disait : *« sans lui, c'est le propriétaire du premier
   * contact, et ce n'est pas celui qu'on croit »*. C'était exact, et le
   * reconnaître ne suffisait pas.
   *
   * 🔴 CE QUE ÇA A COÛTÉ, MESURÉ. `prisma.contact.findFirst()` sans tri rend
   * la ligne que la base veut bien donner en premier, et elle change dès
   * qu'on écrit. Le matin du 22 novembre, elle appartenait à un compte de
   * **34 contacts** : 243 vertes, zéro rouge. Le soir, après les contacts
   * jetables créés et supprimés dans la journée, elle appartenait à un compte
   * de **trois** : neuf sondes du carnet au rouge. **Même code, même app,
   * deux verdicts** — et une soirée passée à chercher une régression qui
   * n'existait pas.
   *
   * 🧭 UNE SUITE DONT L'IDENTITÉ DÉPEND DE L'ORDRE DES LIGNES EN BASE N'EST
   * PAS REPRODUCTIBLE. Et le défaut n'était pas l'absence de garde : c'était
   * qu'il n'y avait **rien à déclarer**. Maintenant il y a quelque chose.
   *
   * ⚠️ POURQUOI CE COMPTE-LÀ. Neuf sondes exigent un carnet fourni — « plus de
   * cinq pour que le filtre prouve quelque chose », « une phrase qui déborde à
   * 320 px », « une page qui défile ». Mesuré le 23 novembre : il porte
   * **34 contacts**, tous dans son activité courante, 26 avec une couleur et
   * 27 placés sur la carte. C'est le seul de la base qui les nourrit toutes.
   *
   * ⚠️ ET ÇA NE DISPENSE PAS DE FABRIQUER. La fixture `foule` reste le bon
   * outil pour une sonde qui a besoin d'une donnée PRÉCISE ; ce compte ne
   * répond que de l'ABONDANCE. Une sonde qui exige « une Émilie » doit la
   * créer, pas espérer la trouver.
   */
  seed: async ({}, use) => {
    const comme = ` ${process.env.E2E_COMME ?? COMPTE_DE_REFERENCE}`
    const { cid, token } = JSON.parse(ssh(`node e2e/server-helper.cjs create${comme}`).trim().split('\n').pop())
    await use({ cid, token })
    try { ssh(`node e2e/server-helper.cjs delete ${cid}`) } catch (e) { console.error('nettoyage KO', e.message) }
  },

  /**
   * ── UNE FOULE JETABLE : SIX CONTACTS GÉOCODÉS ─────────────────────────────
   *
   * 🔴 POURQUOI ELLE EXISTE (20 novembre 2026). Cinq sondes exigeaient la
   * donnée du compte : « plus de cinq points sur la carte », « une Émilie
   * dans la liste », « un segment qui n'est pas vide ». Le compte de travail
   * a **sept contacts et un seul géocodé** : elles échouaient toutes, sans
   * qu'aucun défaut existe, et on avait pris l'habitude de ne plus les lire.
   *
   * 🧭 SAUTER AURAIT RENDU LE VERT GRATUIT. Une suite où tout se saute donne
   * exactement le même vert qu'une suite qui prouve tout. Fabriquer garde la
   * preuve, et c'est la première marche de la règle écrite près de `SANS`.
   *
   * ⚠️ ELLE DÉPEND DE `seed`, et ce n'est pas un détail d'ordonnancement :
   * les six sont semés sur le MÊME compte et la MÊME activité que le contact
   * jetable, sinon ils n'apparaîtraient sur aucun écran de la session.
   *
   * 🔴 ET `depeupler` EST GLOBAL : il retire tout ce qui porte la marque, donc
   * aussi la foule d'un autre test. C'est sans danger ici — `workers: 1`,
   * déclaré dans la configuration, et les tests mutent déjà un contact commun.
   * Le jour où la suite passerait en parallèle, il faudrait une marque par
   * test. C'est écrit ici pour que ce jour-là on le sache.
   */
  foule: async ({ seed }, use) => {
    // ⚠️ On lit à partir du dernier `[` : Prisma peut écrire un avertissement
    // avant notre ligne, et `JSON.parse` sur « warn … [ { … } ] » échouerait.
    const sortie = ssh(`node e2e/server-helper.cjs peupler ${seed.cid}`).trim()
    const gens = JSON.parse(sortie.slice(sortie.lastIndexOf('[')))
    await use(gens)
    try {
      ssh('node e2e/server-helper.cjs depeupler')
    } catch (e) {
      console.error('la foule n’a pas été retirée', e.message)
    }
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
 * OUVRIR L'ONGLET « INFOS » D'UNE FICHE CONTACT.
 *
 * ── 🔴 POURQUOI UN HELPER ET PAS UN CLIC RECOPIÉ ──────────────────────────
 *
 * Depuis le 18 novembre 2026 les 23 rangées de champs vivent derrière un
 * second onglet. **Dix sondes** doivent donc l'ouvrir avant de chercher un
 * champ. Recopié dix fois, le jour où l'onglet change de nom ou de repère on
 * corrige neuf endroits et on cherche le dixième — c'est la faute que cette
 * maison retire partout, écrite dans le harnais au lieu de l'app.
 *
 * ⚠️ IL PASSE PAR `toucher`, donc il insiste. Un `<button>` de React avale le
 * clic entre le rendu et l'hydratation, et la bascule d'onglet est
 * exactement le genre de geste qui tombe dans cette fenêtre.
 *
 * 🧭 Et il attend une CONSÉQUENCE, pas un délai : le groupe « une fois » est
 * le seul élément qui n'existe que sur cet onglet.
 */
async function ouvrirInfos(page) {
  const onglet = page.locator('[data-onglet="Infos"]')
  await onglet.waitFor({ state: 'visible', timeout: 20_000 })
  await toucher(onglet, page.locator('[data-groupe="unefois"]'))
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

/**
 * L'ADRESSE ET LA POSITION GARDÉES EN BASE pour ce contact.
 *
 * 🔴 `lat` ET `lng` NE S'AFFICHENT NULLE PART. La fiche montre la rue, le
 * code postal, la ville et le pays ; la position, jamais. Un test de
 * navigateur ne peut donc pas prouver qu'elle est écrite — et c'est la seule
 * chose dont la carte des contacts dépendra. Lecture seule.
 */
/**
 * DEMAIN, DANS LE FUSEAU DE PARIS.
 *
 * 🔴 TROIS SONDES DE L'AGENDA TOMBAIENT TOUS LES SOIRS, et pas a cause de
 * l'app. Le selecteur de creneau propose 8 h -> 21 h 30 et **ne rend pas du
 * tout les creneaux passes** -- c'est documente et voulu. Apres 21 h 30, la
 * journee en cours n'a donc plus une seule ligne, et une sonde qui cherche
 * « le premier creneau libre » ne trouve rien.
 *
 * La suite complete du 17 novembre 2026 a tourne a cheval sur minuit : trois
 * rouges, zero defaut. Un filet qui ne tient qu'aux heures de bureau envoie
 * chercher une regression fantome la nuit.
 *
 * 🧭 Les sondes visent donc DEMAIN, qui porte toujours ses creneaux. Et le
 * fuseau est celui de PARIS, comme `jourDuFuseau` cote app : a 23 h a Paris,
 * la machine qui lance les tests peut etre deja au lendemain en UTC, et on
 * demanderait un jour que le selecteur n'affiche pas.
 */
const demain = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() + 24 * 3600 * 1000))

const adresseDe = (cid) => JSON.parse(ssh(`node e2e/server-helper.cjs adresse ${cid}`).trim().split(/\r?\n/).pop())

/**
 * SEMER UN RENDEZ-VOUS FUTUR SUR LE CONTACT JETABLE, et le retirer.
 *
 * 🔴 AJOUTÉ LE 13 NOVEMBRE 2026. La famille « Ce qui t'attend » lit les
 * rendez-vous à venir, et le compte de travail n'en a aucun : sans de quoi
 * la nourrir, la surface serait invérifiable — du code qui a l'air juste
 * parce qu'il ne tourne jamais.
 *
 * ⚠️ ELLES PASSENT PAR `ssh` COMME TOUT LE RESTE. Recopier la commande dans
 * un test l'aurait figée ailleurs : le jour où la clé, l'hôte ou le chemin
 * changent, un seul endroit doit suivre.
 */
const poserRdv = (cid, heures = 26, lieu) =>
  JSON.parse(
    ssh(`node e2e/server-helper.cjs rdv ${cid} ${heures}${lieu ? ` ${JSON.stringify(lieu)}` : ''}`)
      .trim()
      .split(/\r?\n/)
      .pop(),
  )
const retirerRdv = (rid) => ssh(`node e2e/server-helper.cjs rdv-delete ${rid}`)

/**
 * ── 🔴 L'ADRESSE D'UNE FICHE — ÉCRITE UNE FOIS ─────────────────────────────
 *
 * Sept sondes portaient `/\/gens\/[a-z0-9]+$/`, chacune pour soi. Les
 * contacts de l'app portent un **cuid**, sans tiret ; le contact jetable que
 * les sondes fabriquent porte un **UUID**, qui en a quatre. Elles attendaient
 * donc vingt secondes une adresse où elles étaient déjà, en annonçant
 * « unexpected value https://…/gens/02c53b4a-294a-… » — c'est-à-dire
 * exactement la page qu'elles voulaient.
 *
 * 🧭 LE DÉFAUT N'ÉTAIT PAS LE TIRET MANQUANT, c'était d'avoir écrit le FORMAT
 * d'un identifiant là où seule sa PLACE dans l'adresse compte. Et de l'avoir
 * écrit sept fois : le jour où le format rechange, il faut retrouver les sept.
 */
const ADRESSE_FICHE = /\/gens\/[a-z0-9-]+$/i

/**
 * ── 🔴 UNE SONDE N'AFFIRME JAMAIS LA DONNÉE DE QUELQU'UN ───────────────────
 *
 * Relevé le 20 novembre 2026 sur la suite entière : **30 rouges sur 260**, et
 * une douzaine ne signalaient aucun défaut. Elles exigeaient le nom d'une
 * société MLM écrit en dur, un agenda Google raccordé, plus de cinq contacts
 * géocodés, le résumé de nuit de la veille, un contact au stade « Closing ».
 * Autant de choses vraies un jour, sur un compte.
 *
 * 🧭 ET C'EST PIRE QU'UNE SONDE PÉRIMÉE. Une sonde périmée échoue toujours,
 * donc on finit par la corriger. Celle-ci échoue **selon le compte et selon le
 * jour** : on ne sait jamais si c'est le produit ou la donnée, et on apprend à
 * ne plus la lire. Trente rouges, et la liste entière devient du bruit.
 *
 * ── LA RÈGLE, DANS CET ORDRE ──────────────────────────────────────────────
 *
 *   1. **FABRIQUER** ce dont on a besoin. Le contact jetable existe pour ça :
 *      il naît avec la sonde et meurt avec elle.
 *   2. **MESURER LA STRUCTURE, PAS LA VALEUR.** « le bloc d'identité porte le
 *      nom de l'activité » se vérifie partout ; « il dit Forever Living » ne
 *      se vérifie que chez Patrice.
 *   3. **SAUTER À VOIX HAUTE** quand ni l'un ni l'autre n'est possible, en
 *      nommant ce qui manquait. Un `test.skip` reste visible dans le rapport
 *      et ne prétend pas avoir trouvé quelque chose.
 *
 * ⚠️ ET LE SAUT EST LE DERNIER RECOURS. Une suite où tout se saute rend le
 * même vert qu'une suite qui prouve tout : chaque saut doit nommer la donnée
 * manquante, pour qu'on sache quoi fabriquer le jour où on veut la preuve.
 */
const SANS = (quoi) => `donnée absente sur ce compte : ${quoi}`

module.exports = {
  test,
  expect: base.expect,
  BASE,
  toucher,
  remplir,
  suivre,
  insister,
  ouvrirInfos,
  compter,
  adresseDe,
  demain,
  poserRdv,
  retirerRdv,
  ADRESSE_FICHE,
  SANS,
}
