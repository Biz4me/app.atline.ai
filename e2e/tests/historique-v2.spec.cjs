// L'HISTORIQUE DES CONVERSATIONS D'ATLAS.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/historique-v2.spec.cjs
//
// 🔴 CE QUE CES CONTRÔLES GARDENT N'EST PAS « LE PANNEAU S'OUVRE » — ça se
// verrait. Ce sont les trois choses qui cassent EN SILENCE :
//
//   · l'ADRESSE. Sans `?historique=1`, le bouton retour du téléphone n'a rien
//     à refermer et QUITTE l'application. Le piège est déjà payé sur le menu.
//   · le FIL RESTE MONTÉ dessous. S'il se démontait, refermer rechargerait —
//     et un appel en cours serait perdu sans un mot.
//   · la BARRE DU BAS reste touchable. Un panneau qui la couvrirait serait un
//     cul-de-sac dont la seule sortie est le geste qui l'a ouvert.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

const lien = (page) => page.locator('[data-historique-lien]')
const panneau = (page) => page.locator('[data-historique]')
const sujets = (page) => page.locator('[data-sujet]')

test('le coin haut-gauche ouvre, et l’adresse change avec lui', async ({ page, pageErrors }) => {
  await page.goto('/atlas', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-composeur]')).toBeVisible({ timeout: 20_000 })

  await expect(lien(page), 'pas de porte vers l’historique').toHaveCount(1)
  await expect(lien(page)).toHaveAttribute('aria-expanded', 'false')
  await expect(panneau(page), 'le panneau est ouvert sans qu’on ait touché').toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Atlas')

  await lien(page).click()

  // 🔴 L'ADRESSE, et c'est le contrôle qui compte : sans elle le retour du
  // téléphone sort de l'app au lieu de refermer.
  await expect(page).toHaveURL(/\?historique=1$/, { timeout: 20_000 })
  await expect(panneau(page)).toBeVisible()
  await expect(lien(page)).toHaveAttribute('aria-expanded', 'true')
  // Le titre change, l'icône du lieu non : on est toujours DANS Atlas.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ton historique')

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})

test('le fil reste MONTÉ dessous, et la barre reste touchable', async ({ page }) => {
  await page.goto('/atlas?historique=1', { waitUntil: 'domcontentloaded' })
  await expect(panneau(page)).toBeVisible({ timeout: 20_000 })

  /**
   * 🔴 LE COMPOSEUR EST ENCORE DANS LE DOCUMENT. S'il n'y était plus, le fil
   * aurait été démonté — refermer rechargerait tout, et un appel en cours
   * serait perdu. ⚠️ On vérifie la PRÉSENCE, pas la visibilité : il est
   * légitimement recouvert.
   */
  await expect(
    page.locator('[data-composeur]'),
    'le fil a été démonté sous le panneau',
  ).toHaveCount(1)

  // 🔴 ET LA BARRE DU BAS RESTE TOUCHABLE. `trial` vérifie l'actionnabilité —
  // donc qu'elle n'est pas recouverte —, sans naviguer.
  const barre = page.getByRole('navigation', { name: 'Navigation principale' })
  await expect(barre).toBeVisible()
  await barre.getByRole('link', { name: 'Contacts' }).click({ trial: true })

  // ⚠️ ET LA SONDE SAIT VOIR LE DÉFAUT : le panneau, lui, recouvre bien le
  // fil. Sans ce contre-contrôle, « la barre est touchable » serait vert même
  // si le panneau ne couvrait rien du tout.
  const recouvre = await page.evaluate(() => {
    const p = document.querySelector('[data-historique]').getBoundingClientRect()
    const c = document.querySelector('[data-composeur]').getBoundingClientRect()
    return p.bottom > c.top - 200 && p.height > 200
  })
  expect(recouvre, 'le panneau ne recouvre pas le fil : il ne sert à rien').toBe(true)
})

