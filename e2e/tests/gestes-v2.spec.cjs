// LES QUATRE GESTES DE LA FICHE V2, et l'icône d'Atlas.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/gestes-v2.spec.cjs
//
// 🔴 ON N'ÉCRIT QUE SUR LE CONTACT JETABLE. La fixture `seed` en crée un par
// test et le supprime : les contacts de Patrice sont sa matière première.

const { test, expect, toucher, compter, ouvrirInfos } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** Les quatre cartes, dans l'ordre du DOM. */
const gestes = (page) => page.locator('[data-geste]')
const geste = (page, nom) => page.locator(`[data-geste="${nom}"]`)

/**
 * APPELER PAR LE TELEPHONE, QUEL QUE SOIT L'ETAT DU GESTE.
 *
 * 🔴 DEPUIS LE 18 NOVEMBRE 2026, « Appeler » n'est plus toujours un lien.
 * Avec un numero international, le telephone ET WhatsApp sont vivants : le
 * geste ouvre alors un menu, et le lien `tel:` vit dans une entree. Avec un
 * numero national, un seul canal est vivant et le geste agit directement.
 *
 * 🧭 Les sondes du JOURNAL ne parlent pas de cette bascule -- elles parlent
 * de ce qui s'ecrit au retour d'un appel. Elles passent donc par ce chemin,
 * qui marche dans les deux cas, au lieu de dependre d'une forme qu'elles ne
 * surveillent pas.
 */
async function appelerParTelephone(page) {
  const carte = geste(page, 'Appeler')
  await expect(carte).toBeVisible({ timeout: 20_000 })
  await carte.click()
  const menu = page.locator('[data-menu-canaux]')
  if (await menu.isVisible().catch(() => false)) {
    await menu.locator('[data-canal="Téléphone"]').click()
  }
}

/** 🔴 CE QU'ON ATTEND, DÉCLARÉ. Une sonde qui ne dit pas combien d'éléments
 *  elle doit trouver passe au vert quand elle n'en trouve aucun — c'est ce
 *  qui a laissé deux sondes de hauteur mentir en même temps le 8 novembre. */
// ⚠️ « S'entraîner » depuis le 10 novembre 2026, et non « Simuler » : à côté
// d'« Appeler », sur la fiche d'une VRAIE personne, *simuler* se lit d'abord
// **feindre**. L'apostrophe est la TYPOGRAPHIQUE (’), comme partout ailleurs
// dans l'app — une droite ne correspondrait à rien.
const ENTRAINER = 'S’entraîner'
/**
 * LES QUATRE GESTES ONT CHANGE DE NOM ET DE NATURE le 18 novembre 2026.
 *
 * « SMS » est devenu « Message » parce que la carte n'ouvre plus un canal
 * mais le CHOIX entre SMS, WhatsApp et e-mail. L'e-mail est descendu dans ce
 * menu, ce qui a libere la quatrieme place pour « RDV » -- dont la carte de
 * 74 px au milieu de la fiche a disparu en meme temps : une action posee au
 * milieu d'une explication, et deux declencheurs pour un meme geste.
 */
const ATTENDUS = ['Appeler', ENTRAINER, 'Message', 'RDV']

/**
 * SE COMPORTER COMME UN TÉLÉPHONE.
 *
 * 🔴 SANS ÇA, LA SONDE DU JOURNAL EST INTERMITTENTE, et le symptôme ne
 * désigne pas la cause. Chrome sans tête n'a **aucun gestionnaire** pour
 * `tel:` : le clic déclenche une navigation qu'il finit par abandonner, et
 * pendant ce temps la page commence à se décharger — le DOM reste peint, mais
 * React ne reçoit plus les événements. Le clic suivant tombe alors dans le
 * vide, sans la moindre exception. Mesuré le 10 novembre 2026 : le défaut
 * n'apparaissait QUE lorsqu'une seconde s'écoulait entre les deux clics.
 *
 * ⚠️ Sur un vrai téléphone, `tel:`, `sms:` et `mailto:` passent la main à une
 * autre application **sans décharger la page** : au retour, la question est
 * encore là. C'est ce comportement-là qu'on reproduit, pas un contournement —
 * on empêche la navigation, et rien d'autre.
 *
 * `capture: true` arrive AVANT la délégation de React (qui écoute en phase de
 * bouillonnement depuis la racine) : le `onClick` du composant part
 * normalement, seule la navigation est annulée.
 */
