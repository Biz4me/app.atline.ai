# Atline — App Mobile/Desktop (Frontend)

## Projet

Application Next.js pour les distributeurs MLM utilisant Atline AI.
- **Chemin serveur :** `/opt/atline/atline-app`
- **URL production :** `app.atline.ai`
- **Branche git :** main · remote `https://github.com/Biz4me/app.atline.ai.git`

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

## AppShell — structure layout desktop

```
|← DesktopSidebar (fixe gauche) →|← contenu →|← AtlasSidebar (fixe droite) →|
      w-56 (expanded) / w-14 (collapsed)        w-[320px] (open) / w-0 (closed)
```

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
| BottomNav | `components/bottom-nav.tsx` | Nav mobile (icônes sans labels) |
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