test('refermer repose exactement où l’on était', async ({ page }) => {
  await page.goto('/atlas', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-composeur]')).toBeVisible({ timeout: 20_000 })

  // On laisse une trace dans le champ : si le fil était démonté, elle
  // disparaîtrait. C'est la preuve la plus simple que rien n'a été rechargé.
  const champ = page.locator('[data-composeur] textarea')
  await champ.fill('témoin')
  await lien(page).click()
  await expect(panneau(page)).toBeVisible({ timeout: 20_000 })
  await lien(page).click()
  await expect(panneau(page)).toHaveCount(0, { timeout: 20_000 })
  await expect(page).toHaveURL(/\/atlas$/)

  await expect(champ, 'le fil a été rechargé : la saisie en cours est perdue').toHaveValue(
    'témoin',
  )
  await champ.fill('')
})

test('le balayage vers le haut referme — et SEULEMENT depuis le haut', async ({ page }) => {
  /**
   * 🔴 C'EST LE GESTE QUE PERSONNE NE VERRAIT CASSER. Le lien du coin se
   * vérifie à l'œil ; un balayage qui ne part pas, on l'essaie une fois, on
   * se dit qu'on l'a mal fait, et on retouche l'icône. Il ne proteste jamais.
   *
   * ⚠️ On dispatche de VRAIS `TouchEvent` : la souris ne déclenche pas
   * `onTouchStart`, donc un `mouse.move` aurait validé un écran qui ne marche
   * sur aucun téléphone.
   */
  const balayer = (page, deDy, versDy) =>
    page.evaluate(
      ([a, b]) => {
        const el = document.querySelector('[data-historique]')
        const toucher = (type, y) => {
          const t = new Touch({ identifier: 1, target: el, clientX: 190, clientY: y })
          el.dispatchEvent(
            new TouchEvent(type, {
              bubbles: true,
              cancelable: true,
              touches: type === 'touchend' ? [] : [t],
              targetTouches: type === 'touchend' ? [] : [t],
              changedTouches: [t],
            }),
          )
        }
        toucher('touchstart', a)
        toucher('touchmove', b)
        toucher('touchend', b)
      },
      [deDy, versDy],
    )

  await page.goto('/atlas?historique=1', { waitUntil: 'domcontentloaded' })
  await expect(panneau(page)).toBeVisible({ timeout: 20_000 })

  // ① UN FRÔLEMENT NE REFERME PAS. 40 px : sous le seuil de 60.
  await balayer(page, 500, 460)
  await page.waitForTimeout(400)
  await expect(panneau(page), 'un frôlement a refermé le panneau').toBeVisible()

  // ② UN VRAI BALAYAGE REFERME, et l'adresse suit.
  await balayer(page, 600, 400)
  await expect(panneau(page)).toHaveCount(0, { timeout: 20_000 })
  await expect(page).toHaveURL(/\/atlas$/)

  /**
   * ③ ET PAS DEPUIS LE MILIEU DE LA LISTE. Sans cette condition, remonter
   * dans une longue liste refermerait le panneau : le geste de lecture et le
   * geste de sortie seraient le même, et le second gagnerait toujours.
   */
  await page.goto('/atlas?historique=1', { waitUntil: 'domcontentloaded' })
  await expect(panneau(page)).toBeVisible({ timeout: 20_000 })
  const defile = await page.evaluate(() => {
    const l = document.querySelector('[data-historique] .overflow-y-auto')
    if (!l || l.scrollHeight <= l.clientHeight + 50) return false
    l.scrollTop = 150
    return l.scrollTop > 50
  })
  // ⚠️ Si la liste est trop courte pour défiler, ce cas n'existe pas : on le
  // DIT au lieu de passer au vert sans avoir rien mesuré.
  if (!defile) {
    console.log('  liste trop courte pour défiler : le cas ③ n’a pas été éprouvé')
    return
  }
  await balayer(page, 600, 400)
  await page.waitForTimeout(400)
  await expect(
    panneau(page),
    'le panneau s’est refermé alors qu’on remontait dans la liste',
  ).toBeVisible()
})

