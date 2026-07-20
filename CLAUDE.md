# Atline — App Mobile/Desktop (Frontend)

## Projet

Application Next.js pour les distributeurs MLM utilisant Atline AI.
- **Chemin serveur :** `/opt/atline/atline-app`
- **URL production :** `app.atline.ai`
- **Branche git :** main · remote `https://github.com/Biz4me/app.atline.ai.git`

---

## Service IA (atline-ai-service)

Microservice FastAPI distinct — **repo git séparé.**

| Info | Valeur |
|------|--------|
| Chemin serveur | `/opt/atline/apps/atline-ai-service` |
| Port | 8100 |
| GitHub | `Biz4me/atline-ai-service` |
| PM2 | `atline-ai-service` |

```bash
# Modifier le service IA
cd /opt/atline/apps/atline-ai-service
# éditer...
git add -A && git commit -m "..." && git push
pm2 restart atline-ai-service --update-env
```

**LLM :** Anthropic direct → fallback automatique OpenRouter si KO.
**Doc complète :** voir `/opt/atline/apps/atline-ai-service/CLAUDE.md`

---

## Stack technique

| Composant | Version |
|-----------|---------|
| Next.js | 16.2.6 (App Router) |
| React | 19.2.4 |
| TypeScript | 5.7.3 |
| Tailwind CSS | v4 |
| Package manager | pnpm |
| Bundler dev | Turbopack |

**Dépendances clés :** `lucide-react`, `shadcn`, `next-themes`, `vaul`, `sonner`, `class-variance-authority`

---

## Déploiement production

**TOUJOURS déployer directement sur Hetzner sans demander.**

```bash
ssh -i $HOME/.ssh/hetzner_atline root@178.105.219.148
cd /opt/atline/atline-app
# éditer les fichiers directement sur le serveur
npm run build
pm2 restart atline-app
```

**Process PM2 :** `atline-app`

---

## Règle critique desktop/mobile

**NE JAMAIS MODIFIER LE MARKUP MOBILE** quand on travaille sur le desktop.

**Pattern obligatoire — deux blocs séparés :**
```tsx
{/* MOBILE ONLY — ne jamais toucher */}
<div className="lg:hidden">
  {/* markup mobile original intact */}
</div>

{/* DESKTOP ONLY — tout nouveau desktop ici */}
<div className="hidden lg:block">
  {/* nouveau markup desktop */}
</div>
```

- `lg:` breakpoint = 1024px
- Ne JAMAIS ajouter des préfixes `lg:` sur les éléments mobiles existants

---

## AppShell — nav UNIFIÉE façon Telegram Web (refonte 12 juil, messagerie + nav unifiée 18 juil 2026)

