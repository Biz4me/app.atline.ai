// LES ONZE COUVERTURES DE MODULE — et surtout : est-ce qu'elles ARRIVENT ?
//
//   E2E_BASE=https://v2.atline.ai npx playwright test tests/objets-modules.spec.cjs
//
// ── 🔴 ELLE A CHANGÉ DE PRISE DEUX FOIS, ET LA DEUXIÈME L'AVAIT TUÉE ───────
//
// L'objet d'un module fut d'abord une vignette `<img data-objet-module>` de
// 112 px, puis le DÉCOR plein écran de la page (`[data-decor-objet]`, un fond
// CSS à 18 %), puis — depuis le 19 novembre 2026 — la COUVERTURE du module,
// une vraie image de 440 × 587 qu'on voit sur trois écrans.
//
// 🔴 CETTE SONDE EN ÉTAIT RESTÉE AU DÉCOR. Elle cherchait `[data-decor-objet]`,
// qui n'existe nulle part : elle échouait tous les jours sur un écran correct.
// Et ses deux autres tests vérifiaient l'ABSENCE de ce même décor, donc ils
// passaient au vert sans rien éprouver — deux contrôles qui ne pouvaient plus
// échouer, dans un fichier qui, lui, ne pouvait plus réussir.
//
// ── 🧭 CE QU'ELLE PROUVE N'A JAMAIS CHANGÉ ────────────────────────────────
//
// **Qu'une image arrive pour de bon.** C'est la seule chose qu'un contrôle de
// présence ne dit pas : un 404 sur une couverture ne fait ni erreur console,
// ni icône cassée quand elle est posée en fond, et un `<img>` vide se voit à
// peine sur une scène sombre. On charge donc chaque fichier et on regarde ses
// pixels.
//
// 🔴 ET IL Y A DEUX FICHIERS PAR MODULE, PAS UN. La grande couverture
// (`mNN.v3.webp`) et sa réduction (`mNN.v3.min.webp`), que portent l'étagère
// ET la pochette du lecteur en arrière-plan. La seconde n'était surveillée par
// personne : un 404 dessus aurait laissé une pastille muette avec un carré
// vide, sur tous les écrans de l'app, sans un mot.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** Charger une image pour de bon, et dire ce qu'elle pèse vraiment. */
const charger = (page, urls) =>
  page.evaluate(
    (urls) =>
      Promise.all(
        urls.map(
          (u) =>
            new Promise((r) => {
              const img = new Image()
              img.onload = () => r({ u, ok: true, l: img.naturalWidth, h: img.naturalHeight })
              img.onerror = () => r({ u, ok: false, l: 0, h: 0 })
              img.src = u
            }),
        ),
      ),
    urls,
  )