const commeUnTelephone = (page) =>
  page.addInitScript(() => {
    document.addEventListener(
      'click',
      (e) => {
        const a = e.target instanceof Element ? e.target.closest('a[href]') : null
        if (a && /^(tel|sms|mailto):/i.test(a.getAttribute('href') || '')) e.preventDefault()
      },
      true,
    )
  })

test('les quatre gestes, dans l’ordre, et éteints sans coordonnée', async ({
  page,
  pageErrors,
  seed,
}) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })

  await expect(gestes(page)).toHaveCount(ATTENDUS.length)
  expect(
    await gestes(page).evaluateAll((n) => n.map((e) => e.getAttribute('data-geste'))),
  ).toEqual(ATTENDUS)

  // Le contact jetable n'a ni numéro ni adresse : trois cartes sur quatre
  // doivent être ÉTEINTES — ni liens morts, ni boutons qui crient au doigt.
  // ⚠️ DEUX, PAS TROIS. « RDV » est toujours allume -- poser un rendez-vous
  // ne demande aucune coordonnee -- et « S'entrainer » aussi.
  for (const nom of ['Appeler', 'Message']) {
    await expect(geste(page, nom)).toHaveAttribute('data-eteint', '')
    // ⚠️ Un `<span>` n'est pas un lien : c'est ça qu'on vérifie, pas la
    // couleur. Une carte grise qui navigue quand même serait le vrai défaut.
    expect(await geste(page, nom).evaluate((e) => e.tagName)).toBe('SPAN')
  }

  // 🔴 SIMULER EST TOUJOURS ALLUMÉ : `preparerRepetition` accepte un contact
  // sans recommandation et retombe sur l'exercice du point faible.
  await expect(geste(page, ENTRAINER)).toHaveAttribute(
    'href',
    `/coach/repeter?contact=${seed.cid}`,
  )

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toHaveLength(0)
})

test('la carte allumée porte sa couleur, l’éteinte reste la surface', async ({ page, seed }) => {
  /**
   * CETTE SONDE GARDAIT L'INVERSE JUSQU'AU 18 NOVEMBRE 2026, et elle avait
   * raison a l'epoque. Patrice, le 10 novembre : « je vois des carres en
   * transparence derriere les icones » -- quatre `--color-fond` dans une
   * barre a `--color-surface`, c'est-a-dire un cadre dans un cadre.
   *
   * Il a demande l'inverse le 18 : « c'est la carte entiere qui est de
   * couleur ». Ce n'est pas un retour en arriere : le defaut d'alors etait
   * un fond PRESQUE identique a celui de la barre, qui ne disait rien et se
   * voyait quand meme. Une carte franchement coloree, elle, DIT quelque
   * chose.
   *
   * ⚠️ IL PROPOSAIT UNE ICONE BLANCHE. La mesure a tranche autrement, et la
   * charte le disait deja : blanc sur orange = 2,8, sur teal 2,49, sur bleu
   * 3,68 -- il en faut 4,5 pour du texte. C'est ce seuil que cette sonde
   * garde maintenant, parce que c'est lui qu'on oublierait.
   */
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })
  await expect(gestes(page)).toHaveCount(ATTENDUS.length)

  const lus = await gestes(page).evaluateAll((n) =>
    n.map((e) => ({
      mot: e.getAttribute('data-geste'),
      eteint: e.hasAttribute('data-eteint'),
      fond: getComputedStyle(e).backgroundColor,
      encre: getComputedStyle(e.querySelector('span:last-child') || e).color,
    })),
  )
  console.log(`  ${lus.map((f) => `${f.mot}=${f.fond}`).join(' · ')}`)

  /** Le contraste WCAG entre deux couleurs rendues, sans rien deviner. */
  const contraste = (a, b) => {
    const lum = (c) => {
      const p = (c.match(/[\d.]+/g) || []).slice(0, 3).map((x) => Number(x) / 255)
      const v = p.map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)))
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
    }
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
    return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100
  }
  // 🔴 ON PROUVE LE DETECTEUR SUR LE VRAI CAS, avant de compter : le blanc
  // sur l'orange est bien ce qu'il doit refuser.
  expect(contraste('rgb(249, 115, 22)', 'rgb(255, 255, 255)')).toBeLessThan(4.5)
  expect(contraste('rgb(249, 115, 22)', 'rgb(24, 25, 26)')).toBeGreaterThan(4.5)

  for (const g of lus) {
    const lisible = contraste(g.fond, g.encre)
    if (g.eteint) {
      // L'eteinte est la SURFACE, pas un gris invente : l'app n'a qu'un seul
      // « eteint », celui des pastilles.
      expect(['rgb(255, 255, 255)', 'rgb(23, 24, 27)'], `${g.mot} éteint : ${g.fond}`).toContain(
        g.fond,
      )
    } else {
      const neutre =
        g.fond === 'rgba(0, 0, 0, 0)' ||
        ['rgb(255, 255, 255)', 'rgb(245, 245, 246)', 'rgb(23, 24, 27)', 'rgb(15, 16, 18)'].includes(
          g.fond,
        )
      expect(neutre, `${g.mot} est allumé mais n’a pas de couleur (${g.fond})`).toBe(false)
    }
    expect(lisible, `${g.mot} : encre à ${lisible} sur son fond, il en faut 4,5`).toBeGreaterThan(
      4.5,
    )
  }
})

