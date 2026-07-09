import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ATLAS_URL = process.env.ATLAS_URL || 'http://127.0.0.1:8100'

// Nova génère le contenu de profil (bio, @, lien, approche) pour Instagram + TikTok,
// à partir de l'activité MLM active de l'utilisateur. Prêt à copier-coller.
export async function POST() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const prefs = await db.userPreferences.findUnique({ where: { userId }, select: { activeCompanyId: true } })
  const biz = prefs?.activeCompanyId
    ? await db.userMlmBusiness.findFirst({ where: { id: prefs.activeCompanyId, userId } })
    : await db.userMlmBusiness.findFirst({ where: { userId }, orderBy: { position: 'asc' } })

  // ⚠️ On NE passe PAS le nom de la société MLM (le contenu ne doit jamais la nommer).
  const contexte = [
    biz?.produit && `produit/offre : ${biz.produit}`,
    biz?.audience && `audience : ${biz.audience}`,
  ]
    .filter(Boolean)
    .join(' ; ') || 'produit/service (peu de détails renseignés)'

  // Règles de contenu éditables en admin (fallback intégré) — jamais nommer la société.
  let rules =
    'Ne nomme JAMAIS la société ni la marque MLM (ex. Herbalife). Mets en avant le PRODUIT / le bénéfice concret, jamais l\'opportunité ni le recrutement. Attirer et créer la confiance, pas vendre.'
  try {
    const cr = await fetch('http://127.0.0.1:3060/api/internal/nova/config', { cache: 'no-store', signal: AbortSignal.timeout(2000) })
    if (cr.ok) {
      const cd = await cr.json()
      if (typeof cd.content_prompt === 'string' && cd.content_prompt.trim()) rules = cd.content_prompt.trim()
    }
  } catch {}

  const prompt = `Tu génères le CONTENU de profil réseaux sociaux d'un distributeur, prêt à copier-coller.
${rules}
Contexte — ${contexte}.
Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte autour, de cette forme exacte :
{"instagram":{"bio":"...","handles":["@...","@..."],"linkCta":"...","content":"..."},"tiktok":{"bio":"...","handles":["@...","@..."],"linkCta":"...","content":"..."}}
Règles : bio = 1-2 lignes (qui il aide + le bénéfice + invite à cliquer le lien), adaptée au réseau (Insta un peu plus stylée, TikTok plus courte) ; handles = 2 idées de @ clairs ; linkCta = la phrase autour du lien en bio (vers sa capture/réunion) ; content = 1-2 phrases sur l'approche de contenu du réseau. Français, tutoiement, concret. UNIQUEMENT le JSON.`

  let text = ''
  try {
    const resp = await fetch(`${ATLAS_URL}/api/nova/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: prompt, user_id: userId, conversation_history: [] }),
    })
    if (!resp.ok || !resp.body) throw new Error()
    const reader = resp.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const parts = buf.split('\n\n')
      buf = parts.pop() ?? ''
      for (const part of parts) {
        for (const line of part.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const p = line.slice(6).trim()
          if (!p || p === '[DONE]') continue
          try {
            const d = JSON.parse(p)
            if (d.text) text += d.text
          } catch {}
        }
      }
    }
  } catch {
    return NextResponse.json({ error: 'Nova indisponible' }, { status: 502 })
  }

  // Extraire le JSON (le modèle peut l'entourer de texte / fences)
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      return NextResponse.json({ kit: JSON.parse(text.slice(start, end + 1)) })
    } catch {}
  }
  return NextResponse.json({ error: 'Réponse illisible', raw: text.slice(0, 500) }, { status: 502 })
}
