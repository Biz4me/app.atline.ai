const AI_SERVICE = process.env.AI_SERVICE_URL || 'http://localhost:8100'

// Appel au service IA (FastAPI) en streaming SSE, accumule le texte. Utilisé par
// la rédaction de messages et le classement de documents.
export async function readAtlas(query: string, userId: string, mlm = ''): Promise<string> {
  const res = await fetch(`${AI_SERVICE}/api/atlas/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, user_id: userId, mlm_actif: mlm }),
  })
  let raw = ''
  if (res.ok && res.body) {
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') break
        try { const p = JSON.parse(data); if (p.text) raw += p.text } catch {}
      }
    }
  }
  return raw.trim()
}
