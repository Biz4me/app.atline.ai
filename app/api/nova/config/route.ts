import { NextResponse } from 'next/server'

// Config Nova côté app : lit l'endpoint interne de l'admin (localhost) pour récupérer
// le prompt d'accroches éditable. Fallback sur le prompt intégré si vide/injoignable.
const ADMIN = 'http://127.0.0.1:3060/api/internal/nova/config'

const DEFAULT_HOOK =
  "Propose-moi 8 accroches courtes et percutantes pour ce contenu, faites pour GÉNÉRER DES LEADS (donner envie de commenter ou d'écrire en DM), pas juste des vues. Inspire-toi des formats qui cartonnent dans la niche. Numérote-les."

// Règles de contenu injectées dans TOUTE génération (fix TOFU : jamais la société MLM).
const DEFAULT_CONTENT =
  `Règles de contenu Atline (à respecter absolument) :
- Ne nomme JAMAIS la société ni la marque MLM (ex. Herbalife) : les réseaux pénalisent le contenu « opportunité/MLM » et ça fait fuir. Aucun nom de société, aucun jargon MLM.
- Mets en avant le PRODUIT ou le BÉNÉFICE concret pour la personne — jamais la société, jamais le recrutement.
- Objectif : attirer et créer la confiance, pas vendre. Ton chaleureux, tutoiement, français, concret.`

export async function GET() {
  let hookPrompt = DEFAULT_HOOK
  let contentPrompt = DEFAULT_CONTENT
  try {
    const r = await fetch(ADMIN, { cache: 'no-store', signal: AbortSignal.timeout(2000) })
    if (r.ok) {
      const d = await r.json()
      if (typeof d.hook_prompt === 'string' && d.hook_prompt.trim()) hookPrompt = d.hook_prompt.trim()
      if (typeof d.content_prompt === 'string' && d.content_prompt.trim()) contentPrompt = d.content_prompt.trim()
    }
  } catch {
    /* admin injoignable → fallback */
  }
  return NextResponse.json({ hookPrompt, contentPrompt })
}