test('un numéro international ouvre les menus, et WhatsApp s’y allume', async ({ page, seed }) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })

  // On renseigne le numéro PAR L'ÉCRAN, pas en base : c'est le chemin réel,
  // et il prouve au passage que « Ce qui manque » mène bien quelque part.
  const puce = page.locator('[data-manque="phone"]')
  await expect(puce).toBeVisible()
  await toucher(puce, page.locator('[data-saisie="phone"]'))
  await page.locator('[data-saisie="phone"]').fill('+33 6 12 34 56 78')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  // 🔴 ATTENDRE QUE LA RANGÉE SE REFERME SUR SA VALEUR AVANT DE RECHARGER.
  // Sans ça, le rechargement court contre l'action serveur : la fiche revient
  // parfois SANS le numéro, « Appeler » est alors éteint, et la sonde échoue
  // en désignant le `href` — le symptôme est à dix lignes de la cause.
  await expect(page.locator('[data-champ="phone"]')).toContainText('+33', { timeout: 20_000 })

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })

  for (const nom of ['Appeler', 'Message']) {
    await expect(geste(page, nom)).not.toHaveAttribute('data-eteint', '')
  }

  /**
   * 🔴 AVEC UN INDICATIF, LE GESTE DEVIENT UN MENU -- et c'est la regle, pas
   * un effet de bord. Un menu ne s'ouvre que si DEUX canaux au moins sont
   * vivants ; ici le telephone ET WhatsApp le sont, donc « Appeler » cesse
   * d'etre un lien direct.
   *
   * 🧭 C'est ce qui tient les deux verites de la discussion du 18 novembre :
   * Patrice voulait le choix WhatsApp (« certaines passent des appels par
   * WhatsApp »), et un menu a une seule entree aurait coute une touche pour
   * rien. La sonde garde la bascule elle-meme.
   */
  expect(await geste(page, 'Appeler').evaluate((e) => e.tagName)).toBe('BUTTON')
  await geste(page, 'Appeler').click()
  const menu = page.locator('[data-menu-canaux]')
  await expect(menu, 'deux canaux vivants et pas de menu').toBeVisible({ timeout: 10_000 })

  // Les espaces tombent, le « + » reste : `tel:` en a besoin.
  await expect(menu.locator('[data-canal="Téléphone"]')).toHaveAttribute(
    'href',
    'tel:+33612345678',
  )
  // ⚠️ `wa.me` VEUT DES CHIFFRES SEULS. Un « + » ou une espace et WhatsApp
  // s'ouvre sur une erreur de numero, ce qui ressemble a un bug de WhatsApp.
  await expect(menu.locator('[data-canal="WhatsApp"]')).toHaveAttribute(
    'href',
    'https://wa.me/33612345678',
  )
  await expect(menu.locator('[data-canal="WhatsApp"]')).not.toHaveAttribute('data-eteint', '')

  // Le menu se referme, sinon la capture qui suit le montrerait.
  await page.getByRole('button', { name: 'Refermer' }).last().click()
  await expect(menu).toHaveCount(0, { timeout: 10_000 })

  // ── LES CAPTURES, une fois les gestes ALLUMÉS ──
  // ⚠️ Ici et pas dans un test à part : une capture de la fiche vide
  // montrerait quatre cartes grises, c'est-à-dire pas ce qu'on veut regarder.
  // 🔴 REMONTER D'ABORD. La saisie du numéro a fait défiler la page ; un
  // `clip` part du haut du CADRE, pas du haut du document, et ma première
  // capture a donc montré le milieu de la fiche. Rien ne l'aurait dit : une
  // capture ratée est une image valide.
  await page.evaluate(() => window.scrollTo(0, 0))
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
    // Les animations figées, sinon la capture attrape une carte à mi-chemin —
    // la leçon du 8 novembre sur les mesures prises pendant une animation.
    await page.evaluate(() =>
      document.getAnimations().forEach((a) => {
        try {
          a.finish()
        } catch {}
      }),
    )
    // ⚠️ L'ÉCRAN ENTIER, plus un rognage du haut : depuis que la rangée est
    // fixée en bas, une capture des 430 premiers pixels montre exactement ce
    // qu'on a déplacé — c'est-à-dire plus rien.
    await page.screenshot({ path: `capture-gestes-${theme}.png`, animations: 'disabled' })
  }
})

