'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SendHorizontal, Mic, History, Plus, X, ChevronDown, MoreHorizontal, Pencil, Trash2, Paperclip, FileText, Users, Loader2, Zap, Target, SquarePen, UserRound, Compass } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { AppComposer } from '@/components/mobile/app-composer'

const BUCKET_LABEL: Record<string, string> = { PRESENTER: 'Présenter', FORMER: 'Former', VENDRE: 'Vendre' }

// Typo FR : espace fine insécable avant : ; ! ? et insécable autour du tiret — (jamais en début de ligne)
const TH = String.fromCharCode(0x202F), NB = String.fromCharCode(0xA0), EM = String.fromCharCode(0x2014)
const frText = (t: string) => t.replace(/ ([:;!?])/g, TH + '$1').replace(new RegExp(' ' + EM + ' ', 'g'), NB + EM + ' ')

import { ChatChoices, AtlasDraftCard, type PlanItem } from '@/components/atlas-plan-card'
import { ProfileFormCard } from '@/components/atlas-profile-form'
import { WhyValidateCard } from '@/components/atlas-why-card'

type Choice = { label: string; value: string }
type Msg = { from: 'user' | 'atlas'; text: string; chips?: string[]; choices?: Choice[]; item?: PlanItem; draft?: { contactId: string; prenom: string; channel: string; phone: string | null; email: string | null }; profileForm?: { me: Record<string, unknown> }; whyCard?: { text: string; superseded?: boolean; done?: boolean } }

// Indicateur « Atlas réfléchit » — 3 points en cascade
function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 200, 400].map((d) => (
        <span
          key={d}
          className="size-2 rounded-full bg-muted-foreground/50 animate-[atlas-typing_1.2s_ease-in-out_infinite]"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </div>
  )
}

// Au rechargement d'une conversation, certains messages « utilisateur » sont des prompts internes
// (cadre de session, contexte du plan) envoyés au LLM avec un libellé propre. On restitue ce libellé.
const displayUserText = (content: string): string => {
  if (content.startsWith('[SESSION_POURQUOI]')) return 'Je veux travailler mon pourquoi avec toi'
  if (content.startsWith('Voici mes priorités') || content.startsWith('Avant de courir après les contacts') || content.startsWith("Je n'ai aucune priorité")) return 'Mon plan du jour'
  return content
}

// Le marqueur technique [[POURQUOI]] (+ le pourquoi final) ne doit jamais s'afficher : on le retire à l'écran.
const WHY_MARK = '[[POURQUOI]]'
const stripWhyMarker = (content: string): string => {
  const k = content.indexOf(WHY_MARK)
  return k >= 0 ? content.slice(0, k).replace(/\s+$/, '') : content
}

const suggestions = [
  'Comment relancer un prospect tiède ?',
  'Prépare mon prochain closing',
  'Donne-moi mon plan du jour',
  'Comment gérer une objection prix ?',
]


type Conv = { id: string; title: string | null; updatedAt: string }