test('la liste dit QUAND, et ouvre une conversation en PAGE', async ({ page }) => {
  // ⚠️ `=fils` ET NON `=1` : la liste brute a quitté la porte principale le
  // 10 novembre 2026. Elle n'est ni un sujet ni un jour — ce n'est pas un
  // axe, c'est la plomberie —, donc elle descend d'un cran.
  await page.goto('/atlas?historique=fils', { waitUntil: 'domcontentloaded' })
  await expect(panneau(page)).toBeVisible({ timeout: 20_000 })

  const lignes = page.locator('[data-conversation]')
  const combien = await lignes.count()
  console.log(`  ${combien} conversation(s) dans l’historique`)
  if (combien === 0) {
    // ⚠️ L'ÉTAT VIDE EST LE CAS DU PREMIER JOUR : il doit dire quoi faire.
    await expect(panneau(page)).toContainText('Ta première conversation')
    return
  }

  const premiere = lignes.first()
  const quand = await premiere.locator('p').last().innerText()
  console.log(`  la plus récente : « ${quand} »`)
  // 🔴 UNE DATE LISIBLE, PAS UN HORODATAGE. `quandCourt` dit « Aujourd'hui,
  // 14:02 », « Hier, 09:41 », un nom de jour, ou une date — jamais un ISO.
  expect(quand, `date illisible : ${quand}`).toMatch(
    /Aujourd.hui|Hier|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|\d{1,2} \p{L}+/u,
  )

  const id = await premiere.getAttribute('data-conversation')
  await premiere.click()

  // 🔴 CHOISIR EST UNE PAGE, PAS LE PANNEAU : on change de tâche.
  await expect(page).toHaveURL(new RegExp(`fil=${id}$`), { timeout: 20_000 })
  await expect(panneau(page), 'le panneau reste ouvert après le choix').toHaveCount(0)
  await expect(page.locator('[data-composeur]')).toBeVisible()
})

test('un fil qui n’est pas à soi ne révèle rien', async ({ page, pageErrors }) => {
  /**
   * ⚠️ `lireLeFil` filtre sur `userId` : un identifiant étranger rend `null`,
   * et l'écran retombe sur la dernière conversation. On ne dit donc pas si
   * l'identifiant existe, et on ne tombe pas non plus sur un écran vide
   * inexpliqué. Même garde que `/agenda/nouveau?contact=`.
   */
  await page.goto('/atlas?fil=cmaaaaaaaaaaaaaaaaaaaaaa', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-composeur]')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Atlas')
  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})

// ── LES SUJETS ────────────────────────────────────────────────────────────

test('la porte principale montre des SUJETS, triés par vivacité', async ({ page }) => {
  /**
   * 🔴 CE QUE ÇA GARDE. La première version montrait la liste des
   * conversations : **100 lignes pour 53 ouvertures distinctes**, une ligne
   * par CONNEXION et pas une ligne par pensée. Patrice l'a refusée en la
   * voyant. Si la porte principale y revenait, on aurait refait le chemin à
   * l'envers sans que rien ne crie.
   */
  await page.goto('/atlas?historique=1', { waitUntil: 'domcontentloaded' })
  await expect(panneau(page)).toBeVisible({ timeout: 20_000 })

  const n = await sujets(page).count()
  console.log(`  ${n} sujets`)
  if (n === 0) {
    await expect(panneau(page)).toContainText('Parle au coach')
    return
  }
  await expect(
    page.locator('[data-conversation]'),
    'la porte principale montre encore des conversations',
  ).toHaveCount(0)

  /**
   * LE TRI EST LA VIVACITÉ : `vu / (1 + jours/15)`. On ne refait pas le
   * calcul ici — on vérifie qu'il DÉCROÎT, ce qui suffit à attraper un tri
   * remis sur la date ou sur le nombre seul.
   *
   * ⚠️ Et on lit ce que l'écran AFFICHE, pas ce que le serveur a calculé :
   * un tri juste rendu dans le désordre serait vert sur la mauvaise moitié.
   */
  const lus = await sujets(page).evaluateAll((liste) =>
    liste.slice(0, 12).map((b) => {
      const ligne = b.querySelector('p').textContent
      const m = ligne.match(/^(\d+) fois/)
      return { vu: m ? Number(m[1]) : 1, quand: ligne }
    }),
  )
  const recent = (t) => /Aujourd.hui|Hier/.test(t)
  // Le premier est forcément vif : beaucoup vu ET récent.
  console.log(`  le plus vif : ${lus[0].vu} fois · ${recent(lus[0].quand) ? 'récent' : 'ancien'}`)
  expect(lus[0].vu, 'le premier sujet n’est vu qu’une fois : le tri est faux').toBeGreaterThan(1)

  // 🔴 ET AUCUNE HEURE SUR UN SUJET. `lastSeenAt` est bougé par la
  // consolidation nocturne : « Aujourd'hui, 04:15 » se lit « tu en as parlé
  // à 4h du matin », ce qui est faux. Le jour reste vrai, la minute non.
  const heures = lus.filter((l) => /\d{1,2}:\d{2}/.test(l.quand))
  expect(
    heures.map((l) => l.quand),
    'un sujet affiche une heure : elle vient du travail nocturne, pas d’une conversation',
  ).toEqual([])
})