test('la rangée est FIXE, en bas, et survit au défilement', async ({ page, seed }) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-gestes]')).toBeVisible({ timeout: 20_000 })

  /**
   * ⚠️ ON OUVRE « INFOS » POUR AVOIR DE QUOI DÉFILER.
   *
   * Depuis le 18 novembre 2026 l'onglet Fiche tient presque sur un écran :
   * les 23 rangées de champs sont passées derrière le second onglet. Une
   * sonde qui défile sur une page qui ne défile pas ne prouve rien, et son
   * assertion plus bas l'exige explicitement.
   *
   * 🧭 Et ça vérifie au passage ce qui compte vraiment ici : la rangée de
   * gestes est HORS des onglets. Appeler quelqu'un doit rester possible
   * pendant qu'on corrige son métier — une action rangée dans un onglet
   * devient une action qu'on ne peut plus faire là où on est.
   */
  await ouvrirInfos(page)

  const mesure = () =>
    page.evaluate(() => {
      const r = document.querySelector('[data-gestes]').getBoundingClientRect()
      return {
        bas: Math.round(window.innerHeight - r.bottom),
        haut: Math.round(r.top),
        page: Math.round(document.documentElement.scrollHeight),
        vue: window.innerHeight,
      }
    })

  const avant = await mesure()
  // Collée au bas de la VUE, pas du document.
  expect(avant.bas, 'la rangée ne touche pas le bas').toBeLessThanOrEqual(1)

  // 🔴 LA PREUVE QUI COMPTE : elle est toujours là après avoir défilé. C'est
  // tout l'objet du changement — avant, les cartes occupaient y = 90–175 et
  // disparaissaient au premier coup de pouce sur une fiche de 1,6 à 2,1
  // écrans.
  expect(
    avant.page,
    'cette fiche tient dans un écran : le défilement ne prouverait rien',
  ).toBeGreaterThan(avant.vue + 200)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  const apres = await mesure()
  expect(apres.bas, 'la rangée a bougé en défilant').toBeLessThanOrEqual(1)
  expect(apres.haut).toBe(avant.haut)

  // ⚠️ ET RIEN NE PASSE DESSOUS. La coquille réserve `HAUTEUR_ACTION` via
  // `barre` ; si quelqu'un retirait ce drapeau, le dernier élément de la
  // page glisserait derrière la rangée et personne ne le verrait.
  const dernier = page.locator('main *').last()
  const recouvert = await dernier.evaluate(
    (e, basRangee) => e.getBoundingClientRect().bottom > basRangee,
    await page.evaluate(() => document.querySelector('[data-gestes]').getBoundingClientRect().top),
  )
  expect(recouvert, 'le bas de la page passe sous la rangée').toBe(false)
})