```
Desktop, PARTOUT : |← colonne Conversations (340px) →|← fil au centre →|  (+ feuille outil par-dessus)
   colonne = components/chats-home.tsx (ChatsHome). Sur /chats /atlas : fournie par le layout ChatsShell.
   Ailleurs : épinglée par AppShell (aside fixed left-0 w-[340px]). Mobile : masquée (chrome mobile propre).
```
- **PLUS de DesktopNav** (supprimé le 18 juil, `desktop-nav.tsx` retiré) : la colonne Conversations EST la nav unique. Les entrées outils (Contacts, Agenda, Formation, Bilan, Profil, Activité, Abonnement, Réglages) vivent dans le **tiroir ☰** de la colonne (`chats-drawer.tsx`).
- **PLUS d'AtlasSidebar (rail droit)** : supprimé. Atlas est une CONVERSATION (le fil /atlas), pas un composeur permanent.
- **Écrans outils = FEUILLES** : routes interceptées `app/(app)/@sheet/(.)route/page.tsx` via la coquille `components/sheet-panel.tsx` (panneau droit desktop, plein écran mobile, la page/fil derrière reste montée, backdrop→retour). Déjà en feuille : contacts (liste + fiche), agenda, formation, home (bilan), compte. URL directe/refresh = vraie page pleine.
- **Fiche contact = panneau embarqué dans le fil (desktop, façon Telegram)** : `ContactDetailPage` (`contacts/[id]/page.tsx`) accepte `contactId`/`embedded`/`onClose`. Dans `chats/[contactId]/page.tsx`, tap sur l'avatar → `openInfo()` : desktop (`matchMedia ≥1024px`) ouvre la fiche en `<aside w-[400px]>` À DROITE (chat reste au centre, croix `X` en haut à gauche), mobile garde la feuille plein écran. Fiche en **onglets** Aperçu/Qualification/Détails (sous-onglets **Profil/Coordonnées/Contexte/Suivi**, nav soulignée). **Contexte = la saisie** (test DISC inline `PersonalityQuiz inline` + marché + situation/intérêts + signaux de potentiel). **Qualification = la lecture** (« Ton angle » calculé couleur+marché+potentiel niveau 2 + « comment l'aborder » ; renvoie vers Contexte si vide) — plus aucun champ éditable. Cartes en **accordéon** (une ouverte à la fois, Prochain pas ouvert par défaut). **Un seul Enregistrer** dans l'en-tête (état `dirty`). 3 actions **Message/Appel/Email** sous le nom (état `sheet`). Voir mémoire `project_atline_contact_flow`.
- **Coquille responsive UNIQUE des fils = `components/fil-shell.tsx` (`FilShell`)** : tout le responsive 3→2→1 vit LÀ, en CSS pur, piloté par le seul booléen `open` (le rail S2). Les 4 fils (contact/aria/nova/atlas) l'utilisent (Atlas importe `RAIL_CLS` + `CENTER_HIDDEN_WHEN_OPEN` car il garde sa hauteur propre). **Paliers (frontière `lg` conservée, 3ᵉ panneau à `xl`)** : `< lg` = 1 panneau (rail en overlay `fixed inset-0`) · `lg→xl` = 2 panneaux (S1 + le rail REMPLACE le centre, `CENTER_HIDDEN_WHEN_OPEN = lg:max-xl:hidden`) · `≥ xl` = 3 panneaux (S1 340 + centre + rail 400). `openInfo` = juste `setInfoOpen(true)` + `?info=1` (plus de `matchMedia`). Centre des fils unifié à `max-w-2xl` (Atlas aussi ; composeur desktop aussi). Toute nouvelle surface « fil + panneau » passe par `FilShell`.
- `(app)/layout.tsx` : `export const dynamic = 'force-dynamic'` (ChatsHome/useSearchParams monté partout → pas de prérendu statique).
- Plus de top bar desktop : le titre vit dans la page, le thème dans le ☰.

### Gabarits de largeur desktop — RÈGLE STRICTE (2 gabarits + 2 exceptions)
| Gabarit | Classe | Pages |
|---|---|---|
| **Colonne de lecture** | `mx-auto w-full max-w-2xl` | fiche contact, profil, activités, réglages, abonnements, notifications, formation (module/leçon/bibliothèque), aria, nova (cockpit/comptes), communauté, débrief |
| **Page large** | `mx-auto w-full max-w-6xl` | tableau de bord, liste contacts, agenda, formation (liste modules, grille 3 col.) |
| *Exception* | `max-w-3xl` | fil de chat Atlas uniquement (largeur de lecture conversationnelle) |
| *Exception* | plein cadre | messages (split liste/fil), quiz formation (plein écran) |

Ne JAMAIS introduire une autre largeur (md/lg/xl/4xl/5xl/7xl en racine de page).

---

## Design system

### Typographie — échelle stricte 6 niveaux

**Mobile :**

| Niveau | Classe Tailwind | px | Usage |
|--------|----------------|-----|-------|
| Display | `text-[32px]` | 32 | H1 pages, titres principaux |
| Heading | `text-2xl` | 24 | KPI, titres forts |
| Title | `text-lg` | 18 | Titres de cartes, sections |
| Body | `text-sm` | 14 | Tout le contenu courant |
| Label/Caption | `text-xs` | 12 | Champs, dates, tags, métadonnées |
| Micro | `text-[10px]` | 10 | Badges/pastilles uniquement |

**Desktop :** identique + Body passe à 15px via media query globals.css (`text-sm` → 15px à ≥1024px)

**Tailles hors hiérarchie (exceptions visuelles) :**
- `text-base` (16px) — avatars lettrés, bouton CTA primaire, valeurs monétaires
- `text-xl` (20px) — emoji, icônes décoratives
- `text-[20px]`, `text-[36px]`, `text-[42px]`, `text-[44px]` — visuels, déco, KPI héros

> Ne JAMAIS réintroduire `text-[11px]`, `text-[13px]`, `text-[15px]`, `text-[22px]`, `text-[28px]`

### Palette de couleurs — règle stricte

**Ces 7 couleurs sont les SEULES autorisées.**

| Agent/Profil | Couleur | Hex |
|---|---|---|
| Atlas | Orange | `#F97316` (= `var(--primary)`) |
| ARIA | Teal | `#14B8A6` |
| Nova | Violet | `#8B5CF6` |
| DISC Rouge | Rouge | `#EF4444` |
| DISC Vert | Vert | `#22C55E` |
| DISC Bleu | Bleu | `#3B82F6` |
| DISC Jaune | Jaune | `#F4B342` |

