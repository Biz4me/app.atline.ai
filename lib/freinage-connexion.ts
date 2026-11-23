import { db } from '@/lib/db'

/**
 * LE FREIN CONTRE LES TENTATIVES DE CONNEXION EN RAFALE.
 *
 * ── 🔴 POURQUOI MAINTENANT (23 novembre 2026) ─────────────────────────────
 *
 * `User.username` est devenu un **code d'affiliation partagé publiquement**
 * (lien `/r/{username}`, et depuis aujourd'hui `?ref={username}` dans les
 * leçons partagées). Or le même `username` **sert à se connecter**
 * (`lib/auth.ts` accepte e-mail OU identifiant). Mesuré le 23 novembre :
 * **rien ne freinait** une tentative — ni le code, ni la base, ni nginx, et
 * fail2ban ne garde que SSH. Un attaquant qui ramasse un identifiant partagé
 * pouvait essayer des mots de passe autant qu'il voulait.
 *
 * ── 🧭 CE QU'IL FREINE, ET CE QU'IL NE FREINE PAS ─────────────────────────
 *
 * Il compte les échecs **par compte**, pas par IP. C'est le bon ennemi ici :
 * la menace, c'est un compte NOMMÉ qu'on mitraille, et un attaquant change
 * d'IP plus facilement que la cible ne change de nom. Un frein par IP (nginx,
 * fail2ban) ne verrait rien d'une attaque répartie sur mille IP contre un
 * seul compte.
 *
 * 🔴 UN COMPTE QUI N'EXISTE PAS N'EST JAMAIS COMPTÉ — et c'est double bon.
 * D'abord parce qu'il n'a pas de ligne où écrire : mitrailler des identifiants
 * au hasard ne coûte donc AUCUNE écriture. Ensuite parce que le verrou ne
 * révèle jamais l'existence d'un compte qu'on n'a pas déjà mis en échec.
 *
 * ── ⚠️ LA RANÇON ASSUMÉE : ON PEUT VERROUILLER LE COMPTE D'UN AUTRE ────────
 *
 * Mitrailler cinq fois le compte de quelqu'un le verrouille — c'est un déni
 * de service de compte, inhérent à tout frein par compte. On l'accepte parce
 * que le plafond est **court** (15 min) et se **soigne tout seul** : le verrou
 * expire, et la première bonne connexion remet le compteur à zéro. Le remède
 * plus lourd (captcha, frein combiné IP+compte) coûte plus que ce moment ne
 * vaut. Si l'abus se présente, c'est là qu'on montera d'un cran.
 */

/** Les cinq premières tentatives passent sans délai : une faute de frappe,
 *  même répétée, ne doit pas enfermer quelqu'un de légitime. */
const SEUIL_SANS_DELAI = 5

/** Le verrou ne dépasse jamais ça : c'est ce qui borne le déni de service. */
const PLAFOND_MS = 15 * 60 * 1000

/**
 * La durée du verrou pour un nombre d'échecs donné. Elle DOUBLE à chaque
 * échec au-delà du seuil — 1, 2, 4, 8 min — puis bute sur le plafond. Un
 * robot ralentit de plus en plus ; un humain qui se trompe cinq fois attend
 * une minute, pas un quart d'heure.
 */
export function dureeVerrouMs(nbEchecs: number): number {
  if (nbEchecs < SEUIL_SANS_DELAI) return 0
  const minutes = 2 ** (nbEchecs - SEUIL_SANS_DELAI) // 1, 2, 4, 8, 16…
  return Math.min(minutes * 60 * 1000, PLAFOND_MS)
}

/** Secondes restantes avant déblocage, ou 0 si la porte est ouverte. */
export function secondesAvantDeblocage(lockedUntil: Date | null): number {
  if (!lockedUntil) return 0
  const reste = lockedUntil.getTime() - Date.now()
  return reste > 0 ? Math.ceil(reste / 1000) : 0
}

/**
 * Un échec de plus. L'incrément est **atomique** (`increment`), donc deux
 * tentatives simultanées ne peuvent pas lire le même compteur et l'écraser.
 * On calcule le verrou sur la valeur que la base vient de renvoyer, jamais
 * sur celle qu'on croyait avoir.
 */
export async function noterEchec(userId: string): Promise<void> {
  const apres = await db.user.update({
    where: { id: userId },
    data: { failedLoginCount: { increment: 1 } },
    select: { failedLoginCount: true },
  })
  const ms = dureeVerrouMs(apres.failedLoginCount)
  if (ms > 0) {
    await db.user.update({
      where: { id: userId },
      data: { lockedUntil: new Date(Date.now() + ms) },
    })
  }
}

/**
 * Connexion réussie : on efface l'ardoise. `avaitUnePenalite` évite une
 * écriture à CHAQUE connexion propre — l'immense majorité — pour n'écrire que
 * quand il y a vraiment quelque chose à remettre à zéro.
 */
export async function noterSucces(userId: string, avaitUnePenalite: boolean): Promise<void> {
  if (!avaitUnePenalite) return
  await db.user.update({
    where: { id: userId },
    data: { failedLoginCount: 0, lockedUntil: null },
  })
}
