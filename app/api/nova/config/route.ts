import { NextResponse } from 'next/server'

// Config Nova côté app : lit l'endpoint interne de l'admin (localhost) pour récupérer
// tous les prompts (chacun avec son modèle + paramètres). Fallback intégré si injoignable.
const ADMIN = 'http://127.0.0.1:3060/api/internal/nova/config'

const DEFAULT_HOOK =
  "Propose-moi 8 accroches courtes et percutantes pour ce contenu, faites pour GÉNÉRER DES LEADS (donner envie de commenter ou d'écrire en DM), pas juste des vues. Inspire-toi des formats qui cartonnent dans la niche. Numérote-les."

const DEFAULT_CONTENT =
  `Règles de contenu Atline (à respecter absolument) :
- Ne nomme JAMAIS la société ni la marque MLM (ex. Herbalife) : les réseaux pénalisent le contenu « opportunité/MLM » et ça fait fuir.
- Mets en avant le PRODUIT ou le BÉNÉFICE concret pour la personne — jamais la société, jamais le recrutement.
- Objectif : attirer et créer la confiance, pas vendre. Ton chaleureux, tutoiement, français, concret.`

type NovaPrompt = { prompt: string; model: string; temperature: number; maxTokens: number }

export async function GET() {
  let prompts: Record<string, NovaPrompt> = {}
  try {
    const r = await fetch(ADMIN, { cache: 'no-store', signal: AbortSignal.timeout(2000) })
    if (r.ok) {
      const d = await r.json()
      if (d?.prompts && typeof d.prompts === 'object') prompts = d.prompts
    }
  } catch {
    /* admin injoignable → fallbacks */
  }
  const hookPrompt = prompts.hook?.prompt?.trim() || DEFAULT_HOOK
  const contentPrompt = prompts.content?.prompt?.trim() || DEFAULT_CONTENT
  return NextResponse.json({ prompts, hookPrompt, contentPrompt })
}