**Notes d'application (audit 12 juil 2026) :**
- En Tailwind v4, `red/green/blue/violet/teal/orange-500` = exactement nos hex → classes `-500` de ces familles OK. `amber-*` ≠ notre jaune → toujours `#F4B342`. `zinc/gray` → tokens (`muted`, `muted-foreground`).
- **Exception 1 — marques sociales** : WhatsApp `#25D366`, Facebook `#1877F2`, Instagram `#E1306C`, LinkedIn `#0A66C2` autorisés UNIQUEMENT sur les logos/pastilles de ces réseaux.
- **Exception 2 — écran d'appel Aria** : fonds sombres `#0F1012`/`#1A1A1A` autorisés (UI d'appel téléphonique volontairement sombre).

### Autres règles design
- **Focus ring :** supprimé globalement (`outline: none` dans globals.css)
- **Cartes :** `rounded-2xl border border-border bg-surface shadow-card`
- **Titres de carte :** `text-sm font-semibold text-foreground` en header row DANS la carte avec `border-b`
- **Bouton CTA primaire :** `bg-primary rounded-2xl text-base font-semibold text-primary-foreground`

---

## BottomNav mobile — architecture z-index

- Nav bar : `fixed inset-x-0 bottom-0 z-[47]` `h-[60px]` `bg-surface/95 backdrop-blur-md`
- FAB Atlas : `fixed bottom-0 z-[48]` `bottom: calc(11px + env(safe-area-inset-bottom))` `size-[58px]`
- Arc SVG : `absolute top-0 left-0 overflow-visible pointer-events-none` — courbe R=33 sur le FAB avec dôme rempli
- More sheet : `fixed inset-x-0 z-[45]` `bottom: 60px` `duration-300` — slide depuis bottom
- More backdrop : `fixed inset-x-0 top-0 z-[44] bg-black/40` `bottom: 60px`
- Atlas overlay : backdrop `z-[49]` + panel `z-[50]`
- `MORE_ITEMS` : Profil `/profile` + Abonnement `/mon-abonnement`
- AppShell : `pb-[60px]` sur mobile

---

## Business Switcher mobile

- Trigger : avatar seul `size-10`
- Ouvert : row horizontale d'avatars + noms (`text-xs`)
- Animation ouverture : wrapper `fixed` + `clip-path: inset(0 0 0 0)` + inner `translateY(-100%→0)` `duration-300` — glisse depuis header sans le traverser
- Fermeture : `setDropVisible(false)` + `setTimeout 300ms` → démontage
- Backdrop : `createPortal → document.body` `z-[59]` `bg-black/40`, `top: dropTop + offsetHeight`
- Bouton `+` : slide-in pleine page depuis la droite (createPortal → document.body, z-[200])
- Page Nouvelle activité : 3 sections card (Activité / Structure initiale / Base de contacts)
- Date : custom button + `showPicker()` sur input caché
- Scroll page fixé avec `min-h-0` sur `flex-1`

---

## Turbopack — problème apostrophes françaises

Utiliser **double guillemets** pour les strings français avec apostrophes :
```tsx
text: "Pour l'instant, mode demo"   // correct
text: 'Pour l\'instant'              // crash
```

---

## Composants clés

| Composant | Fichier | Rôle |
|-----------|---------|------|
| AppShell | `components/app-shell.tsx` | Layout global |
| DesktopSidebar | `components/desktop-sidebar.tsx` | Nav gauche desktop |
| BusinessSwitcher | `components/business-switcher.tsx` | Switcher MLM mobile + slide-in |
| Card | `components/card.tsx` | Carte de base |

---

## Routes

```
home/ · atlas/ · contacts/ · network/ · messages/ · agenda/
aria/ · nova/ · formation/ · communaute/ · notifications/
profile/ · settings/ · settings/[section]/ · abonnement/ · mon-abonnement/ · toolbox/
```

---

## Settings mobile

- Page principale `/settings` : overlay `z-[60]` `animate-slide-in-right`, header "Paramètres" + bouton "Terminé"
- Sous-pages `/settings/[section]` : overlay `z-[70]` `animate-slide-in-right`, titre centré + ChevronLeft retour
- `animate-slide-in-right` défini dans `globals.css`
- `/mon-abonnement` : résumé abonnement accessible depuis le menu Plus — sans carte plan actuel, sans paiement/historique/résiliation, titre sans flèche retour

