/**
 * DEMANDER À GOOGLE CE QUE CAL NE NOUS DIT PAS.
 *
 * ── LE PROBLÈME, MESURÉ LE 4 NOVEMBRE 2026 ────────────────────────────────
 *
 * Le webhook de Cal ne transporte PAS le lien de visioconférence. Son champ
 * `location` vaut `integrations:google:meet` — le type brut, pas une URL — et
 * `metadata` arrive vide. Le lien n'existe qu'après que Google a fabriqué la
 * salle, et Cal l'écrit ensuite dans la réservation par un second appel.
 *
 * Ce second appel peut échouer. Il a échoué : Google a répondu
 * `403 Rate Limit Exceeded`, Cal a classé l'intégration en échec, et notre
 * courrier a annoncé « On se retrouve ici : integrations:google:meet » à un
 * prospect.
 *
 * ── LE REMÈDE ─────────────────────────────────────────────────────────────
 *
 * On ne dépend plus de ce que Cal a réussi à écrire : on demande l'événement
 * à Google directement. C'est possible parce que Cal pose lui-même
 * `iCalUID = <uid de la réservation>@Cal.diy`, et que ce `uid` est dans le
 * webhook. Une seule requête, et la salle est dedans.
 *
 * ⚠️ Il y a une course : l'événement naît avant que sa salle n'existe
 * (mesuré : événement à 17:26:00, salle à 17:26:02). D'où quelques essais
 * espacés plutôt qu'un seul. Et si on ne trouve rien, on rend `null` — jamais
 * une valeur technique, qui finirait sous les yeux du prospect.
 */

import { connexionDe, jetonFrais, journaliser as tracerAcces } from '@/lib/google/connexion'

const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

/** Au total un peu moins de cinq secondes, ce qui tient dans un webhook. */
const ESSAIS = [0, 1500, 2500]

type Trouvaille = { visio: string | null; lieu: string | null }

/**
 * Retrouve l'événement par l'identifiant iCal que Cal lui a donné, et en
 * extrait de quoi écrire une phrase lisible.
 *
 * Rend toujours quelque chose d'affichable ou `null`. Jamais de
 * `integrations:…`.
 */
export async function lieuDepuisGoogle(args: {
  userId: string
  uidReservation: string
}): Promise<Trouvaille> {
  const vide: Trouvaille = { visio: null, lieu: null }

  const conn = await connexionDe(args.userId)
  if (!conn?.email || !(conn.scope ?? '').includes('calendar')) return vide

  const jeton = await jetonFrais(args.userId)
  if (!jeton) return vide

  const cible = `${args.uidReservation}@Cal.diy`
  const url = `${API}?iCalUID=${encodeURIComponent(cible)}&maxResults=1&fields=items(hangoutLink,location,conferenceData(entryPoints(uri,entryPointType)))`

  for (const attente of ESSAIS) {
    if (attente) await new Promise((r) => setTimeout(r, attente))
    try {
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${jeton}` },
        signal: AbortSignal.timeout(10_000),
      })
      if (!r.ok) {
        // Un 403 de quota est exactement ce qui a produit la panne d'origine :
        // on le NOMME au journal plutôt que de rendre un silence.
        await tracerAcces({
          userId: args.userId,
          action: 'ERREUR',
          adresse: conn.email,
          detail: `lecture de l'événement ${cible} refusée par Google (${r.status})`,
        })
        return vide
      }
      const d = (await r.json()) as {
        items?: {
          hangoutLink?: string
          location?: string
          conferenceData?: { entryPoints?: { uri?: string; entryPointType?: string }[] }
        }[]
      }
      const e = d.items?.[0]
      if (!e) continue

      const video = e.conferenceData?.entryPoints?.find((p) => p.entryPointType === 'video')?.uri
      const visio = e.hangoutLink ?? (typeof video === 'string' ? video : null)
      if (visio) return { visio, lieu: null }

      // Pas de salle : l'événement porte peut-être une adresse ou un
      // téléphone. On ne garde que ce qui se lit.
      const l = e.location
      if (l && !l.startsWith('integrations:') && !/^https?:\/\//.test(l)) {
        return { visio: null, lieu: l }
      }
      if (l && /^https?:\/\//.test(l)) return { visio: l, lieu: null }
    } catch {
      // On réessaie : une seconde chance coûte moins cher qu'un courrier muet.
    }
  }

  await tracerAcces({
    userId: args.userId,
    action: 'ERREUR',
    adresse: conn.email,
    detail: `aucun lieu trouvé pour ${cible} après ${ESSAIS.length} essais`,
  })
  return vide
}

/**
 * Nettoie ce que Cal nous a donné comme lieu.
 *
 * 🔴 `integrations:google:meet` ne doit JAMAIS arriver sous les yeux d'un
 * prospect. Mieux vaut ne rien dire du lieu que dire une référence technique.
 */
export function lieuLisible(brut: string | undefined | null): string | null {
  if (!brut) return null
  if (brut.startsWith('integrations:')) return null
  if (/^https?:\/\//.test(brut)) return brut
  return brut.trim() || null
}
