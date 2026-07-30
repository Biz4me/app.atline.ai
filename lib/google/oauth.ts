/**
 * DEMANDER À GOOGLE — le moins possible, et en le disant clairement.
 *
 * Un distributeur accorde des permissions à Atline en plusieurs fois : son
 * agenda aujourd'hui, sa boîte mail demain. Google les cumule sur le même
 * compte (include_granted_scopes), donc on ne demande jamais tout d'un coup :
 * on demande ce dont on a besoin, au moment où on en a besoin, et le
 * distributeur voit une demande qu'il peut relier à ce qu'il vient de cliquer.
 *
 * ── DEUX CHOIX QUI SE VOIENT DANS L'URL ────────────────────────────────────
 *
 * `prompt=select_account consent`
 *   • select_account : le sélecteur de compte s'affiche TOUJOURS. Sans ça,
 *     Google réutilise silencieusement la dernière session du navigateur, et
 *     quelqu'un qui a trois comptes Google ouverts connecte le mauvais sans
 *     s'en rendre compte. Comme c'est cette adresse que ses prospects
 *     verront, se tromper est coûteux et invisible.
 *   • consent : garantit un refresh_token. Google ne le renvoie qu'à la
 *     première autorisation ; sans ce paramètre, une reconnexion donne un
 *     accès qui meurt à la première expiration.
 *
 * PAS de `login_hint`. On pourrait pré-remplir avec l'e-mail du compte
 * Atline, mais ce serait pousser vers un choix qui n'est pas forcément le bon :
 * s'inscrire avec son adresse perso et écrire depuis son adresse pro est un
 * cas parfaitement légitime. On laisse choisir.
 *
 * ── CE QUE COÛTE CHAQUE PERMISSION ─────────────────────────────────────────
 *
 * Google classe les scopes en trois niveaux, et le niveau décide de la
 * procédure de vérification (constaté sur la page officielle des scopes Gmail,
 * le 30 juillet 2026) :
 *
 *   • gmail.send                    → SENSIBLE  : vérification, pas d'audit
 *   • gmail.readonly / modify /
 *     metadata, et mail.google.com  → RESTREINT : audit de sécurité CASA,
 *                                     plusieurs semaines, réévalué chaque année
 *
 * Autrement dit : ENVOYER est peu coûteux, LIRE l'est beaucoup. Et il n'existe
 * AUCUN scope qui limiterait la lecture aux seuls fils qu'on a ouverts —
 * vérifié, ça n'existe pas. Le périmètre de lecture est donc borné par NOTRE
 * code (lib/gmail, phase 4) et par rien d'autre : c'est une promesse qu'on
 * tient, pas une contrainte que Google nous impose. Il faut le dire tel quel
 * à l'auditeur, et le rendre vrai dans le code.
 */

export type Capacite = 'agenda' | 'email'

/** Toujours demandés : `email` est ce qui nous donne l'adresse d'envoi. */
const SOCLE = ['openid', 'email']

export const CAPACITES: Record<
  Capacite,
  { scopes: string[]; libelle: string; pourquoi: string; niveau: 'sensible' | 'restreint' }
> = {
  agenda: {
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    libelle: 'ton agenda',
    pourquoi: 'lire tes disponibilités pour proposer des créneaux justes',
    niveau: 'sensible',
  },
  email: {
    scopes: [
      'https://www.googleapis.com/auth/gmail.send',
      // Nécessaire pour lire les réponses des prospects. Il n'existe pas de
      // scope plus étroit : le bornage est le nôtre, pas celui de Google.
      'https://www.googleapis.com/auth/gmail.readonly',
    ],
    libelle: 'ta boîte mail',
    pourquoi: 'écrire à tes prospects en ton nom et lire leurs réponses pour y répondre',
    niveau: 'restreint',
  },
}

export function estCapacite(v: unknown): v is Capacite {
  return v === 'agenda' || v === 'email'
}

function base() {
  return process.env.NEXTAUTH_URL || 'https://app.atline.ai'
}

/**
 * L'URL de retour. Elle reste `/api/calendar/callback` alors qu'elle sert
 * désormais aussi à Gmail : cette chaîne exacte est déclarée dans la Google
 * Cloud Console, et en changer casserait la connexion tant que la nouvelle
 * n'y est pas ajoutée. À renommer le jour où on touchera la Console.
 */
export function redirectUri() {
  return `${base()}/api/calendar/callback`
}

export function scopesPour(capacites: Capacite[]): string[] {
  const tous = new Set(SOCLE)
  for (const c of capacites) CAPACITES[c].scopes.forEach((s) => tous.add(s))
  return [...tous]
}

export function urlConsentement(state: string, capacites: Capacite[]): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: scopesPour(capacites).join(' '),
    access_type: 'offline',
    prompt: 'select_account consent',
    include_granted_scopes: 'true',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`
}

export async function echangerCode(code: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error('token exchange failed')
  return res.json() as Promise<{
    access_token: string
    refresh_token?: string
    expires_in: number
    scope?: string
  }>
}

/**
 * L'adresse du compte que le distributeur vient de choisir. C'est la SEULE
 * source valable de l'adresse d'envoi : ni User.email, ni ce qu'on croit
 * savoir, ni ce qu'il a tapé quelque part.
 */
export async function adresseDuCompte(accessToken: string): Promise<string | null> {
  try {
    const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!r.ok) return null
    return ((await r.json()) as { email?: string })?.email ?? null
  } catch {
    return null
  }
}

/** Les capacités réellement couvertes par les permissions accordées. */
export function capacitesCouvertes(scopeAccorde: string | null | undefined): Capacite[] {
  const accordes = new Set((scopeAccorde ?? '').split(' ').filter(Boolean))
  return (Object.keys(CAPACITES) as Capacite[]).filter((c) =>
    CAPACITES[c].scopes.every((s) => accordes.has(s)),
  )
}