---

## Règles de travail

1. Respecter l'échelle typographique 6 niveaux — ne jamais réintroduire des tailles intermédiaires
2. Respecter la palette 7 couleurs
3. Déployer sur Hetzner sans demander
4. Utiliser double guillemets pour les strings français avec apostrophes
5. Pas de `admin.atline.ai` ici — projet distinct
6. **Minimiser le code** — appliquer l'échelle ci-dessous avant d'écrire (inspiré de « Ponytail »)

### Échelle de minimisation (avant d'implémenter)

Comprendre le problème d'abord, puis descendre l'échelle et **s'arrêter au premier barreau qui répond** :

1. **Ça doit exister ?** — sinon, ne rien écrire (supprimer > ajouter).
2. **Déjà dans le code ?** — réutiliser (`components/`, `lib/`, hooks, routes API existantes). Ne pas dupliquer.
3. **Feature native de la plateforme ?** — préférer le natif à une lib :
   - Web : `<input type="date/color/file">`, `<dialog>`, `<details>`, `Intl`, `fetch`, CSS/SMIL pour l'anim, `showPicker()`, `URL`, `structuredClone`.
   - Next : Server Components, `metadata`/`viewport`, `next/font`, `next/image` (ici `unoptimized`).
   - Python/FastAPI : stdlib (`datetime`, `pathlib`, `itertools`), Pydantic déjà là.
4. **Déjà installé ?** — utiliser l'existant avant d'ajouter une dépendance : `lucide-react`, `shadcn`, `next-themes`, `vaul`, `sonner`, `class-variance-authority`, `sharp`. **Ajouter un paquet = dernier recours** (justifier).
5. **Une ligne suffit ?** — l'écrire en une ligne, lisible.
6. **Sinon** — solution minimale qui marche, pas de couche d'abstraction spéculative (YAGNI).

**Jamais sacrifier** pour la brièveté : validation, sécurité, accessibilité, i18n FR, et les conventions maison (échelle typo, 7 couleurs, pattern mobile/desktop deux blocs, alignement sur `AppComposer`). Minimal ≠ malin-illisible : privilégier la clarté.

---

## Module Formation

### Structure des pages
-  — liste des modules, progression globale
-  — leçons du module, barre de progression
-  — leçon (LESSON) ou quiz (QUIZ)

### Quiz player — règles critiques
- Container quiz :  (pas )
- En-tête (progress + question) : 
- Options : 
- Bouton Question suivante : 
- Z-index : quiz , bouton , modales 

### Modales quiz
- **Quiz réussi → X** : modale félicitations + badge module → 
- **Quiz raté → X** : modale Pas encore ! + réviser 24h → 
- **Quiz en cours → X** : modale confirmation abandon
- Détection phase :  (pas  —  est seulement pour les quiz réussis)

### Progression modules
- API  calcule dynamiquement depuis  + 
- Module DONE = toutes les LESSON done + tous les QUIZ passed
- Badge vert sur module card = 
- Badges dans profil : 11 trophées (un par module)

### DEMO_USER_ID
- Valeur :  (UUID réel en base)
- À remplacer par  quand l'auth est branchée
- Fichiers concernés : tous les 

### Fermeture des pages
- Leçon/Quiz → X :  (pas )
- Congrats modal Continuer à apprendre : 
- Fail modal Fermer : 

---

## Module Formation

### Structure des pages
- `/formation` — liste des modules, progression globale
- `/formation/[moduleId]` — leçons du module, barre de progression
- `/formation/[moduleId]/[lessonId]` — leçon (LESSON) ou quiz (QUIZ)

### Quiz player — règles critiques
- Container quiz : `fixed inset-0 z-[60] flex flex-col` (pas `overflow-y-auto`)
- En-tête (progress + question) : `shrink-0`
- Options : `flex-1 overflow-y-auto no-scrollbar pb-[88px]`
- Bouton "Question suivante" : `fixed bottom-0 z-[61]`
- Z-index : quiz z-[60], bouton z-[61], modales z-[70]

### Modales quiz
- **Quiz réussi + X** : modale félicitations + badge module → router.push('/formation')
- **Quiz raté + X** : modale "Pas encore !" + réviser 24h → router.push('/formation/[moduleId]')
- **Quiz en cours + X** : modale confirmation abandon
- Détection phase : `quizProgress.phase === 'result'` (pas `done` — done est seulement pour les quiz réussis)