test('un appel journalisé monte le compteur d’expositions EN BASE', async ({ page, seed }) => {
  // 🔴 ON COMPTE EN BASE, PAS À L'ÉCRAN. Un `revalidatePath` rafraîchit un
  // écran à partir de ce qu'il trouve ; il ne prouve pas qu'on a écrit.
  const avant = compter(seed.cid)
  expect(avant.exposures, 'le contact jetable devrait partir de zéro').toBe(0)
  expect(avant.interactions).toHaveLength(0)

  // Il faut un numéro pour que « Appeler » soit allumé.
  await commeUnTelephone(page)
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  const puce = page.locator('[data-manque="phone"]')
  await expect(puce).toBeVisible({ timeout: 20_000 })
  await toucher(puce, page.locator('[data-saisie="phone"]'))
  await page.locator('[data-saisie="phone"]').fill('+33 6 12 34 56 78')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  // Attendre la rangee refermee sur sa valeur : recharger tout de suite court
  // contre l'action serveur, et « Appeler » revient parfois eteint.
  await expect(page.locator('[data-champ="phone"]')).toContainText('+33', { timeout: 20_000 })
  await page.reload({ waitUntil: 'domcontentloaded' })

  // ⚠️ RIEN N'EST ÉCRIT AU MOMENT DU GESTE. Ouvrir le téléphone ne prouve
  // pas qu'on a parlé : c'est la règle du journal, et on la vérifie ici.
  await appelerParTelephone(page)
  await expect(page.locator('[data-question]')).toBeVisible({ timeout: 10_000 })
  const pendant = compter(seed.cid)
  expect(pendant.exposures, 'une exposition a été comptée AVANT la réponse').toBe(0)
  expect(pendant.interactions).toHaveLength(0)

  // …et la réponse, elle, écrit.
  await page.locator('[data-issue="POSITIF"]').click()
  await expect(page.locator('[data-enregistre]')).toBeVisible({ timeout: 15_000 })

  const apres = compter(seed.cid)
  expect(apres.exposures, 'l’exposition n’a pas été comptée').toBe(1)
  expect(apres.lastContact, 'le dernier échange n’a pas été daté').not.toBeNull()
  expect(apres.interactions).toHaveLength(1)
  expect(apres.interactions[0]).toMatchObject({
    type: 'APPEL',
    outcome: 'POSITIF',
    direction: 'OUT',
    isExposure: true,
  })
})

test('« Pas fait » n’écrit rien, et c’est le point', async ({ page, seed }) => {
  await commeUnTelephone(page)
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  const puce = page.locator('[data-manque="phone"]')
  await expect(puce).toBeVisible({ timeout: 20_000 })
  await toucher(puce, page.locator('[data-saisie="phone"]'))
  await page.locator('[data-saisie="phone"]').fill('+33 6 12 34 56 78')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  // Attendre la rangee refermee sur sa valeur : recharger tout de suite court
  // contre l'action serveur, et « Appeler » revient parfois eteint.
  await expect(page.locator('[data-champ="phone"]')).toContainText('+33', { timeout: 20_000 })
  await page.reload({ waitUntil: 'domcontentloaded' })

  await appelerParTelephone(page)
  await expect(page.locator('[data-question]')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Pas fait' }).click()

  // La rangée reprend sa forme, et la base n'a pas bougé.
  await expect(page.locator('[data-geste="Appeler"]')).toBeVisible({ timeout: 10_000 })
  const etat = compter(seed.cid)
  expect(etat.exposures, 'un compteur gonflé par un appel qu’on n’a pas passé').toBe(0)
  expect(etat.interactions).toHaveLength(0)
})

test('s’entraîner ne compte JAMAIS comme une exposition', async ({ page, seed }) => {
  // 🔴 S'entraîner n'est pas joindre quelqu'un. Sans ce contrôle, un canal
  // ajouté par distraction sur « Simuler » gonflerait le compteur qui décide
  // du prochain pas — on croirait avoir parlé à quelqu'un à qui l'on s'est
  // contenté de penser.
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  const simuler = page.locator(`[data-geste="${ENTRAINER}"]`)
  await expect(simuler).toBeVisible({ timeout: 20_000 })
  await simuler.click()
  await expect(page).toHaveURL(/\/coach\/repeter/, { timeout: 20_000 })

  const etat = compter(seed.cid)
  expect(etat.exposures).toBe(0)
  expect(etat.interactions).toHaveLength(0)
})

test('la croix referme sur la liste', async ({ page, seed }) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  const croix = page.getByRole('link', { name: 'Fermer la fiche' })
  await expect(croix).toBeVisible({ timeout: 20_000 })
  // ⚠️ `click({trial:true})` d'abord : `toBeVisible` ne détecte PAS
  // l'occultation, et l'en-tête est `sticky` au-dessus du contenu.
  await croix.click({ trial: true })
  await croix.click()
  await expect(page).toHaveURL(/\/gens$/, { timeout: 20_000 })
})