export default function AtlasPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const c = sp.get('c')
  const sessionParam = sp.get('session')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [histMounted, setHistMounted] = useState(false)
  const [histVisible, setHistVisible] = useState(false)
  const [histTop, setHistTop] = useState(0)
  const [histMenuId, setHistMenuId] = useState<string | null>(null)
  const [histMenuPos, setHistMenuPos] = useState<{ top: number; right: number } | null>(null)
  const [histEditingId, setHistEditingId] = useState<string | null>(null)
  const [histDraft, setHistDraft] = useState('')
  const headerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [streaming, setStreaming] = useState(false)
  // true tant qu'on charge une conversation depuis l'URL → évite le flash de l'état vide
  const [loadingConv, setLoadingConv] = useState<boolean>(!!c)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) setPendingFile(f)
  }
  async function routeToDocuments() {
    if (!pendingFile) return
    setUploadingDoc(true)
    const fd = new FormData()
    fd.append('file', pendingFile)
    const res = await fetch('/api/supports/auto', { method: 'POST', body: fd })
    setUploadingDoc(false)
    setPendingFile(null)
    if (res.ok) { const d = await res.json().catch(() => ({})); toast.success(`Atlas l'a rangé dans tes documents${d.bucket ? ` (${BUCKET_LABEL[d.bucket] ?? ''})` : ''}`) }
    else if (res.status === 413) toast.error('Fichier trop lourd (max 25 Mo)')
    else toast.error("Échec de l'upload")
  }
  function routeToContacts() {
    if (!pendingFile) return
    const reader = new FileReader()
    reader.onload = () => {
      sessionStorage.setItem('atline_import_text', String(reader.result ?? ''))
      setPendingFile(null)
      router.push('/contacts')
    }
    reader.readAsText(pendingFile)
  }
  const [convs, setConvs] = useState<Conv[]>([])
  const [mantra, setMantra] = useState('On avance ensemble ?')
  const [typedMantra, setTypedMantra] = useState('')
  const [firstName, setFirstName] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const loadedRef = useRef<string | null>(null)
  const atBottomRef = useRef(true)
  // Capture d'une info à texte libre demandée par Atlas (ex. métier) + file de champs manquants à combler
  const captureRef = useRef<{ field: string; item: PlanItem } | null>(null)
  const pendingRef = useRef<{ field: string; value: string; item: PlanItem } | null>(null)
  const gatherRef = useRef<{ queue: string[]; item: PlanItem | null }>({ queue: [], item: null })
  // Session profonde en cours (ex. « le pourquoi ») : le composeur alimente la session au lieu du chat libre.
  const sessionRef = useRef<null | 'why'>(null)
  const whyTurnsRef = useRef(0)

  // Charge la conversation de l'URL (?c=) — saute si on vient de la créer (loadedRef).
  useEffect(() => {
    if (c === loadedRef.current) return
    loadedRef.current = c
    if (!c) { setMsgs([]); setLoadingConv(false); return }
    let cancelled = false
    setLoadingConv(true)
    ;(async () => {
      try {
        const r = await fetch(`/api/atlas/conversations/${c}`)
        if (r.status === 404) {
          // conversation supprimée → on oublie et on repart vierge
          localStorage.removeItem('atlas-last-conv')
          loadedRef.current = null
          if (!cancelled) { setMsgs([]); router.replace('/atlas') }
          return
        }
        if (r.ok && !cancelled) {
          const d = await r.json()
          const raw: { role: string; content: string }[] = d.messages ?? []
          setMsgs(
            raw.map((m) => ({
              from: m.role === 'USER' ? 'user' : 'atlas',
              text: m.role === 'USER' ? displayUserText(m.content) : stripWhyMarker(m.content),
            })),
          )
          scrollToBottom()
          // Reprise d'une session « pourquoi » non finalisée : cadre présent + pourquoi pas encore enregistré.
          const isWhySession = raw.some((m) => m.role === 'USER' && m.content.startsWith('[SESSION_POURQUOI]'))
          if (isWhySession) {
            let saved = false
            try { const me = await fetch('/api/me').then((x) => (x.ok ? x.json() : null)); const w = me?.coaching?.why; saved = typeof w === 'string' && w.trim().length > 0 } catch { /* ignore */ }
            if (!cancelled && !saved) {
              // Reprise transparente : on rebranche le composeur sur la session, la conversation continue naturellement.
              sessionRef.current = 'why'
              whyTurnsRef.current = raw.filter((m) => m.role === 'USER' && !m.content.startsWith('[SESSION_POURQUOI]')).length
              // Si Atlas avait déjà proposé une formulation validée (dernier marqueur), on rétablit la carte « Je valide ».
              const lastMarked = [...raw].reverse().find((m) => m.role !== 'USER' && m.content.includes(WHY_MARK))
              if (lastMarked) {
                const pourquoi = lastMarked.content.slice(lastMarked.content.indexOf(WHY_MARK) + WHY_MARK.length).trim()
                if (pourquoi) setMsgs((prev) => [...prev, { from: 'atlas', text: '', whyCard: { text: pourquoi } }])
              }
            }
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoadingConv(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c])

  // Liste des conversations (historique mobile) — rafraîchie quand une nouvelle conv est créée
  const loadConvs = useCallback(async () => {
    try {
      const r = await fetch('/api/atlas/conversations')
      if (r.ok) setConvs(await r.json())
    } catch {
      /* ignore */
    }
  }, [])
  useEffect(() => { loadConvs() }, [loadConvs, c])

  // Mantra aléatoire pour l'écran d'accueil Atlas (proxy local → pas de CORS)
  const pickMantra = useCallback(() => {
    fetch('/api/mantras/random')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const t = (d?.text ?? '').replace(/^[\s«»"'"]+|[\s«»"'"]+$/g, '').trim()
        if (t) setMantra(t)
      })
      .catch(() => {})
  }, [])
  useEffect(() => { pickMantra() }, [pickMantra])

  // Frappe du mantra (façon onboarding) sur l'écran d'accueil Atlas
  useEffect(() => {
    const full = frText(mantra)
    setTypedMantra('')
    let i = 0
    const id = setInterval(() => {
      i++
      setTypedMantra(full.slice(0, i))
      if (i >= full.length) clearInterval(id)
    }, 22)
    return () => clearInterval(id)
  }, [mantra])

  // Prénom pour le bonjour perso de l'accueil
  useEffect(() => {
    fetch('/api/me').then((r) => (r.ok ? r.json() : null)).then((u) => { if (u?.firstName) setFirstName(u.firstName) }).catch(() => {})
  }, [])

  // Mémorise la conversation active pour la retrouver au retour sur Atlas
  useEffect(() => {
    if (c) localStorage.setItem('atlas-last-conv', c)
  }, [c])

  // Au retour sur /atlas (sans ?c=), reprend la dernière conversation en cours — sauf si on démarre une session.
  useEffect(() => {
    if (c || sessionParam) return
    const last = localStorage.getItem('atlas-last-conv')
    if (last) {
      setLoadingConv(true)
      router.replace(`/atlas?c=${last}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Démarrage d'une session profonde depuis un lien (?session=why), ex. bouton « Travaille-le avec Atlas » du profil.
  const sessionStartedRef = useRef(false)
  const startWhyRef = useRef<() => void>(() => {})
  useEffect(() => {
    if (sessionParam !== 'why' || sessionStartedRef.current || loadingConv) return
    sessionStartedRef.current = true
    // On repart d'un chat vierge pour la session, puis on retire le paramètre de l'URL.
    localStorage.removeItem('atlas-last-conv')
    loadedRef.current = null
    setMsgs([])
    router.replace('/atlas', { scroll: false })
    setTimeout(() => startWhyRef.current(), 100)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionParam, loadingConv])

  // Historique mobile — déploiement type menu « Plus » de l'accueil (slide depuis le header + backdrop)
  const openHist = () => {
    loadConvs()
    if (headerRef.current) setHistTop(headerRef.current.getBoundingClientRect().bottom)
    setHistMounted(true)
    requestAnimationFrame(() => setHistVisible(true))
  }
  const closeHist = () => {
    setHistVisible(false)
    setHistMenuId(null)
    setHistEditingId(null)
    setTimeout(() => setHistMounted(false), 300)
  }
  const toggleHist = () => { histMounted ? closeHist() : openHist() }

  // Composeur : grandit avec le contenu réel (jusqu'à 120px puis scroll)
  const resizeTextarea = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }
  useEffect(() => { resizeTextarea() }, [input])

  // Historique : renommer / supprimer (mobile, même logique que desktop)
  const renameConv = async () => {
    const id = histEditingId
    const title = histDraft.trim()
    setHistEditingId(null)
    if (!id || !title) return
    setConvs((prev) => prev.map((cv) => (cv.id === id ? { ...cv, title } : cv)))
    await fetch(`/api/atlas/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).catch(() => {})
  }
  const deleteConv = async (id: string) => {
    setHistMenuId(null)
    setConvs((prev) => prev.filter((cv) => cv.id !== id))
    await fetch(`/api/atlas/conversations/${id}`, { method: 'DELETE' }).catch(() => {})
    if (id === c) {
      localStorage.removeItem('atlas-last-conv')
      router.replace('/atlas')
    }
  }

  const scrollToBottom = () =>
    setTimeout(() => scrollRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }), 50)

  // Auto-scroll poli : ne suit la génération que si l'utilisateur est déjà en bas
  const autoScroll = () => { if (atBottomRef.current) scrollToBottom() }

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48
    atBottomRef.current = atBottom
    setShowScrollBtn(!atBottom)
  }

  const goToBottom = () => { atBottomRef.current = true; setShowScrollBtn(false); scrollToBottom() }

  const setLastAtlas = (text: string) =>
    setMsgs((prev) => {
      const next = [...prev]
      next[next.length - 1] = { from: 'atlas', text }
      return next
    })

  const sendMsg = async (text: string, display?: string, afterDone?: () => void) => {
    const q = text.trim()
    if (!q || streaming) return

    setMsgs((prev) => [...prev, { from: 'user', text: display ?? q }, { from: 'atlas', text: '' }])
    setInput('')
    setStreaming(true)
    atBottomRef.current = true
    scrollToBottom()

    // Machine à écrire — même rythme que l'onboarding (22ms/car), indépendant de l'arrivée des tokens
    const isWhy = sessionRef.current === 'why'
    const MARK = '[[POURQUOI]]'
    let full = ''
    let markerIdx = -1
    let shown = 0
    let streamDone = false
    let resolveDone: () => void = () => {}
    const donePromise = new Promise<void>((res) => { resolveDone = res })
    // En session pourquoi, on ne révèle jamais le marqueur ni un début de marqueur en fin de flux.
    const revealTarget = () => {
      if (!isWhy) return full
      if (markerIdx >= 0) return full.slice(0, markerIdx).replace(/\s+$/, '')
      for (let n = Math.min(MARK.length - 1, full.length); n > 0; n--) if (full.endsWith(MARK.slice(0, n))) return full.slice(0, full.length - n)
      return full
    }
    const tick = () => {
      const t = revealTarget()
      if (shown < t.length) { shown++; setLastAtlas(t.slice(0, shown)); autoScroll(); setTimeout(tick, 22) }
      else if (!streamDone) setTimeout(tick, 40)
      else { setStreaming(false); resolveDone() }
    }

    try {
      const resp = await fetch('/api/atlas/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          conversationId: c ?? undefined,
          mlm_actif: 'Atline',
        }),
      })
      if (!resp.ok || !resp.body) throw new Error('no stream')

      // Nouvelle conversation : on synchronise l'URL (la sidebar se rafraîchit) sans recharger.
      const newCid = resp.headers.get('X-Conversation-Id')
      if (newCid && newCid !== c) {
        loadedRef.current = newCid
        router.replace(`/atlas?c=${newCid}`, { scroll: false })
      }

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      setTimeout(tick, 120)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') continue
          try {
            const data = JSON.parse(payload)
            if (data.text) { full += data.text; if (isWhy && markerIdx < 0) { const k = full.indexOf(MARK); if (k >= 0) markerIdx = k } }
          } catch {
            /* ligne SSE incomplète, ignorée */
          }
        }
      }
      if (!full) full = "Je n'ai pas de réponse pour l'instant. Reformule ta question ?"
      streamDone = true
      await donePromise
      // Atlas a proposé sa formulation validée (marqueur présent) → carte de validation « Je valide ».
      if (isWhy && markerIdx >= 0) {
        if (!revealTarget().trim()) setLastAtlas('Voilà, je crois qu’on y est.')
        const pourquoi = full.slice(markerIdx + MARK.length).trim()
        if (pourquoi) appendWhyCard(pourquoi)
      }
      afterDone?.()
    } catch {
      setLastAtlas("Désolé, je n'ai pas pu répondre à l'instant. Réessaie dans un moment.")
      streamDone = true
      resolveDone()
      setStreaming(false)
      afterDone?.()
    }
  }

  // Demande le canal (message / mail / appel) via ronds sélectifs.
  const askChannel = (item: PlanItem) => {
    const ch: Choice[] = []
    if (item.phone) ch.push({ label: '📱 Lui envoyer un message', value: 'chan:message' })
    if (item.email) ch.push({ label: '✉️ Lui écrire un mail', value: 'chan:mail' })
    if (item.phone) ch.push({ label: "📞 L'appeler", value: 'chan:call' })
    if (ch.length === 0) ch.push({ label: 'Ajouter un moyen de le contacter', value: 'fiche' })
    setMsgs((prev) => [...prev, { from: 'atlas', text: `Comment tu préfères aborder ${item.prenom} ?`, choices: ch, item }])
    setTimeout(scrollToBottom, 60)
  }

  // Rond sélectif pour un champ manquant (proximité ou personnalité DISC).
  const askField = (item: PlanItem, kind: 'market' | 'disc') => {
    const choices: Choice[] = kind === 'market'
      ? [{ label: 'Un proche', value: 'set:market:CHAUD' }, { label: 'Une connaissance', value: 'set:market:TIEDE' }, { label: 'On se connaît peu', value: 'set:market:FROID' }]
      : [{ label: '🔴 Fonceur, direct, résultats', value: 'set:personality:ROUGE' }, { label: '🟢 Analytique, prudent, factuel', value: 'set:personality:VERT' }, { label: '🔵 Sociable, spontané, fun', value: 'set:personality:BLEU' }, { label: '🟡 Relationnel, bienveillant', value: 'set:personality:JAUNE' }]
    setMsgs((prev) => [...prev, { from: 'atlas', text: kind === 'market' ? `Tu connais ${item.prenom} comment ?` : `Tu le sens plutôt comment, ${item.prenom} ?`, choices, item }])
    setTimeout(scrollToBottom, 60)
  }

  // Demande un champ à texte libre (métier) — capté via le composeur.
  const askProfession = (item: PlanItem) => {
    captureRef.current = { field: 'profession', item }
    setMsgs((prev) => [...prev, { from: 'atlas', text: `Il fait quoi dans la vie, ${item.prenom} ? Écris-le-moi, ça m'aide à personnaliser.` }])
    setTimeout(scrollToBottom, 60)
  }

  // Enchaîne les champs manquants un par un ; file vide → on passe au canal.
  const gatherStep = () => {
    const { queue, item } = gatherRef.current
    if (!item) return
    if (queue.length === 0) { askChannel(item); return }
    const f = queue[0]
    if (f === 'market') askField(item, 'market')
    else if (f === 'personality') askField(item, 'disc')
    else if (f === 'profession') askProfession(item)
    else askChannel(item)
  }
  const advanceGather = () => { gatherRef.current.queue = gatherRef.current.queue.slice(1); setTimeout(gatherStep, 350) }

  // Le point sur la fiche : ce qu'Atlas sait / ce qui manque d'important, puis on complète un par un.
  const pointAndGather = async (item: PlanItem) => {
    let c: { profession?: string | null; market?: string | null; personality?: string | null; note?: string | null } | null = null
    try { const r = await fetch(`/api/contacts/${item.contactId}`); c = r.ok ? await r.json() : null } catch { /* ignore */ }
    const has: string[] = []
    if (c?.profession) has.push(`son métier (${c.profession})`)
    if (c?.market) has.push('votre proximité')
    if (c?.personality) has.push('sa personnalité')
    if (c?.note && c.note.trim()) has.push('quelques notes')
    const queue: string[] = []
    if (!c?.market) queue.push('market')
    if (!c?.personality) queue.push('personality')
    if (!c?.profession) queue.push('profession')
    const missLabels = queue.map((q) => (q === 'market' ? 'votre proximité' : q === 'personality' ? 'sa personnalité (pour le ton)' : 'son métier'))
    const knownTxt = has.length ? `Ce que je sais sur ${item.prenom} : ${has.join(', ')}.` : `Je ne connais pas encore grand-chose sur ${item.prenom}.`
    const missTxt = missLabels.length ? ` Pour viser juste, ça m'aiderait de connaître : ${missLabels.join(', ')}.` : " On a l'essentiel."
    setMsgs((prev) => [...prev, { from: 'atlas', text: knownTxt + missTxt }])
    gatherRef.current = { queue, item }
    setTimeout(gatherStep, 550)
  }

  // Démarre le flux d'action : point sur le contact → enrichissement → canal → concret.
  const startActionFlow = (item: PlanItem) => {
    // Item de FONDATION (socle, pas de contact) : le gate de phase prime → on route vers la bonne surface.
    if (!item.contactId) {
      if (item.action === 'FOUND_WHY') { setTimeout(() => startWhyRef.current(), 300); return }
      if (item.action === 'FOUND_PROFILE') { setTimeout(() => showProfileForm(), 300); return }
      const label = item.action === 'FOUND_LIST' ? 'Construire ma liste' : item.action === 'FOUND_MINDSET' ? 'Ouvrir le module' : 'Y aller'
      setMsgs((prev) => [...prev, { from: 'atlas', text: item.reason, choices: [{ label, value: 'goto' }], item }])
      setTimeout(scrollToBottom, 60)
      return
    }
    if (item.action !== 'MESSAGE') {
      setMsgs((prev) => [...prev, { from: 'atlas', text: `On s'occupe de ${item.prenom} — dis-moi :`, choices: [{ label: 'Ouvre sa fiche', value: 'fiche' }, { label: "Je m'entraîne avec Aria", value: 'aria' }], item }])
      setTimeout(scrollToBottom, 60)
      return
    }
    pointAndGather(item)
  }

  // « Mon plan du jour » : Atlas présente EN CONVERSATION, puis lance le flux guidé sur la priorité n°1.
  const showPlan = async () => {
    if (streaming) return
    let items: PlanItem[] = []
    try { const r = await fetch('/api/plan/today'); const d = r.ok ? await r.json() : null; items = d?.items ?? [] } catch { /* ignore */ }
    const top = items[0]
    const isFoundation = top && !top.contactId
    const line = (it: PlanItem, i: number) => it.contactId
      ? `${i + 1}. ${it.headline} — ${it.reason} (contact : ${it.prenom}, étape : ${it.stage || 'à définir'})`
      : `${i + 1}. ${it.headline} — ${it.reason} (fondation de ton activité, pas un contact)`
    const ctx = items.length === 0
      ? "Je n'ai aucune priorité urgente aujourd'hui d'après mes contacts. Dis-moi à ta voix, comme un coach, comment on avance (prospecter, enrichir ma liste, me former…) — une action à la fois."
      : isFoundation
        ? 'Avant de courir après les contacts, je regarde ta FONDATION — le socle qui fait que tout le reste tient :\n'
          + items.map(line).join('\n')
          + "\n\nPrésente-moi ça à ta voix, comme un coach exigeant et bienveillant. Explique-moi en 1-2 phrases courtes POURQUOI on pose d'abord la priorité n°1 (le socle avant le terrain), sans jargon. RÈGLE ABSOLUE : ne termine PAS par une question, ne me demande PAS ce que je veux faire, ne propose AUCUNE option. Tu t'arrêtes net. C'est MOI qui enchaîne juste après."
        : 'Voici mes priorités du jour, déjà calculées et classées :\n'
          + items.map(line).join('\n')
          + "\n\nPrésente-moi ça à ta voix, comme un coach — pas une liste, tu me parles. Concentre-toi sur la priorité n°1 : dis-moi juste l'état d'esprit à avoir, en 1-2 phrases courtes. RÈGLE ABSOLUE : ne termine PAS par une question, ne me demande PAS ce que je veux faire, ne propose AUCUNE option. Tu t'arrêtes net sur l'état d'esprit. C'est MOI qui pose la question suivante juste après."
    await sendMsg(ctx, 'Mon plan du jour')
    if (top) startActionFlow(top)
  }

  // Compléter mon profil : carte mini-formulaire inline (self-serve, tout dans le chat).
  const showProfileForm = async () => {
    if (streaming) return
    setMsgs((prev) => [...prev, { from: 'user', text: 'Compléter mon profil' }])
    setTimeout(scrollToBottom, 40)
    let me: Record<string, unknown> | null = null
    try { const r = await fetch('/api/me'); me = r.ok ? await r.json() : null } catch { /* ignore */ }
    if (!me) { setMsgs((prev) => [...prev, { from: 'atlas', text: "Je n'arrive pas à charger ton profil, réessaie dans un instant." }]); return }
    setMsgs((prev) => [...prev, { from: 'atlas', text: 'On complète les infos simples de ton profil — remplis ce qui manque ici, directement :' }, { from: 'atlas', text: '', profileForm: { me: me! } }])
    setTimeout(scrollToBottom, 60)
  }

  // ── Session profonde « le pourquoi » : Atlas creuse en conversation, puis synthétise une formulation
  //    que l'utilisateur régénère et valide → Atlas l'enregistre dans le profil (coaching.why). ──
  const startWhySession = () => {
    if (streaming) return
    sessionRef.current = 'why'
    whyTurnsRef.current = 0
    const frame = `[SESSION_POURQUOI] On démarre un échange à cœur ouvert pour formuler MON POURQUOI profond${NB}: la vraie motivation de fond derrière mon activité, au-delà de "gagner de l'argent".

Comporte-toi comme un excellent coach en tête-à-tête${NB}: un VRAI dialogue vivant, pas un questionnaire.
- Accueille-moi en UNE phrase, puis pose UNE seule question ouverte pour démarrer.
- À chacune de mes réponses, RE-CREUSE une fois, une question à la fois (les 5 pourquoi${NB}: "et pourquoi c'est important pour toi${NB}?", "qu'est-ce que ça changerait concrètement dans ta vie${NB}?"). Court, chaleureux, jamais de liste.
- Régulièrement, REFLÈTE en une phrase ce que tu entends ("ce que j'entends, c'est que…") pour montrer que tu suis et affiner petit à petit.
- Quand TOI, en bon coach, tu juges que le pourquoi est vraiment là (profond et incarné, pas juste "être libre"), PROPOSE ta formulation à la 1ʳᵉ personne (2-4 phrases) et demande-moi si ça capture bien mon vrai pourquoi OU si je veux ajouter/ajuster quelque chose. Ne te précipite pas${NB}: ce moment arrive quand c'est mûr.
- Si j'ajuste, intègre et re-propose, jusqu'à ce que ce soit juste.

TECHNIQUE (invisible pour moi, ne l'explique jamais)${NB}: le jour où je VALIDE explicitement ta formulation (je dis oui / c'est ça / parfait…), écris ta phrase de clôture chaleureuse, PUIS ajoute tout à la fin, sur une nouvelle ligne, EXACTEMENT ce format${NB}: [[POURQUOI]] suivi de mon pourquoi final à la 1ʳᵉ personne (2-4 phrases). N'écris la ligne [[POURQUOI]] QU'APRÈS ma validation explicite, jamais avant.`
    sendMsg(frame, 'Je veux travailler mon pourquoi avec toi')
  }

  // Réponse de l'utilisateur pendant la session : il tape simplement, comme une vraie conversation.
  // Atlas creuse, récapitule, et décide lui-même quand proposer sa formulation (→ carte de validation).
  const whyAnswer = (v: string) => {
    setInput('')
    whyTurnsRef.current += 1
    // L'utilisateur préfère continuer à parler plutôt que valider → la proposition en cours est dépassée, Atlas affine.
    setMsgs((prev) => prev.map((m) => (m.whyCard && !m.whyCard.done ? { ...m, whyCard: { ...m.whyCard, superseded: true } } : m)))
    sendMsg(v)
  }

  // Atlas a proposé une formulation validée ensemble (marqueur émis) → carte de validation (non régénérable).
  // La session reste active : si l'utilisateur écrit encore, la carte est dépassée et Atlas affine ; s'il tape « Je valide », on enregistre.
  const appendWhyCard = (text: string) => {
    setMsgs((prev) => [...prev, { from: 'atlas', text: '', whyCard: { text } }])
    setTimeout(scrollToBottom, 80)
  }

  const validateWhyCard = async (idx: number, text: string): Promise<boolean> => {
    let ok = false
    try {
      const me = await fetch('/api/me').then((x) => (x.ok ? x.json() : null))
      const coaching = { ...(me?.coaching && typeof me.coaching === 'object' ? me.coaching : {}), why: text }
      const r = await fetch('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ coaching }) })
      ok = r.ok
      if (ok) { try { sessionStorage.removeItem('profile_draft_v1') } catch { /* ignore */ } }
    } catch { /* ignore */ }
    if (ok) {
      sessionRef.current = null
      setMsgs((prev) => [
        ...prev.map((m, j) => (j === idx && m.whyCard ? { ...m, whyCard: { ...m.whyCard, done: true } } : m)),
        { from: 'atlas', text: `C’est gravé dans ton profil ✓ Ton pourquoi sera ton point d’ancrage${NB}: on y reviendra chaque fois que tu douteras ou qu’on préparera un message important.` },
      ])
      setTimeout(scrollToBottom, 60)
    }
    return ok
  }

  // Sélection d'un rond : retire les choix, renvoie le choix en bulle, et branche (machine à états du flux).
  const handleChoice = (item: PlanItem, value: string, label: string, idx: number) => {
    setMsgs((prev) => [...prev.map((m, j) => (j === idx ? { ...m, choices: undefined } : m)), { from: 'user', text: label }])
    // Nouvelle info donnée par l'utilisateur → Atlas demande s'il l'enregistre, le fait lui-même, puis confirme.
    if (value.startsWith('set:')) {
      const [, field, val] = value.split(':')
      const ack = field === 'market'
        ? (val === 'CHAUD' ? 'Un proche — on pourra être direct.' : val === 'FROID' ? 'Vous vous connaissez peu — on restera léger.' : 'Une connaissance, noté.')
        : 'Ok, je vois le tempérament.'
      setMsgs((prev) => [...prev, { from: 'atlas', text: `${ack} Tu veux que je l'enregistre dans la fiche de ${item.prenom} ?`, choices: [{ label: 'Oui, enregistre-la', value: `save:${field}:${val}` }, { label: 'Non merci', value: `nosave:${field}:${val}` }], item }])
      setTimeout(scrollToBottom, 60)
      return
    }
    if (value.startsWith('save:')) {
      const [, field, val] = value.split(':')
      fetch(`/api/contacts/${item.contactId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: val }) })
        .then((r) => { setMsgs((prev) => [...prev, { from: 'atlas', text: r.ok ? "C'est noté dans sa fiche ✓" : "Je n'ai pas réussi à l'enregistrer, mais on continue." }]); advanceGather() })
        .catch(() => { setMsgs((prev) => [...prev, { from: 'atlas', text: "Je n'ai pas réussi à l'enregistrer, mais on continue." }]); advanceGather() })
      return
    }
    if (value.startsWith('nosave:')) {
      setMsgs((prev) => [...prev, { from: 'atlas', text: 'Ok, je ne le note pas.' }])
      advanceGather()
      return
    }
    if (value === 'savecap') {
      const p = pendingRef.current; pendingRef.current = null
      if (p) {
        fetch(`/api/contacts/${item.contactId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [p.field]: p.value }) })
          .then((r) => { setMsgs((prev) => [...prev, { from: 'atlas', text: r.ok ? "C'est noté dans sa fiche ✓" : "Je n'ai pas réussi à l'enregistrer, mais on continue." }]); advanceGather() })
          .catch(() => { setMsgs((prev) => [...prev, { from: 'atlas', text: "Je n'ai pas réussi à l'enregistrer, mais on continue." }]); advanceGather() })
      } else advanceGather()
      return
    }
    if (value === 'nocap') {
      pendingRef.current = null
      setMsgs((prev) => [...prev, { from: 'atlas', text: 'Ok, je ne le note pas.' }])
      advanceGather()
      return
    }
    if (value === 'chan:message') {
      const ch = item.phone ? 'WHATSAPP' : 'SMS'
      setMsgs((prev) => [...prev,
        { from: 'atlas', text: `Je te prépare un message qui lui ressemble. Régénère-le si besoin, puis ouvre-le direct dans ${ch === 'WHATSAPP' ? 'WhatsApp' : 'tes SMS'}.` },
        { from: 'atlas', text: '', draft: { contactId: item.contactId, prenom: item.prenom, channel: ch, phone: item.phone, email: item.email } },
      ])
      setTimeout(scrollToBottom, 60)
      return
    }
    if (value === 'chan:mail') {
      setMsgs((prev) => [...prev,
        { from: 'atlas', text: `Je te prépare un mail pour ${item.prenom}.` },
        { from: 'atlas', text: '', draft: { contactId: item.contactId, prenom: item.prenom, channel: 'EMAIL', phone: item.phone, email: item.email } },
      ])
      setTimeout(scrollToBottom, 60)
      return
    }
    if (value === 'chan:call') {
      setMsgs((prev) => [...prev, { from: 'atlas', text: "Un appel, c'est le plus puissant — et le plus intimidant. Tu veux t'échauffer avec Aria d'abord ?", choices: [{ label: "Oui, je m'entraîne avec Aria", value: 'call:aria' }, { label: `Non, j'appelle ${item.prenom} maintenant`, value: 'call:now' }], item }])
      setTimeout(scrollToBottom, 60)
      return
    }
    if (value === 'call:aria' || value === 'aria') { router.push(`/aria?contact=${item.contactId}`); return }
    if (value === 'call:now' && item.phone) { window.location.href = `tel:${item.phone}`; return }
    if (value === 'goto' && item.route) { router.push(item.route); return } // item de fondation → ouvre la surface (formation, contacts…)
    if (value === 'fiche') { router.push(`/contacts/${item.contactId}`) }
  }

  // Saisie captée (champ texte libre demandé par Atlas) → il propose de l'enregistrer, puis enchaîne.
  const handleCapture = (v: string) => {
    const cap = captureRef.current
    captureRef.current = null
    setInput('')
    setMsgs((prev) => [...prev, { from: 'user', text: v }])
    if (!cap) return
    pendingRef.current = { field: cap.field, value: v, item: cap.item }
    setTimeout(() => {
      setMsgs((prev) => [...prev, { from: 'atlas', text: `Noté. Tu veux que je l'enregistre dans la fiche de ${cap.item.prenom} ?`, choices: [{ label: 'Oui, enregistre-le', value: 'savecap' }, { label: 'Non merci', value: 'nocap' }], item: cap.item }])
      scrollToBottom()
    }, 200)
  }

  // Envoi du composeur : si Atlas attend une info (capture), on la capte ; sinon message normal.
  const submitInput = () => {
    const v = input.trim()
    if (!v || streaming) return
    if (captureRef.current) { handleCapture(v); return }
    if (sessionRef.current === 'why') { whyAnswer(v); return }
    sendMsg(v)
  }

  const newSession = () => {
    closeHist()
    localStorage.removeItem('atlas-last-conv')
    loadedRef.current = null
    setMsgs([])
    pickMantra()
    if (c) router.push('/atlas')
  }

  // Permet à l'effet ?session=why de déclencher la session une fois la fonction définie.
  startWhyRef.current = startWhySession

  // Historique + nouveau chat pilotés depuis la barre du haut globale (via événements)
  const toggleHistRef = useRef(toggleHist); toggleHistRef.current = toggleHist
  const newSessionRef = useRef(newSession); newSessionRef.current = newSession
  useEffect(() => {
    const onHist = () => toggleHistRef.current()
    const onNew = () => newSessionRef.current()
    window.addEventListener('agent:history', onHist)
    window.addEventListener('agent:new', onNew)
    return () => { window.removeEventListener('agent:history', onHist); window.removeEventListener('agent:new', onNew) }
  }, [])

  // Relais du composeur global : message tapé sur une autre page → envoyé ici une fois la conv chargée
  const sendMsgRef = useRef(sendMsg); sendMsgRef.current = sendMsg
  const pendingSentRef = useRef(false)
  useEffect(() => {
    if (loadingConv || pendingSentRef.current) return
    const pending = sessionStorage.getItem('atlas_pending')
    if (pending) {
      pendingSentRef.current = true
      sessionStorage.removeItem('atlas_pending')
      sendMsgRef.current(pending)
    }
  }, [loadingConv])

  return (
    <div className="flex h-[calc(100dvh-60px)] overflow-hidden lg:h-[calc(100dvh-3.5rem)]">

      {/* ── Zone principale : chat ── (l'historique desktop vit dans la sidebar 2) */}
      <div className="flex flex-1 flex-col min-h-0 min-w-0">

        {/* Header */}
        {/* Contrat d'alignement : lg:h-[68px] + items-center = icône/titre centrés à 90px (indépendant de la taille). */}
        {/* Ancre : 0px sur mobile (le panneau historique se positionne sous la barre globale) ; en-tête 68px desktop */}
        <div ref={headerRef} className="shrink-0 lg:h-[68px]" />

        {/* Mobile : historique — slide depuis le header + backdrop (comme le menu Plus de l'accueil) */}
        {histMounted && (
          <>
            <div
              className="lg:hidden fixed inset-x-0 bottom-0 z-[55] bg-black/40 transition-opacity duration-300"
              style={{ top: histTop, opacity: histVisible ? 1 : 0 }}
              onClick={closeHist}
            />
            <div
              data-hist-sheet
              className="lg:hidden fixed inset-x-0 z-[60] mx-auto max-w-[480px]"
              style={{ top: histTop, clipPath: 'inset(0 0 0 0)' }}
            >
              <div
                className="max-h-[60vh] overflow-y-auto no-scrollbar border-b border-border bg-background transition-transform duration-300 ease-out"
                style={{ transform: histVisible ? 'translateY(0)' : 'translateY(-100%)' }}
              >
                <div className="divide-y divide-border">
                  {convs.length === 0 && (
                    <p className="px-5 py-4 text-sm text-muted-foreground">Aucune conversation.</p>
                  )}
                  {convs.map((cv) =>
                    histEditingId === cv.id ? (
                      <div key={cv.id} className="px-3 py-2">
                        <input
                          autoFocus
                          value={histDraft}
                          onChange={(e) => setHistDraft(e.target.value)}
                          onBlur={renameConv}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') renameConv()
                            if (e.key === 'Escape') setHistEditingId(null)
                          }}
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none"
                        />
                      </div>
                    ) : (
                      <div key={cv.id} className="relative flex items-center">
                        <button
                          type="button"
                          onClick={() => { closeHist(); router.push(`/atlas?c=${cv.id}`) }}
                          className={cn(
                            'flex flex-1 items-center gap-3 px-5 py-3.5 pr-12 text-left transition-colors active:bg-muted',
                            cv.id === c && 'bg-muted',
                          )}
                        >
                          <History className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{cv.title || 'Sans titre'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            const btn = e.currentTarget.getBoundingClientRect()
                            const sheet = (e.currentTarget.closest('[data-hist-sheet]') as HTMLElement | null)?.getBoundingClientRect()
                            const right = sheet ? window.innerWidth - sheet.right : window.innerWidth - btn.right
                            setHistMenuPos({ top: btn.bottom + 6, right })
                            setHistMenuId(cv.id)
                          }}
                          className="absolute right-3 flex size-8 items-center justify-center rounded-lg text-muted-foreground active:bg-muted"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>

            {/* Menu ••• en position fixe → jamais coupé par l'overflow/clip du panneau */}
            {histMenuId && histMenuPos && (
              <>
                <div className="lg:hidden fixed inset-0 z-[64]" onClick={() => setHistMenuId(null)} />
                <div
                  className="lg:hidden fixed z-[65] w-40 overflow-hidden rounded-xl border border-border bg-background py-1 shadow-card"
                  style={{ top: histMenuPos.top, right: histMenuPos.right }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const id = histMenuId
                      const cv = convs.find((x) => x.id === id)
                      setHistMenuId(null)
                      setHistEditingId(id)
                      setHistDraft(cv?.title ?? '')
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground active:bg-muted"
                  >
                    <Pencil className="size-3.5 stroke-[1.5] text-muted-foreground" />Renommer
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (histMenuId) deleteConv(histMenuId) }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-destructive active:bg-destructive/10"
                  >
                    <Trash2 className="size-3.5 stroke-[1.5]" />Supprimer
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Conversation / empty state */}
        {loadingConv ? (
          <div className="flex-1" />
        ) : msgs.length === 0 ? (
          <div className="flex flex-1 flex-col px-4 pb-20 lg:pb-0">
            <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-2 text-center">
              <p className="font-display text-[27px] font-bold leading-[1.2] tracking-[-0.025em] text-foreground">{firstName ? `Bonjour ${firstName}` : 'Bonjour'}</p>
              <p className="min-h-[50px] max-w-[320px] text-lg leading-[1.4] text-muted-foreground">{typedMantra}</p>
            </div>
            {!input.trim() && (
              <div className="mx-auto flex w-full max-w-md flex-col gap-0.5">
                {[
                  { icon: Zap, label: 'Mon plan du jour', run: () => showPlan() },
                  { icon: Target, label: 'Mon prochain pas', run: () => sendMsg('Quel est mon prochain pas ?') },
                  { icon: Mic, label: 'Simuler un appel avec Aria', run: () => router.push('/aria') },
                  { icon: SquarePen, label: 'Créer un post avec Nova', run: () => router.push('/nova') },
                  { icon: UserRound, label: 'Compléter mon profil', run: () => showProfileForm() },
                  { icon: Compass, label: 'Travailler mon pourquoi', run: () => startWhySession() },
                ].map(({ icon: Icon, label, run }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={run}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-lg text-foreground transition-colors active:bg-muted"
                  >
                    <Icon className="size-5 shrink-0 text-muted-foreground" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto no-scrollbar px-6 pt-4 pb-24 lg:pb-4"
          >
            <div className="mx-auto flex max-w-md flex-col gap-4 lg:max-w-3xl">
            {msgs.map((m, i) => (
              <div key={i} className={cn('flex flex-col gap-2', m.from === 'user' ? 'items-end' : 'items-start')}>
                {m.from === 'user' ? (
                  <div className="max-w-[82%] whitespace-pre-line rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-lg leading-[1.4] text-primary-foreground lg:text-sm">
                    {frText(m.text)}
                  </div>
                ) : m.choices && m.item ? (
                  <div className="flex w-full flex-col gap-2">
                    {m.text && <p className="text-lg leading-[1.65] text-foreground lg:text-sm">{m.text}</p>}
                    <ChatChoices choices={m.choices} onPick={(value, label) => handleChoice(m.item!, value, label, i)} />
                  </div>
                ) : m.draft ? (
                  <AtlasDraftCard contactId={m.draft.contactId} prenom={m.draft.prenom} channel={m.draft.channel} phone={m.draft.phone} email={m.draft.email} />
                ) : m.profileForm ? (
                  <ProfileFormCard me={m.profileForm.me} onSaved={(n) => { setMsgs((prev) => [...prev, { from: 'atlas', text: `C'est noté dans ton profil ✓ (${n} info${n > 1 ? 's' : ''}). Plus je te connais, mieux je te coache.` }]); setTimeout(scrollToBottom, 60) }} />
                ) : m.whyCard ? (
                  <WhyValidateCard text={m.whyCard.text} superseded={m.whyCard.superseded} done={m.whyCard.done} onValidate={() => validateWhyCard(i, m.whyCard!.text)} />
                ) : m.text === '' ? (
                  <TypingDots />
                ) : (
                  <div className="flex w-full flex-col gap-2.5 text-lg leading-[1.65] text-foreground lg:text-sm">
                    {frText(m.text).split(/\n{2,}/).map((para, j) => (
                      <p key={j} className="whitespace-pre-line">{para}</p>
                    ))}
                  </div>
                )}
                {m.chips && (
                  <div className="flex flex-wrap gap-2">
                    {m.chips.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => sendMsg(c)}
                        className="rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            </div>
          </div>
        )}

        {/* Input fichier caché — partagé mobile (AppComposer) + desktop */}
        <input ref={fileInputRef} type="file" onChange={onPickFile} className="hidden"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,image/*" />

        {/* Composeur DESKTOP — attaché (mobile utilise l'AppComposer flottant, cf. plus bas) */}
        <div className="relative hidden lg:block shrink-0 px-4 py-3 lg:px-6">
          {showScrollBtn && (
            <button
              type="button"
              onClick={goToBottom}
              aria-label="Revenir en bas"
              className="absolute -top-12 left-1/2 -translate-x-1/2 z-10 flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-md hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronDown className="size-4" />
            </button>
          )}
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border bg-surface px-4 py-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Joindre un fichier"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
            >
              <Paperclip className="size-5 stroke-[1.5]" />
            </button>
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submitInput()
                }
              }}
              placeholder="Écris à Atlas…"
              className="flex-1 resize-none overflow-y-auto no-scrollbar bg-transparent text-lg leading-[1.4] text-foreground outline-none placeholder:text-muted-foreground lg:text-sm"
              style={{ maxHeight: 120, paddingTop: 7, paddingBottom: 7 }}
            />
            <button
              type="button"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
            >
              <Mic className="size-5 stroke-[1.5]" />
            </button>
            <button
              type="button"
              onClick={submitInput}
              disabled={streaming || !input.trim()}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              <SendHorizontal className="size-[17px] stroke-[1.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* Composeur MOBILE — flottant fixe (source unique, cf. AppComposer) */}
      <AppComposer
        value={input}
        onChange={setInput}
        onSubmit={submitInput}
        onAttach={() => fileInputRef.current?.click()}
        agentLabel="Atlas"
        disabled={streaming}
      />
      {showScrollBtn && (
        <button
          type="button"
          onClick={goToBottom}
          aria-label="Revenir en bas"
          className="lg:hidden fixed left-1/2 z-[47] flex size-9 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-md active:bg-muted transition-colors"
          style={{ bottom: 'calc(max(14px, env(safe-area-inset-bottom)) + 62px)' }}
        >
          <ChevronDown className="size-4" />
        </button>
      )}

      {/* Sélecteur de destination pour un fichier joint */}
      {pendingFile && (() => {
        const contactish = /\.(csv|txt)$/i.test(pendingFile.name)
        return (
          <div className="fixed inset-0 z-[80] flex flex-col">
            <div className="flex-1 bg-black/40" onClick={() => { if (!uploadingDoc) setPendingFile(null) }} />
            <div className="rounded-t-3xl bg-background pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <div className="mx-auto mb-3 mt-3 h-1 w-10 rounded-full bg-border" />
              <p className="truncate px-5 pb-1 text-sm font-bold text-foreground">« {pendingFile.name} »</p>
              <p className="px-5 pb-3 text-xs text-muted-foreground">Que veux-tu qu&apos;Atlas en fasse ?</p>
              <div className="flex flex-col gap-2 px-5 py-2">
                <button type="button" onClick={routeToDocuments} disabled={uploadingDoc}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left active:bg-muted disabled:opacity-60">
                  <FileText className="size-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">Ranger dans mes documents{!contactish && <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-primary">suggéré</span>}</p>
                    <p className="text-xs text-muted-foreground">Atlas le classe (Présenter / Former / Vendre)</p>
                  </div>
                  {uploadingDoc && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
                </button>
                <button type="button" onClick={routeToContacts} disabled={uploadingDoc}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left active:bg-muted disabled:opacity-60">
                  <Users className="size-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">Importer comme contacts{contactish && <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-primary">suggéré</span>}</p>
                    <p className="text-xs text-muted-foreground">Atlas extrait la liste et dédoublonne</p>
                  </div>
                </button>
                <button type="button" onClick={() => setPendingFile(null)} className="px-4 py-2 text-sm font-medium text-muted-foreground">Annuler</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
