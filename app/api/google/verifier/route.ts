import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { connexionDe, jetonFrais, journaliser } from '@/lib/google/connexion'
import { envoyerMail } from '@/lib/gmail/envoyer'

export const dynamic = 'force-dynamic'

/**
 * « EST-CE QUE MON CANAL E-MAIL FONCTIONNE ? »
 *
 * Une connexion enregistrée en base ne prouve rien : le jeton peut être
 * illisible, la permission avoir été retirée côté Google, l'API pas activée.
 * Le distributeur a le droit d'obtenir une réponse franche avant de confier
 * sa prospection à un canal.
 *
 *   GET  — contrôle en lecture seule : on demande son profil à Gmail. Si
 *          Google répond, le jeton se déchiffre, la permission tient et
 *          l'API est active. Rien n'est envoyé.
 *
 *   POST — la preuve complète : un vrai e-mail, à sa propre adresse. C'est le
 *          seul moyen de vérifier ce qu'aucun test unitaire ne peut voir,
 *          c'est-à-dire ce qui arrive réellement dans une boîte de réception.
 *          Le texte contient volontairement des accents et des apostrophes.
 */

const PROFIL = 'https://gmail.googleapis.com/gmail/v1/users/me/profile'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  // Déclencher un envoi depuis un GET n'est pas orthodoxe, et c'est assumé :
  // tant que le bouton de la phase 7 n'existe pas, la seule alternative est de
  // faire taper un fetch dans la console du navigateur. Firefox y bloque le
  // collage — à juste titre, c'est le vecteur d'arnaque le plus courant — et on
  // finit par apprendre à l'utilisateur à désactiver un garde-fou pour un test.
  // Le paramètre est explicite, la route exige une session, et l'e-mail ne part
  // qu'à sa propre adresse : le risque est nul, la friction disparaît.
  const params = new URL(req.url).searchParams
  if (params.get('envoyer') === 'oui') {
    // `a=` envoie à une AUTRE adresse et conserve le fil. C'est la seule façon
    // d'éprouver la réception : sans fil ouvert, une réponse n'aurait rien à
    // quoi se rattacher et serait ignorée — correctement, mais sans rien
    // prouver.
    return envoyerLeTest(userId, params.get('a') ?? undefined)
  }

  const conn = await connexionDe(userId)
  if (!conn?.email) {
    return NextResponse.json({ ok: false, raison: 'aucun compte Google connecté' })
  }

  const jeton = await jetonFrais(userId)
  if (!jeton) {
    return NextResponse.json({ ok: false, adresseEnvoi: conn.email, raison: 'jeton indisponible ou non renouvelable' })
  }

  try {
    const r = await fetch(PROFIL, {
      headers: { Authorization: `Bearer ${jeton}` },
      signal: AbortSignal.timeout(15_000),
    })
    if (!r.ok) {
      const detail = (await r.text().catch(() => '')).slice(0, 200)
      await journaliser({ userId, action: 'ERREUR', adresse: conn.email, detail: `profil refusé (${r.status})` })
      return NextResponse.json({ ok: false, adresseEnvoi: conn.email, raison: `Google refuse (${r.status})`, detail })
    }
    const p = (await r.json()) as { emailAddress?: string; messagesTotal?: number; historyId?: string }

    await journaliser({ userId, action: 'LECTURE', adresse: conn.email, detail: 'contrôle du canal (profil)' })

    return NextResponse.json({
      ok: true,
      // Ce que GOOGLE dit être l'adresse, à comparer à ce qu'on a enregistré.
      // Un écart ici signalerait une connexion mal rattachée.
      adresseSelonGoogle: p.emailAddress ?? null,
      adresseEnregistree: conn.email,
      coherent: (p.emailAddress ?? '').toLowerCase() === conn.email.toLowerCase(),
      // Servira de point de départ à la surveillance des réponses (phase 4).
      historyId: p.historyId ?? null,
    })
  } catch (e) {
    return NextResponse.json({
      ok: false,
      adresseEnvoi: conn.email,
      raison: `Google injoignable : ${e instanceof Error ? e.message : 'inconnu'}`,
    })
  }
}

const SUJET = 'Atline — test de ta connexion e-mail'

const CORPS = `Bonjour,

Si tu lis ce message, ta boîte Gmail est bien reliée à Atline et Orion peut écrire en ton nom.

Ce message vérifie trois choses d'un coup :
  • l'envoi passe par l'API Gmail, depuis ton adresse
  • les accents et les apostrophes arrivent intacts : « Ça t'intéresse ? »
  • tes prospects verront ton nom et ton adresse, pas ceux d'un logiciel

Tu n'as rien à répondre.

— Atline`

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return envoyerLeTest(session.user.id)
}

async function envoyerLeTest(userId: string, autreAdresse?: string) {
  const conn = await connexionDe(userId)
  if (!conn?.email) {
    return NextResponse.json({ ok: false, raison: 'aucun compte Google connecté' }, { status: 400 })
  }

  const destinataire = (autreAdresse ?? conn.email).trim()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(destinataire)) {
    return NextResponse.json({ ok: false, raison: 'adresse destinataire invalide' }, { status: 400 })
  }
  const versSoiMeme = destinataire.toLowerCase() === conn.email.toLowerCase()

  // On passe par le VRAI chemin d'envoi, freins compris. Un test qui
  // contourne les garde-fous ne teste que la moitié du système.
  const envoi = await envoyerMail({
    userId,
    destinataire,
    sujet: SUJET,
    corps: versSoiMeme ? CORPS : `${CORPS}\n\nPS : réponds à ce message, c'est le test de la réception.`,
  })

  if (!envoi.ok) {
    return NextResponse.json({ ok: false, motif: envoi.motif, raison: envoi.message }, { status: 400 })
  }

  // Envoi à soi-même : un test n'est pas une conversation, on retire le fil
  // pour ne pas laisser un faux prospect dans les listes. Le journal d'accès,
  // lui, garde la trace de l'envoi — c'est la version qui doit rester vraie.
  //
  // Envoi à une autre adresse : on GARDE le fil, c'est justement lui qui rend
  // la réception éprouvable. La réponse aura un fil auquel se rattacher.
  if (versSoiMeme) await db.emailFil.delete({ where: { id: envoi.filId } }).catch(() => {})

  return NextResponse.json({
    ok: true,
    adresseEnvoi: envoi.adresseEnvoi,
    destinataire,
    messageId: envoi.messageId,
    threadId: envoi.threadId,
    filConserve: !versSoiMeme,
    message: versSoiMeme
      ? `Envoyé à ${destinataire}. Vérifie surtout que « Ça t'intéresse ? » s'affiche correctement.`
      : `Envoyé à ${destinataire}, et le fil est conservé. Réponds depuis cette adresse : la réponse doit remonter dans Atline.`,
  })
}
