/**
 * DONNER SON ESPACE DE CONVERSATION À UN NOUVEAU DISTRIBUTEUR.
 *
 * Un distributeur Atline = un COMPTE Chatwoot. C'est le modèle natif de
 * Chatwoot, pas un contournement : chaque compte ne voit que ses propres
 * conversations, sans qu'on ait une seule ligne de filtrage à écrire.
 *
 * Ce qu'on crée à l'inscription, dans cet ordre :
 *   1. le compte           — son espace
 *   2. l'utilisateur       — son identité de service (jamais lui, jamais son mot de passe)
 *   3. le rattachement     — administrateur de son propre compte
 *   4. une boîte « API »   — par où NOS canaux poussent les messages
 *   5. le webhook          — pour qu'Orion soit réveillé quand on lui répond
 *
 * Deux principes :
 *
 *   • ON N'INTERROMPT JAMAIS UNE INSCRIPTION. Si Chatwoot est en panne, le
 *     distributeur entre quand même dans Atline : on repassera. Une messagerie
 *     absente est un désagrément, une inscription bloquée est un client perdu.
 *
 *   • C'EST REPRENABLE. Chaque étape vérifie ce qui existe déjà avant de créer.
 *     Relancer la fonction sur un compte à moitié provisionné le termine au
 *     lieu de le dupliquer.
 */

import { db } from '@/lib/db'

const URL_CHATWOOT = process.env.CHATWOOT_URL || 'http://127.0.0.1:3070'
const JETON_PLATEFORME = process.env.CHATWOOT_PLATFORM_TOKEN || ''
/** Chatwoot refuse les IP privées pour ses webhooks (protection anti-SSRF) :
 *  l'URL doit être publique, même quand tout tourne sur la même machine. */
const URL_PUBLIQUE = process.env.APP_PUBLIC_URL || 'https://app.atline.ai'

type Reponse = { ok: boolean; statut: number; corps: unknown }

async function appeler(chemin: string, jeton: string, corps?: unknown, methode = 'POST'): Promise<Reponse> {
  const r = await fetch(`${URL_CHATWOOT}${chemin}`, {
    method: methode,
    headers: { 'Content-Type': 'application/json', api_access_token: jeton },
    body: corps ? JSON.stringify(corps) : undefined,
    signal: AbortSignal.timeout(15000),
  })
  let lu: unknown = null
  try { lu = await r.json() } catch { /* certaines réponses sont vides */ }
  return { ok: r.ok, statut: r.status, corps: lu }
}

export type ResultatProvision = {
  ok: boolean
  accountId?: number
  inboxId?: number
  raison?: string
}

/**
 * @param mlmBusinessId l'activité du distributeur — c'est elle qui porte le lien,
 *                      parce qu'un distributeur peut avoir plusieurs sociétés
 *                      et qu'on ne veut pas mélanger leurs conversations.
 */
export async function provisionnerChatwoot(mlmBusinessId: string): Promise<ResultatProvision> {
  if (!JETON_PLATEFORME) return { ok: false, raison: 'CHATWOOT_PLATFORM_TOKEN absent' }

  const activite = await db.userMlmBusiness.findUnique({
    where: { id: mlmBusinessId },
    select: {
      id: true, userId: true, mlmName: true, chatwootAccountId: true, chatwootInboxId: true,
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  })
  if (!activite) return { ok: false, raison: 'activité introuvable' }

  // Déjà fait ? On ne recrée rien.
  if (activite.chatwootAccountId && activite.chatwootInboxId) {
    return { ok: true, accountId: activite.chatwootAccountId, inboxId: activite.chatwootInboxId }
  }

  try {
    // ── 1. le compte ────────────────────────────────────────────────────
    let accountId = activite.chatwootAccountId ?? undefined
    if (!accountId) {
      const nom = `${activite.user.firstName ?? 'Distributeur'} ${activite.user.lastName ?? ''} · ${activite.mlmName}`.trim()
      const r = await appeler('/platform/api/v1/accounts', JETON_PLATEFORME, { name: nom.slice(0, 100) })
      if (!r.ok) return { ok: false, raison: `compte refusé (${r.statut})` }
      accountId = (r.corps as { id: number }).id
      await db.userMlmBusiness.update({ where: { id: activite.id }, data: { chatwootAccountId: accountId } })
    }

    // ── 2. l'utilisateur de service ─────────────────────────────────────
    // Adresse dérivée, jamais celle du distributeur : ce compte sert à NOTRE
    // pilotage par API, pas à une connexion humaine. Le mot de passe est
    // aléatoire et n'est envoyé à personne.
    const emailService = `atline+${activite.id}@service.atline.ai`
    const motDePasse = `Atl-${crypto.randomUUID()}-2026!`
    let jetonUtilisateur = ''

    const ru = await appeler('/platform/api/v1/users', JETON_PLATEFORME, {
      name: `Atline · ${activite.mlmName}`.slice(0, 60),
      email: emailService,
      password: motDePasse,
    })
    if (ru.ok) {
      const u = ru.corps as { id: number; access_token?: string }
      jetonUtilisateur = u.access_token ?? ''
      await appeler(`/platform/api/v1/accounts/${accountId}/account_users`, JETON_PLATEFORME, {
        user_id: u.id, role: 'administrator',
      })
    } else {
      // L'utilisateur existe déjà (reprise après échec) : on récupère son jeton.
      const rl = await appeler('/platform/api/v1/users', JETON_PLATEFORME, undefined, 'GET')
      const liste = (rl.corps as { id: number; email: string; access_token?: string }[]) ?? []
      jetonUtilisateur = liste.find((x) => x.email === emailService)?.access_token ?? ''
    }
    if (!jetonUtilisateur) return { ok: false, accountId, raison: 'jeton utilisateur introuvable' }

    // ── 3. la boîte par où arrivent les messages ────────────────────────
    let inboxId = activite.chatwootInboxId ?? undefined
    if (!inboxId) {
      const ri = await appeler(`/api/v1/accounts/${accountId}/inboxes`, jetonUtilisateur, {
        name: `Atline · ${activite.mlmName}`.slice(0, 60),
        channel: { type: 'api', webhook_url: '' },
      })
      if (!ri.ok) return { ok: false, accountId, raison: `boîte refusée (${ri.statut})` }
      inboxId = (ri.corps as { id: number }).id
      await db.userMlmBusiness.update({ where: { id: activite.id }, data: { chatwootInboxId: inboxId } })
    }

    // ── 4. l'oreille d'Orion ────────────────────────────────────────────
    await appeler(`/api/v1/accounts/${accountId}/webhooks`, jetonUtilisateur, {
      url: `${URL_PUBLIQUE}/api/internal/chatwoot/webhook`,
      subscriptions: ['message_created'],
    })

    return { ok: true, accountId, inboxId }
  } catch (e) {
    // Principe n°1 : on ne fait jamais échouer une inscription pour ça.
    console.error('[chatwoot] provisionnement impossible', e)
    return { ok: false, raison: e instanceof Error ? e.message : 'erreur inconnue' }
  }
}