test('s’entraîner depuis une fiche joue l’appel que SON étape impose', async ({ page, seed }) => {
  // 🔴 LE DÉFAUT QUE CE CONTRÔLE GARDE : `preparerRepetition` écartait le
  // point faible dès qu'un contact était passé, si bien qu'un CLIENT — qui
  // n'a aucune étape, donc aucun appel imposé, six en production le 10
  // novembre 2026 — retombait sur `catalogue[0]`, le premier scénario de la
  // liste, pendant que l'écran annonçait « En face : <prénom> ».
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-gestes]')).toBeVisible({ timeout: 20_000 })

  // Le contact jetable est PROSPECT / NOUVEAU : la fiche annonce donc l'appel
  // que cette étape impose. On lit ce qu'elle promet…
  // ⚠️ `hasText` LIT LA SOURCE, pas le rendu : la bande est mise en capitales
  // par le CSS, et c'est bien « Ton entraînement » qu'il faut écrire ici.
  // Elle disait « À simuler » jusqu'au 10 novembre 2026.
  /**
   * 🔴 ELLE PRÉLEVAIT « LA DEUXIÈME LIGNE DE LA CARTE », et ça a cassé.
   *
   * Le 18 novembre 2026, « Ton entraînement » et « La leçon qui prépare » ont
   * fusionné en « Pour te préparer » — deux cartes pour une seule idée. La
   * carte a gagné un titre, et `promis[1]` désignait désormais autre chose.
   *
   * 🧭 UNE POSITION DANS UN BLOC DE TEXTE N'EST PAS UN REPÈRE : elle se
   * déplace à chaque rangement, et le rouge arrive loin de la cause. Le titre
   * de l'appel porte maintenant `data-appel-titre`.
   */
  const titre = page.locator('[data-appel-titre]')
  await expect(titre, 'la carte « Pour te préparer » ne nomme aucun appel').toBeVisible({
    timeout: 15_000,
  })
  const titreAppel = (await titre.innerText()).trim()

  // …puis on suit le geste, et les deux écrans doivent dire la MÊME chose.
  await page.locator(`[data-geste="${ENTRAINER}"]`).click()
  await expect(page).toHaveURL(/\/coach\/repeter/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })

  const corps = await page.locator('body').innerText()
  expect(corps, `l’antichambre ne parle pas de « ${titreAppel} »`).toContain(titreAppel)
  // Et elle sait qui elle a en face.
  // ⚠️ INSENSIBLE À LA CASSE : `innerText` APPLIQUE `text-transform`, donc la
  // page rend « EN FACE : … ». C'est l'inverse exact du piège de `toContainText`,
  // qui lui lit la source — les deux m'ont eu le même jour.
  expect(corps).toMatch(/en face\s*:/i)
})

test('aucun doublon : une seule porte vers la simulation, et plus de geste du jour', async ({
  page,
  seed,
}) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })

  // 🔴 LA RÈGLE DE LA MAISON : jamais deux gestes vers le même endroit. La
  // carte teal menait là où mène désormais la deuxième carte.
  await expect(page.locator('a[href*="/coach/repeter"]')).toHaveCount(1)

  // Et le geste du jour « Appeler X » au-dessus de la barre a disparu : la
  // coquille l'écrit — « la page ne doit JAMAIS répéter ce geste ».
  await expect(page.getByRole('link', { name: /^Appeler .+/ })).toHaveCount(0)
})

