import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { provisionnerChatwoot } from '@/lib/chatwoot/provisionner'
import { verifierEtEnregistrer } from '@/lib/liens/verifier'
import { NextResponse } from 'next/server'

const ACCENT = ['#F97316', '#8B5CF6', '#3B82F6', '#22C55E', '#EF4444', '#F4B342', '#14B8A6']
const pick = () => ACCENT[Math.floor(Math.random() * ACCENT.length)]
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const {
    personality, phone, network, objectives, objective, gender, mode, contactColor,
    contactFirstName, contactLastName, market, prospectPhone, prospectEmail, links, experience, message,
    // Les deux liens qui portent l'argent (29 juillet) : demandés à l'onboarding,
    // `links` reste accepté pour ne pas casser le client actuel.
    boutiqueUrl, parrainageUrl,
  } = await req.json()
  // Mode Atline (débutant sans société) : l'affilié est rattaché à un business « Atline »
  const biz = (typeof network === 'string' && network.trim()) ? network.trim() : (mode === 'ATLINE' ? 'Atline' : '')

  // Aiguillage débutant/établi (nourrit le gate du plan : établi → session Diagnostic ; débutant → Bon Départ).
  // Sans société = débutant certain ; sinon, la réponse à la question d'onboarding tranche.
  const exp = mode === 'ATLINE' ? 'debutant' : (experience === 'etabli' ? 'etabli' : 'debutant')
  const cur = await db.user.findUnique({ where: { id: userId }, select: { coaching: true } })
  const coaching = { ...(cur?.coaching && typeof cur.coaching === 'object' && !Array.isArray(cur.coaching) ? cur.coaching : {}), experience: exp }

  // ── Utilisateur : couleur, téléphone, onboarding terminé ──
  // Atline n'est plus un MLM : l'affilié est identifié par son business « Atline »,
  // pas par un flag. Tout le monde passe en STANDARD.
  await db.user.update({
    where: { id: userId },
    data: {
      onboardingCompleted: true,
      onboardingFlow: 'STANDARD' as any,
      coaching,
      ...(personality && { personality: personality as any }),
      ...(typeof gender === 'string' && gender && { gender }),
      ...(typeof phone === 'string' && phone.trim() && { phone: phone.trim() }),
    },
  })

  let businessId: string | null = null

  if (biz) {
    const mlmSlug = slugify(biz) || 'activite'
    const goal = typeof objective === 'string' && objective
      ? objective
      : Array.isArray(objectives) ? objectives.join(',') : ''
    const business =
      (await db.userMlmBusiness.findFirst({ where: { userId, mlmSlug } })) ??
      (await db.userMlmBusiness.create({
        data: {
          userId, mlmName: biz, mlmSlug,
          role: 'Distributeur', color: pick(), initials: biz.slice(0, 2).toUpperCase(),
          active: true, position: 0, goal,
        },
      }))
    businessId = business.id

    // Son espace de conversation, cree en arriere-plan : on n'attend pas
    // Chatwoot pour laisser entrer le distributeur. Si ca echoue, il entre
    // quand meme et on repassera — une messagerie absente est un desagrement,
    // une inscription bloquee est un client perdu.
    void provisionnerChatwoot(businessId).catch(() => {})

    await db.userPreferences.upsert({
      where: { userId },
      create: { userId, activeCompanyId: businessId },
      update: { activeCompanyId: businessId },
    })

    // ── LES DEUX LIENS QUI PORTENT L'ARGENT ────────────────────────────
    // Décision du 29 juillet : on ne se fie plus à notre base de sociétés pour
    // ces deux-là. Le distributeur les connaît — il s'en sert tous les jours —
    // et une erreur lui coûte directement : un parrainage erroné, et son
    // filleul s'inscrit sous quelqu'un d'autre, définitivement.
    //
    // Ils sont DEMANDÉS avec insistance, jamais bloquants : certaines sociétés
    // n'ont pas de boutique en ligne, et une inscription bloquée est un client
    // perdu. La vérification part en arrière-plan.
    const idActivite = businessId   // figé ici : TypeScript sait qu'il n'est plus nul
    const poserLien = async (type: 'BOUTIQUE' | 'PARRAINAGE', valeur: unknown) => {
      if (!idActivite || typeof valeur !== 'string' || !valeur.trim()) return
      const lien = await db.toolboxLink.upsert({
        where: { userId_mlmBusinessId_linkType: { userId, mlmBusinessId: idActivite, linkType: type as any } },
        create: { userId, mlmBusinessId: idActivite, linkType: type as any, url: valeur.trim() },
        update: { url: valeur.trim(), verifieAt: null, statutVerif: null, detailVerif: null },
        select: { id: true },
      })
      // On ne fait pas attendre l'inscription pour joindre un site tiers.
      void verifierEtEnregistrer(lien.id).catch(() => {})
    }

    await poserLien('BOUTIQUE', Array.isArray(links) ? links[0] : boutiqueUrl)
    await poserLien('PARRAINAGE', parrainageUrl)

    // ── Premier contact ──
    if (typeof contactFirstName === 'string' && contactFirstName.trim()) {
      const fn = contactFirstName.trim()
      const ln = typeof contactLastName === 'string' ? contactLastName.trim() : ''
      const contact = await db.contact.create({
        data: {
          userId, mlmBusinessId: businessId, kind: 'PROSPECT',
          name: `${fn} ${ln}`.trim(),
          firstName: fn || null,
          lastName: ln || null,
          initials: (fn[0] + (ln[0] ?? '')).toUpperCase(),
          accent: pick(),
          phone: typeof prospectPhone === 'string' && prospectPhone.trim() ? prospectPhone.trim() : null,
          email: typeof prospectEmail === 'string' && prospectEmail.trim() ? prospectEmail.trim() : null,
          prospectStage: 'NOUVEAU' as any,
          ...(market && { market: market as any }),
          ...(contactColor && { personality: contactColor as any }),
          // Brouillon du 1er message généré à l'onboarding : on le GARDE (promesse « prêt à envoyer »).
          // Il s'affiche « ✍️ Brouillon » sur la liste et pré-remplit le fil du contact.
          ...(typeof message === 'string' && message.trim() && { lastDraft: message.trim(), lastDraftAt: new Date() }),
        },
      })

      // ── Relance « Atlas n'oublie pas » : programmée à J+3 (déclenchée par n8n) ──
      await db.relance.create({
        data: {
          userId,
          contactId: contact.id,
          channel: 'email',
          dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          message: `Coucou ${fn}, je reviens vers toi suite à mon message — toujours partant pour un petit échange cette semaine ? Dis-moi ce qui t'arrange.`,
        },
      })
    }
  }

  return NextResponse.json({ success: true, businessId })
}