test('chacun des onze modules porte SA couverture, et l’image arrive vraiment', async ({
  page,
  pageErrors,
}) => {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('a[data-module]').first()).toBeVisible({ timeout: 20_000 })

  /**
   * 🔴 `a[data-module]` ET PAS `main a[href^="/parcours/"]`. L'ancienne prise
   * ramassait aussi le lien « reprendre », qui mène lui aussi à un module :
   * douze adresses pour onze modules, et un `toHaveLength(11)` qui échouait
   * en annonçant « la liste ne donne pas onze modules » — ce qui était faux,
   * elle les donnait tous, plus un.
   */
  const cartes = await page.locator('a[data-module]').evaluateAll((n) =>
    n.map((e) => ({
      numero: Number(e.getAttribute('data-module')),
      href: e.getAttribute('href'),
      src: e.querySelector('img')?.getAttribute('src') ?? null,
      titre: e.querySelector('[data-titre-couverture]')?.textContent.trim() ?? null,
    })),
  )
  console.log(JSON.stringify(cartes.map((c) => c.src), null, 0))

  const griefs = []
  // 🔴 CE QU'ON ATTEND, DÉCLARÉ. Sans ce compte, une liste vide ferait une
  // boucle qui ne tourne pas et un test vert qui n'a rien regardé.
  if (cartes.length !== 11) griefs.push(`l’étagère donne ${cartes.length} modules au lieu de 11`)

  const vues = new Set()
  for (const c of cartes) {
    if (!c.src) {
      griefs.push(`module ${c.numero} : aucune image sur sa carte`)
      continue
    }
    if (!c.titre) griefs.push(`module ${c.numero} : sa couverture ne porte pas de titre`)
    // ⚠️ Le fichier doit porter le numéro du module : une couverture juste,
    // servie au mauvais module, passerait tous les autres contrôles.
    const attendu = `/modules/m${String(c.numero).padStart(2, '0')}.`
    if (!c.src.includes(attendu)) griefs.push(`module ${c.numero} sert ${c.src}`)
    if (vues.has(c.src)) griefs.push(`${c.src} servi deux fois`)
    vues.add(c.src)
  }

  /**
   * ── Les deux fichiers de chaque module, chargés pour de bon ──────────────
   *
   * ⚠️ On dérive la grande depuis la réduite plutôt que de lire la page du
   * module onze fois : c'est la même règle de nommage, et onze allers-retours
   * de plus ne prouveraient rien de neuf.
   */
  const fichiers = [...vues].flatMap((s) => [s, s.replace('.min.webp', '.webp')])
  const charges = await charger(page, [...new Set(fichiers)])
  for (const f of charges) {
    if (!f.ok) griefs.push(`${f.u} n’a pas chargé (404 ?)`)
    else if (f.l < 100) griefs.push(`${f.u} ne fait que ${f.l} px de large`)
  }
  console.log(
    charges.map((f) => `${f.u.replace(/^.*\/modules\//, '')} ${f.ok ? f.l + '×' + f.h : 'ABSENTE'}`).join(' · '),
  )

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toHaveLength(0)
})

/**
 * ── 🔴 UNE LEÇON N'A PAS DE COUVERTURE ─────────────────────────────────────
 *
 * Tranché avec Patrice avant d'écrire une ligne : une leçon est un texte qu'on
 * lit longtemps, et une image derrière un long texte se paie en fatigue, pas
 * en caractère. Sans ce contrôle, la décision ne vit que dans un commentaire.
 *
 * ⚠️ CE TEST A REMPLACÉ DEUX CONTRÔLES QUI NE POUVAIENT PLUS ÉCHOUER : ils
 * vérifiaient l'absence de `[data-decor-objet]` et de `[data-objet-module]`,
 * deux attributs qui n'existent plus nulle part. Vérifier qu'une chose
 * supprimée est absente, c'est se payer un vert gratuit.
 */
test('la liseuse d’une leçon ne porte aucune couverture', async ({ page }) => {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const href = await page.locator('a[data-module="2"]').getAttribute('href')
  await page.goto(href, { waitUntil: 'domcontentloaded' })
  const lecon = page.locator('ol li a[data-lecon]').first()
  await expect(lecon).toBeVisible({ timeout: 20_000 })
  await lecon.click()
  await expect(page.locator('[data-rang]')).toBeVisible({ timeout: 20_000 })

  const images = await page.evaluate(() =>
    [...document.querySelectorAll('img')]
      .filter((e) => /\/modules\/m\d/.test(e.getAttribute('src') || ''))
      .map((e) => ({
        src: e.getAttribute('src'),
        large: Math.round(e.getBoundingClientRect().width),
        pastille: !!e.closest('[data-pastille-ecoute]'),
      })),
  )
  console.log(JSON.stringify(images))

  /**
   * ⚠️ LA POCHETTE DE LA PASTILLE EST UNE EXCEPTION DÉCLARÉE. Si une leçon
   * joue pendant que la sonde passe, le lecteur en arrière-plan est là avec
   * sa couverture de 42 px — et c'est voulu. L'écarter en silence serait
   * rouvrir la porte à un vrai décor ; l'écarter en le NOMMANT la referme.
   */
  const decors = images.filter((i) => !i.pastille)
  expect(decors, `la liseuse porte ${decors.length} couverture(s) : ${JSON.stringify(decors)}`).toEqual([])
})