test('l’en-tête porte l’identité, et la carte « qui c’est » n’est plus là', async ({
  page,
  seed,
}) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  const titre = page.getByRole('heading', { level: 1 })
  await expect(titre).toBeVisible({ timeout: 20_000 })

  // Le nom COMPLET, pas le prénom seul comme avant.
  await expect(titre).toHaveText('E2E Test')

  const entete = page.locator('header')
  /**
   * 🔴 L'ÉTAPE A QUITTÉ L'EN-TÊTE le 18 novembre 2026 — Patrice : *« prénom
   * et nom suffisent »*. Elle y était une étiquette grise en capitales ; elle
   * est maintenant collée à la phrase qu'elle décide, dans « Prochaine
   * étape ».
   *
   * 🧭 ON NE BAISSE PAS L'EXIGENCE, ON LA DÉPLACE : l'étape doit toujours
   * être lisible quelque part, sinon on l'aurait simplement perdue — et une
   * sonde qui se contente de constater sa disparition ne l'aurait pas vu.
   *
   * ⚠️ « Nouveau » ET NON « NOUVEAU » : les capitales viennent d'un
   * `text-transform`, et `toContainText` lit la SOURCE.
   */
  await expect(entete).not.toContainText('Nouveau')
  await expect(
    page.locator('[data-prochaine-etape]'),
    'l’étape a quitté l’en-tête sans réapparaître nulle part',
  ).toContainText('Nouveau')
  // Les initiales restent dans l'en-tête : c'est la seule information de
  // l'ancienne carte qui soit purement visuelle.
  await expect(entete).toContainText('ET')

  // 🔴 ET LE NOM N'EST PLUS ÉCRIT DEUX FOIS. La carte « qui c'est » répétait
  // juste sous l'en-tête ce que l'en-tête disait déjà.
  expect(await page.getByText('E2E Test', { exact: true }).count()).toBe(1)
})

test('les quatre cartes tiennent, et à la MÊME hauteur, de 320 à 430', async ({ page, seed }) => {
  // 🔴 JAMAIS UNE SEULE LARGEUR. On s'est trompé deux fois là-dessus — la
  // liste des contacts, puis les titres de module — et les deux fois la
  // sonde était verte à 390.
  for (const largeur of [320, 360, 390, 430]) {
    await page.setViewportSize({ width: largeur, height: 844 })
    await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })
    await expect(gestes(page)).toHaveCount(ATTENDUS.length)

    const boites = await gestes(page).evaluateAll((n) =>
      n.map((e) => {
        const r = e.getBoundingClientRect()
        return { h: Math.round(r.height), droite: Math.round(r.right) }
      }),
    )
    const hauteurs = [...new Set(boites.map((b) => b.h))]
    expect(hauteurs, `à ${largeur} px, hauteurs différentes : ${hauteurs.join(', ')}`).toHaveLength(1)

    // Rien ne déborde : la rangée ne défile pas, un cinquième élément hors
    // écran serait invisible et inatteignable.
    const debord = Math.max(...boites.map((b) => b.droite))
    expect(debord, `à ${largeur} px, la rangée sort de ${debord - largeur} px`).toBeLessThanOrEqual(
      largeur,
    )

    // ⚠️ ET LE VERBE N'EST PAS ROGNÉ. `truncate` empêche le retour à la
    // ligne, mais une carte trop étroite afficherait « E-ma… » : c'est
    // lisible pour le code et faux pour l'œil.
    const rogne = await gestes(page).evaluateAll((n) =>
      n
        .map((e) => e.querySelector('span.truncate'))
        .filter((s) => s && s.scrollWidth > s.clientWidth + 1)
        .map((s) => s.textContent),
    )
    expect(rogne, `à ${largeur} px, verbes rognés : ${rogne.join(', ')}`).toHaveLength(0)
  }
})

test('Atlas et Contacts n’ont plus le même glyphe', async ({ page, seed }) => {
  // ⚠️ L'ACCUEIL, PAS LA FICHE : depuis le 10 novembre 2026 la fiche est en
  // pleine page et n'a plus de barre du bas. Ma sonde y cherchait encore la
  // barre — elle mesurait le bon glyphe au mauvais endroit.
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  const barre = page.getByRole('navigation', { name: 'Navigation principale' })
  await expect(barre).toBeVisible({ timeout: 20_000 })

  // 🔴 LE DÉFAUT ÉTAIT MUET : faute de cas `Atlas`, `icones.tsx` rendait son
  // REPLI — les deux silhouettes de « Contacts ». Un repli est un rendu
  // valide, donc rien ne pouvait échouer.
  const dessin = async (nom) =>
    barre.getByRole('link', { name: nom }).locator('svg').innerHTML()

  const atlas = await dessin('Atlas')
  const contacts = await dessin('Contacts')
  expect(atlas.length, 'le glyphe d’Atlas est vide').toBeGreaterThan(40)
  expect(atlas).not.toBe(contacts)
})
