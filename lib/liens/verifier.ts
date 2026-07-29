/**
 * VÉRIFIER LES DEUX LIENS QUI PORTENT L'ARGENT.
 *
 * Le lien de parrainage et le lien boutique ne sont pas des données parmi
 * d'autres : ce sont les seules dont une erreur coûte de l'argent au
 * distributeur. Un parrainage erroné, et son filleul s'inscrit sous
 * quelqu'un d'autre — définitivement.
 *
 * D'où le principe : **on ne fait pas confiance à un lien qu'on n'a pas
 * essayé**. Un lien périmé est pire qu'un lien absent, parce qu'il donne
 * l'illusion de fonctionner.
 *
 * Ce qu'on vérifie, sans jamais bloquer :
 *   • le lien répond-il ?
 *   • redirige-t-il ailleurs — vers une page d'accueil générique, par exemple,
 *     ce qui arrive quand un code de parrainage n'existe plus ?
 *   • contient-il encore l'identifiant du distributeur ?
 *
 * On ne juge JAMAIS le contenu de la page : ce sont des sites qu'on ne
 * contrôle pas, ils changent, et un faux négatif ferait douter le
 * distributeur d'un lien parfaitement valide.
 */

import { db } from '@/lib/db'

export type Verdict = {
  statut: 'OK' | 'INJOIGNABLE' | 'REDIRIGE' | 'SANS_IDENTIFIANT' | 'INVALIDE'
  detail: string
}

/** Forme minimale : une URL http(s) analysable. */
function formeValide(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * @param identifiant ce qui doit rester dans le lien après redirection —
 *                    le code du distributeur, son nom d'utilisateur…
 */
export async function verifierLien(url: string, identifiant?: string): Promise<Verdict> {
  const propre = (url || '').trim()
  if (!propre) return { statut: 'INVALIDE', detail: 'lien vide' }
  if (!formeValide(propre)) return { statut: 'INVALIDE', detail: 'ce n’est pas une adresse web valide' }

  let reponse: Response
  try {
    // GET plutôt que HEAD : beaucoup de sites MLM répondent mal au HEAD.
    reponse = await fetch(propre, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AtlineLinkCheck/1.0)' },
      signal: AbortSignal.timeout(12000),
    })
  } catch {
    return { statut: 'INJOIGNABLE', detail: 'le site n’a pas répondu (délai dépassé ou adresse introuvable)' }
  }

  if (reponse.status >= 400) {
    return { statut: 'INJOIGNABLE', detail: `le site répond ${reponse.status}` }
  }

  const finale = reponse.url || propre

  // L'identifiant a-t-il survécu au voyage ? C'est LE test qui compte :
  // une redirection vers l'accueil signale un code qui n'existe plus.
  if (identifiant && identifiant.length >= 3) {
    const cherche = identifiant.toLowerCase()
    if (!finale.toLowerCase().includes(cherche)) {
      // Certaines sociétés posent un cookie et nettoient l'URL : ce n'est pas
      // forcément une erreur, donc on signale sans condamner.
      return {
        statut: 'SANS_IDENTIFIANT',
        detail: `ton identifiant « ${identifiant} » n’apparaît plus dans l’adresse finale (${finale.slice(0, 80)}). Vérifie que le lien crédite bien ton compte.`,
      }
    }
  }

  try {
    const depart = new URL(propre)
    const arrivee = new URL(finale)
    if (depart.hostname !== arrivee.hostname) {
      return { statut: 'REDIRIGE', detail: `le lien mène finalement sur ${arrivee.hostname}` }
    }
  } catch { /* on a déjà l'essentiel */ }

  return { statut: 'OK', detail: 'le lien répond et te crédite' }
}

/** Vérifie un lien enregistré et garde la trace du verdict. */
export async function verifierEtEnregistrer(toolboxLinkId: string): Promise<Verdict> {
  const lien = await db.toolboxLink.findUnique({
    where: { id: toolboxLinkId },
    select: { url: true, linkType: true, user: { select: { username: true } } },
  })
  if (!lien?.url) return { statut: 'INVALIDE', detail: 'aucun lien enregistré' }

  // Pour le parrainage, l'identifiant attendu est celui du distributeur.
  const identifiant = lien.linkType === 'PARRAINAGE' ? (lien.user?.username ?? undefined) : undefined
  const verdict = await verifierLien(lien.url, identifiant)

  await db.toolboxLink.update({
    where: { id: toolboxLinkId },
    data: { verifieAt: new Date(), statutVerif: verdict.statut, detailVerif: verdict.detail.slice(0, 500) },
  })
  return verdict
}