### Progression modules
- API `/api/formation/modules` calcule dynamiquement depuis UserLessonProgress + UserQuizAttempt
- Module DONE = toutes les LESSON done + tous les QUIZ passed
- Badge vert sur module card = status === 'DONE'
- Badges dans profil : 11 trophées (un par module)

### DEMO_USER_ID
- Valeur : `c7a0c77a-0881-4361-91aa-75cc7076b8aa` (UUID réel en base)
- À remplacer par getServerSession() quand l'auth est branchée
- Fichiers concernés : tous les app/api/formation/*/route.ts

### Fermeture des pages
- Leçon/Quiz X : router.push('/formation/[moduleId]') — jamais router.back()
- Congrats modal "Continuer à apprendre" : router.push('/formation')
- Fail modal "Fermer" : router.push('/formation/[moduleId]')

---

## Prisma — Migrations

**⚠️ Ne jamais utiliser `prisma db push` — uniquement `prisma migrate dev`.**

Baseline effectué le 24 juin 2026 (commit b8c3c23) — la BDD est maintenant gérée par Prisma Migrate.

### Workflow changement de schema

```bash
# 1. Modifier prisma/schema.prisma
# 2. Créer et appliquer la migration
cd /opt/atline/atline-app
DATABASE_URL="$(grep DATABASE_URL .env.local | cut -d= -f2-)" npx prisma migrate dev --name "description_du_changement"
# 3. Commiter le fichier SQL généré
git add prisma/migrations/ prisma/schema.prisma && git commit -m "..." && git push
```

### État actuel
- `prisma/migrations/0001_baseline/` — 84 tables, 59 enums (snapshot initial)
- Dernière migration : `0020_add_contact_atlas_memory` (Contact.atlasMemory + atlasMemoryAt). Prochaine : `0021_...`

---

## Journal — 4 juillet 2026 : Fiche contact + Mémoire par contact + Accueil contact-aware

> Détail complet : `C:\Users\haure\Projets\atline.ai production\Recap_2026-07-04_Fiche_Contact_Memoire.md`

### Modèle contact DOUBLE-TRACK (structurant)
Prospect/Client/Partenaire ne sont PAS un axe exclusif. **2 axes orthogonaux** : (1) Produit = `isClient` binaire ; (2) Opportunité = tunnel `Nouveau→Invitation→Présentation→Suivi→Closing→Démarrage→Formation→Actif→Leader`. Un contact peut être **Client ET en recrutement**. Segment = **label dérivé** (priorité Partenaire > en recrutement > Client > Prospect). Fix PATCH : poser `prospectStage` sur un CLIENT garde son statut client. Liste `/contacts` = 3 déroulants (segment dérivé · marché · stade adaptatif).

### Fiche `/contacts/[id]`
Plein écran (`navHidden` sur `/contacts/`), en-tête statut + croix (pas de flèche retour). Formulaire replié dans « Détails » (Enregistrer contextuel, pas flottant). Curseur unique du tunnel + « Réengager ». Pastilles statut gris (segment retiré, déjà dans le header). Conversions = liens ghost. **Composeur fiche = `components/contact-composer.tsx`, aligné sur `AppComposer`.**

### Mémoire par contact (4 couches ; A/B/C déployées)
Faits (Postgres) + Qualification explicite + **bloc `Contact.atlasMemory` auto-édité (MemGPT-style)** + Mem0 (différé). Endpoint service `POST /api/atlas/contact-memory` (réflexion haiku) réécrit le carnet ; le proxy le régénère après chaque chat contact. Carte « À retenir » éditable. Snapshot contact = `lib/contact-snapshot.ts` (`buildContactSnapshot`). Conversations rattachées via `AtlasConversation.contactId` (hors historique principal).

### Option C — accueil contact-aware (tool-use)
Boucle tool-use **dans le service**, exécution par **callback vers l'app** (endpoint interne `POST /api/internal/contact-lookup`, protégé `INTERNAL_API_SECRET`, `APP_URL` côté service). Outil `get_contact(nom)` → snapshot → réponse. Events SSE `{tool}` (indicateur front) + `{resolved_contacts}` (write-back Phase C sûr, contact confirmé). `use_tools` désactivé si `contact_snapshot` (fiche). 4 repos évalués (hermes/Letta/Mem0/Honcho), aucun adopté.

### Convention
- **Composeur** : toute surface de chat réutilise/aligne sur `components/mobile/app-composer.tsx` (rounded-[26px], textarea auto-grow, text-lg lg:text-sm, SendHorizontal).
- **« Atlas » cité avec parcimonie** dans l'UI (l'app EST Atlas). Score contact = interne (moteur de plan), pas affiché.
