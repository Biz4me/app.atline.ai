# Harnais E2E — fiche contact

Vérifie en **vrai navigateur** (Chrome système, via puppeteer-core) des comportements **client** de la fiche contact que le build / typecheck / HTTP 200 ne prouvent pas : la **sécurité des données** (aucune perte au reload d'une action immédiate ni au départ de la fiche) et la **lecture Qualification** (« Son contexte »).

Aucun mot de passe : la session est **forgée côté serveur** (qui détient `NEXTAUTH_SECRET`), sur un **contact jetable** créé puis supprimé — aucune vraie donnée touchée.

## Lancer

```bash
cd e2e
npm install     # installe puppeteer-core (pilote le Chrome déjà installé, aucun navigateur téléchargé)
npm test        # = node fiche-contact.cjs
```

Sortie attendue : 7 lignes `PASS` puis `✅ TOUT PASSE` (code de sortie 0 ; `1` si un check échoue).

## Comment ça marche

- **`server-helper.cjs`** tourne **sur le serveur** (appelé en SSH) : lit `.env.local`, forge le token de session, crée / reset / supprime le contact jetable (Prisma). Déployé avec l'app (committé).
- **`fiche-contact.cjs`** tourne **en local** : SSH → `create`, lance Chrome headless avec le cookie de session, pilote la fiche via `data-testid`, assert, puis SSH → `delete`. `execFile('ssh', …)` → zéro souci de quoting Windows/bash.

## Réglages (variables d'env, toutes optionnelles)

`E2E_BASE` (défaut `https://app.atline.ai`) · `E2E_SSH_KEY` (défaut `~/.ssh/hetzner_atline`) · `E2E_SSH_HOST` (défaut `root@178.105.219.148`) · `E2E_APP_DIR` (défaut `/opt/atline/atline-app`) · `E2E_CHROME` (défaut chemin Chrome Windows).

## Sélecteurs stables (`data-testid` posés dans la fiche)

`tab-{apercu|qualif|details}` · `subtab-{profil|coord|contexte|suivi}` · `ctx-situation` · `qualif-son-contexte` · `stage-{ÉTAPE}` · `save-btn`.

> `puppeteer-core` est isolé ici (son propre `package.json`) : il n'est **pas** une dépendance de l'app et n'alourdit pas le build serveur.
