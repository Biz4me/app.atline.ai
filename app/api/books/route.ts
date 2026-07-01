import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const AI_SERVICE = process.env.AI_SERVICE_URL || 'http://localhost:8100'

// Nettoie le nom de fichier source -> titre lisible : retire l'extension,
// puis toutes les parenthèses (auteur, tags z-library), puis les espaces multiples.
function cleanTitle(s: string): string {
  return (s || '')
    .replace(/\.(epub|pdf|mobi|azw3?|txt)$/i, '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// Normalise un champ qui peut être un tableau ou une chaîne JSON en string[]
function parseList(v: any): string[] {
  if (Array.isArray(v)) return v
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}

export async function GET() {
  try {
    const res = await fetch(`${AI_SERVICE}/admin/books/summaries`, { cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ books: [] })
    const data = await res.json()
    const items: any[] = data.summaries || []
    const books = items.map((b) => ({
      id: b.book_title || b.source_file,
      title: cleanTitle(b.source_file) || b.book_title,
      author: b.author || '',
      summary: b.summary || '',
      keyMessage: b.key_message || '',
      whyRead: b.why_read || '',
      keyConcepts: parseList(b.key_concepts),
      tags: parseList(b.mlm_stages),
      chapters: b.chapter_count || 0,
      // Couche commerce (v1.5) — pas encore en base, boutons présents mais inactifs
      amazonUrl: b.amazon_url || null,
      audibleUrl: b.audible_url || null,
    }))
    return NextResponse.json({ books })
  } catch {
    return NextResponse.json({ books: [] })
  }
}