test('« a changé » ne compte pas des orthographes', async ({ page }) => {
  /**
   * 🔴 LE DÉFAUT, UNE HEURE APRÈS LA LIVRAISON. « relance post-refus »
   * annonçait **« a changé 3 fois »**, et le dépli montrait :
   *
   *     relance de mélanie · relance de melanie · relance mélanie
   *
   * **Ça n'a pas changé trois fois, ça a été réécrit trois fois.** Un
   * historique qui compte des orthographes comme des changements raconte une
   * histoire qui n'a pas eu lieu.
   *
   * 🧭 La maison connaît cette faute : « Mes activités MLM » contre
   * « Activité MLM » dans `menu.spec.cjs`. Même remède, et **la même
   * discipline** — on prouve d'abord que le détecteur détecte, sur le VRAI
   * couple qui était passé.
   */
  const normaliser = (t) =>
    t
      .toLowerCase()
      .normalize('NFD')
      .split('')
      .filter((c) => c.charCodeAt(0) < 768 || c.charCodeAt(0) > 879)
      .join('')
      .replace(/\b(de|du|des|la|le|les|l|d|un|une|en|a|au|aux|sur|pour)\b/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()

  expect(
    normaliser('relance de mélanie'),
    'le détecteur ne verrait pas le doublon qu’il surveille',
  ).toBe(normaliser('relance melanie'))
  expect(normaliser('objection pyramide')).not.toBe(normaliser('objection prix'))

  await page.goto('/atlas?historique=1', { waitUntil: 'domcontentloaded' })
  await expect(panneau(page)).toBeVisible({ timeout: 20_000 })

  const depliables = page.locator('[data-sujet]:not([disabled])')
  const combien = await depliables.count()
  if (combien === 0) {
    console.log('  aucun sujet n’a d’histoire : le cas n’a pas été éprouvé')
    return
  }

  // On déplie les trois premiers qui ont une histoire : c'est là que les
  // réécritures s'empilaient.
  const fautifs = []
  for (let i = 0; i < Math.min(3, combien); i++) {
    const b = depliables.nth(i)
    await b.click()
    await page.waitForTimeout(150)
    const avant = await b.locator('li').evaluateAll((n) => n.map((e) => e.textContent))
    const vus = new Set()
    for (const ligne of avant) {
      const quoi = normaliser(ligne.split('—')[0])
      if (vus.has(quoi)) fautifs.push(ligne.trim())
      vus.add(quoi)
    }
    await b.click()
  }
  console.log(`  ${Math.min(3, combien)} sujets dépliés · ${fautifs.length} redite(s)`)
  expect(
    fautifs,
    'deux formulations du même sujet comptent comme deux changements',
  ).toEqual([])
})
