// LA BARRE D'UNE LEÇON SUIT LA LECTURE.
//
// 🔴 Ce que ce test cherche, et qu'aucune assertion de présence ne verrait :
//
//   1. qu'il n'y a JAMAIS deux déclencheurs à la fois — le lecteur accompagne,
//      le bouton avance, ils ne cohabitent pas ;
//   2. que la leçon n'est jamais SANS ISSUE : arrivé au bout, il y a toujours
//      de quoi avancer, avec ou sans enregistrement ;
//   3. que la fin du texte n'est pas recouverte par la barre — un clic à
//      blanc le dit, `toBeVisible` non.

const { test, expect } = require('../fixtures.cjs')

const AVEC_AUDIO = '/parcours/cmqpblqf70002exa1lrhvluhd/cmqpblqgs0004exa19e060i7l'

test.use({ viewport: { width: 390, height: 844 } })

const poser = (page) =>
  page.evaluate(() =>
    document.getAnimations().forEach((a) => {
      try {
        a.finish()
      } catch {}
    }),
  )

test('avec enregistrement : le lecteur accompagne, puis le bouton avance', async ({
  page,
  pageErrors,
}) => {
  await page.goto(AVEC_AUDIO, { waitUntil: 'domcontentloaded' })

  const lecteur = page.getByRole('button', { name: /Écouter la leçon|Mettre en pause/ })
  const avancer = page.getByRole('button', { name: /^(Leçon suivante|Terminer le module)/ })

  // ── En haut : le lecteur, et LUI SEUL ──────────────────────────────────
  await expect(lecteur).toBeVisible({ timeout: 20_000 })
  await expect(avancer).toHaveCount(0)
  await poser(page)
  await page.screenshot({ path: 'capture-lecon-haut.png', animations: 'disabled' })

  // ── Au bout : le bouton, et LUI SEUL ───────────────────────────────────
  await page.locator('[data-fin-de-lecon]').scrollIntoViewIfNeeded()
  await expect(avancer).toBeVisible({ timeout: 10_000 })
  await expect(lecteur).toHaveCount(0)
  await poser(page)
  await page.screenshot({ path: 'capture-lecon-bas.png', animations: 'disabled' })

  // 🔴 La fin du texte doit rester atteignable sous la barre.
  await avancer.click({ trial: true, timeout: 5_000 })

  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})

test('la leçon suivante a son son, et JAMAIS sans issue en bas', async ({
  page,
  pageErrors,
}) => {
  // On avance d'une leçon à la suivante par le geste du bas : c'est le chemin
  // réel, et il vérifie au passage que le geste avance pour de bon.
  //
  // ⚠️ Ce commentaire disait « la suivante, qui n'en a pas » — vrai jusqu'au
  // 9 novembre 2026, faux depuis que les 71 leçons sont enregistrées.
  await page.goto(AVEC_AUDIO, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-fin-de-lecon]').scrollIntoViewIfNeeded()
  const avancer = page.getByRole('button', { name: /^(Leçon suivante|Terminer le module)/ })
  await expect(avancer).toBeVisible({ timeout: 20_000 })
  await avancer.click()
  await expect(page).not.toHaveURL(new RegExp(`${AVEC_AUDIO}$`), { timeout: 20_000 })

  // ── En haut : AUCUNE barre, puisqu'il n'y a rien à y mettre ────────────
  // 🔴 UN SEUL `h1` PAR PAGE. Ce test en a trouvé DEUX sur une leçon —
  // celui de la coquille et celui du texte — en échouant sur une violation du
  // mode strict. Le compte reste vérifié ici : c'est un défaut de plan de
  // document, et rien d'autre ne le regarde.
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 })
  // 🔴 CETTE SONDE ATTENDAIT L'ABSENCE DE BARRE AUDIO, ET SA PRÉMISSE EST
  // MORTE LE 9 NOVEMBRE 2026 : les 71 leçons ont été enregistrées, dans les
  // deux voix. Il n'existe plus une seule leçon sans son.
  //
  // 🧭 On ne SUPPRIME pas le contrôle, on le retourne. L'invariant qui compte
  // n'a jamais été « pas de barre » mais « la barre dit la vérité sur ce qui
  // existe » — et aujourd'hui la vérité, c'est qu'il y a un enregistrement
  // partout. Le jour où une leçon neuve arrivera sans son, c'est CE contrôle
  // qui le dira, au lieu d'un vert silencieux.
  //
  // ⚠️ Laisser l'ancienne assertion aurait été pire que de la retirer : cinq
  // sondes rouges en permanence apprennent à ignorer le rouge.
  await expect(page.getByRole('button', { name: /Écouter la leçon/ })).toHaveCount(1)

  // ── Au bout : de quoi avancer, toujours ────────────────────────────────
  await page.locator('[data-fin-de-lecon]').scrollIntoViewIfNeeded()
  const suite = page.getByRole('button', { name: /^(Leçon suivante|Terminer le module)/ })
  await expect(suite).toBeVisible({ timeout: 10_000 })
  await poser(page)
  await suite.click({ trial: true, timeout: 5_000 })
  await page.screenshot({ path: 'capture-lecon-sans-audio.png', animations: 'disabled' })

  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})
