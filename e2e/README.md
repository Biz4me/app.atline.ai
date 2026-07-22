# Harnais E2E — fiche contact (Playwright)

Vérifie en **vrai navigateur** (Chrome système) des comportements **client** de la fiche contact que le build / typecheck / HTTP 200 ne prouvent pas :
- **sécurité des données** — aucune perte au reload d'une action immédiate ni au départ de la fiche (keepalive) ;
- **lecture Qualification** — « Son contexte » relit bien la saisie du Contexte ;
- **aucune exception JS non capturée** pendant le parcours (`pageerror` = régression client).

Aucun mot de passe : la session est **forgée côté serveur** (qui détient `NEXTAUTH_SECRET`), sur un **contact jetable** créé puis supprimé — aucune vraie donnée touchée.

## Lancer

```bash
cd e2e
npm install          # installe @playwright/test — AUCUN navigateur téléchargé (on pilote le Chrome système)
npm test             # = playwright test
npm run report       # ouvre le rapport HTML (traces/screenshots à l'échec)
```

Sortie attendue : `1 passed`. À l'échec : trace + screenshot dans `playwright-report/` (`npm run report`).

> `channel: 'chrome'` (dans `playwright.config.cjs`) utilise le Google Chrome déjà installé — donc **pas de `npx playwright install`**. Si Chrome n'est pas trouvé, l'installer, ou pointer `E2E_BASE` et lancer depuis une machine qui a Chrome.

## Comment ça marche

- **`server-helper.cjs`** tourne **sur le serveur** (appelé en SSH par les fixtures) : lit `.env.local`, forge le token de session, crée / reset / supprime le contact jetable (Prisma). Déployé avec l'app (committé).
- **`fixtures.cjs`** (local) : fixture `seed` (SSH `create` → `{cid, token}`, `delete` au teardown), surcharge du `context` Playwright pour injecter le cookie `__Secure-next-auth.session-token`, et `pageErrors` (collecte les exceptions JS). `execFile('ssh', …)` → zéro souci de quoting Windows/bash.
- **`tests/*.spec.cjs`** : les scénarios, en locators `getByTestId` + assertions auto-retry (plus de `sleep()` fixes).

## Réglages (variables d'env, toutes optionnelles)

`E2E_BASE` (défaut `https://app.atline.ai`) · `E2E_SSH_KEY` (défaut `~/.ssh/hetzner_atline`) · `E2E_SSH_HOST` (défaut `root@178.105.219.148`) · `E2E_APP_DIR` (défaut `/opt/atline/atline-app`).

## Sélecteurs stables (`data-testid` posés dans la fiche)

`tab-{apercu|qualif|details}` · `subtab-{profil|coord|contexte|suivi}` · `ctx-situation` · `qualif-son-contexte` · `stage-{ÉTAPE}` · `save-btn`.

## Ajouter un test

Créer `tests/mon-cas.spec.cjs`, importer `{ test, expect }` de `../fixtures.cjs`, et utiliser les fixtures `page` (déjà authentifiée), `seed` (`{cid, token}`), `pageErrors`. Le contact jetable est recréé/supprimé pour chaque test.

## Legacy

`fiche-contact.cjs` (puppeteer-core, prouvé 7/7 le 20 juil) reste disponible via `npm run test:legacy`. Le harnais Playwright le remplace ; à retirer une fois la confiance établie.
