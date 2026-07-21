'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  X,
  Users,
  Sparkles,
  User,
  UsersRound,
  Video,
  Check,
  Loader2,
  Camera,
  Globe,
  Music2,
  CalendarCheck,
  Target,
  Megaphone,
  Radio,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { NovaChat } from '@/components/nova/nova-chat'
import { VideoRecorder } from '@/components/nova/video-recorder'

const NOVA = '#8B5CF6'
const WKEY = 'nova_wizard_v2' // clé sessionStorage de reprise (v2 = purge des états d'avant le nouveau flow)
const CHATKEY = 'nova_chat_v2' // préfixe des conversations sauvegardées (v2 pour ignorer les anciennes)

// Écran 1 — consigne de Nova : cadrer la campagne sur un PRODUIT/SERVICE (les réseaux pénalisent
// le contenu "opportunité/MLM"). Nova réoriente si besoin, puis pose [[OK: …]] quand c'est verrouillé.
const GARDE_FOU = `Règle : s'il parle de mettre en avant son business, son opportunité ou de recruter des partenaires, explique-lui gentiment que les réseaux pénalisent ce type de contenu (portée réduite, risque de blocage) et oriente-le vers un produit ou service concret ; rassure-le que le volume amènera des partenaires de toute façon.`

const PRODUIT_SEED = `Tu es Nova, l'assistante réseaux sociaux d'Atline. On crée une campagne de contenu ensemble.
Ton rôle sur cette étape : aider l'utilisateur à choisir LE produit ou service à mettre en avant.
${GARDE_FOU}
Style : chaleureux, tutoiement, phrases courtes, une question à la fois, sans jargon.
Commence : présente-toi en une phrase courte et demande quel produit ou service il veut mettre en avant.
Quand le produit ou service est clair et confirmé, termine par ce marqueur exact sur une nouvelle ligne : [[OK: <le produit ou service en quelques mots>]]`

const editSeed = (produit: string) => `Tu es Nova, l'assistante réseaux sociaux d'Atline. On modifie une campagne existante.
Cette campagne met déjà en avant : « ${produit} ».
Salue en une phrase courte, rappelle ce produit, et demande si l'utilisateur veut le changer ou continuer tel quel.
${GARDE_FOU}
Termine ton message par ce marqueur exact sur une nouvelle ligne pour permettre de continuer : [[OK: ${produit}]]
Si l'utilisateur donne un nouveau produit, confirme-le et termine par [[OK: le nouveau produit]].`

// Écran 2 — Cible : Nova aide à décrire à qui s'adresse le produit.
const cibleSeed = (produit: string, existante: string) =>
  existante
    ? `Tu es Nova, l'assistante réseaux sociaux d'Atline. On affine la CIBLE d'une campagne qui met en avant « ${produit} ».
La cible actuelle est : « ${existante} ».
Salue court, rappelle-la, et demande si on la garde ou on l'ajuste. Tutoiement, phrases courtes.
Termine ton message par ce marqueur exact sur une nouvelle ligne : [[OK: ${existante}]]
Si l'utilisateur la précise, confirme et termine par [[OK: la nouvelle cible en une phrase]].`
    : `Tu es Nova, l'assistante réseaux sociaux d'Atline. La campagne met en avant « ${produit} ».
Aide l'utilisateur à décrire la CIBLE idéale : à qui s'adresse ce produit et ce qu'elle recherche.
Style : chaleureux, tutoiement, phrases courtes, une question à la fois, sans jargon. Pose 1 à 2 questions max pour cerner la personne.
Quand la cible est claire, résume-la en une phrase et termine par ce marqueur exact sur une nouvelle ligne : [[OK: <la cible en une phrase>]]`

// Écran Conversion (BOFU) : Nova rédige le contenu qui invite à la réunion, puis on l'affine.
// Écran Nourrir (MOFU) : contenu éducatif/valeur qui installe la confiance (entre attirer et l'invitation).
const nourriSeed = (produit: string, cible: string) =>
  `Tu es Nova, l'assistante réseaux sociaux d'Atline. On crée un contenu pour NOURRIR (milieu de tunnel) : un post éducatif / de valeur qui installe la CONFIANCE, sans rien vendre ni inviter à la réunion (ça viendra après).
Produit : « ${produit || 'non précisé'} » ; cible : « ${cible || 'non précisée'} ».
Choisis UN angle qui rassure et apporte de la valeur (ex. « les 3 erreurs à éviter », une coulisse, un mythe démonté, une preuve/résultat, un conseil actionnable). Donne :
1. LE TEXTE du post (accroche + valeur concrète + légende) ;
2. LE SCRIPT (ce qu'il dit/montre étape par étape) ;
3. Des CONSEILS de scénario (plan, rythme, durée).
Pas d'appel à la réunion ici : le but est de gagner la confiance. Style chaleureux, tutoiement, concret. Termine TOUJOURS ton message par ce marqueur exact sur une nouvelle ligne, contenant UNIQUEMENT le texte du post : [[OK: le texte du post]] — il fait apparaître les boutons pour créer la vidéo. NE demande PAS quel outil il préfère ; il pourra te dire s'il veut ajuster.`

// Écran Invitation (finalité du MOFU) : le post qui donne envie de S'INSCRIRE à la réunion (PAS de vente — la vente se fait en live dans la réunion).
const inviteSeed = (produit: string, cible: string, reunion: string, existant: string) =>
  `Tu es Nova, l'assistante réseaux sociaux d'Atline. On crée l'INVITATION à la réunion : le post court (Reel/TikTok) qui donne envie de s'y inscrire. C'est la FINALITÉ du nourrissage — pas de vente, juste l'invitation à venir.
Contexte — produit : « ${produit || 'non précisé'} » ; cible : « ${cible || 'non précisée'} » ; réunion : ${reunion}.
${existant ? `Un brouillon existe déjà :\n« ${existant} »\nRappelle-le, demande ce qu'on ajuste, et propose une version améliorée.` : "Propose UN brouillon : une accroche forte + 2-3 lignes qui donnent envie + un appel à l'action clair pour s'inscrire à la réunion (ex. « commente RDV » ou « lien en bio »). Court, parlé, sans jargon."}
Présente le brouillon. Tutoiement, chaleureux. Termine TOUJOURS ton message par ce marqueur exact sur une nouvelle ligne, contenant UNIQUEMENT le texte final du post : [[OK: le texte final du post]] — il fait apparaître les boutons pour créer la vidéo. NE demande PAS quel outil il préfère ; il pourra te dire s'il veut ajuster.`

// Écran Publication (attirer) : Nova rédige une publication inspirée d'une tendance repérée par le Radar.
const pubSeed = (produit: string, cible: string, trend?: Trend, visual?: string, transcript?: string) =>
  `Tu es Nova, l'assistante réseaux sociaux d'Atline. On crée une publication pour ATTIRER (haut de tunnel), inspirée d'un format qui cartonne dans la niche.
Format viral dont on s'inspire (la RECETTE, JAMAIS le contenu à l'identique) : « ${trend?.hook || 'un format performant de la niche'} »${trend?.views ? ` (${trend.views} vues sur ${trend.platform})` : ''}.${visual ? `\nCe que montre la miniature de cette vidéo virale (reprends ce type d'accroche visuelle, texte à l'écran et cadrage) : ${visual}` : ''}${transcript ? `\nCE QUI EST DIT dans la vidéo virale (transcript — analyse la structure : accroche des 3 premières secondes, déroulé, appel à l'action ; réutilise la MÉCANIQUE, jamais les mots à l'identique) : « ${transcript} »` : ''}
Produit à mettre en avant : « ${produit || 'non précisé'} » ; cible : « ${cible || 'non précisée'} ».
Donne à l'utilisateur, clairement structuré :
1. LE TEXTE de la publication (accroche + corps + légende), adapté à sa cible et son produit ;
2. LE SCRIPT (ce qu'il dit ou montre à l'écran, étape par étape) ;
3. Des CONSEILS de scénario (comment filmer : plan, rythme, durée, ce qui rend ce format efficace).
Reprends la structure/accroche/rythme du format viral, mais avec SON produit — jamais une copie.
Style chaleureux, tutoiement, concret. Termine TOUJOURS ton message par ce marqueur exact sur une nouvelle ligne, contenant UNIQUEMENT le texte de la publication : [[OK: le texte de la publication]] — il fait apparaître les boutons pour créer la vidéo. NE demande PAS quel outil il préfère ; il pourra te dire s'il veut ajuster.`

// Flow campagne complet, noms courts. Canaux en 3 (conditionne Radar/profil/contenu), Publication en 5 (après Radar).
// 3 phases claires : CADRER (le fond) · CRÉER (le contenu du tunnel, d'un seul tenant) · LANCER.
const STEPS = ['Produit', 'Cible', 'Canaux', 'Radar', 'Publication', 'Nourrir', 'Réunion', 'Invitation', 'Récap']
const PHASE_OF = (s: number) => (s <= 2 ? 'Cadrer' : s <= 7 ? 'Créer' : 'Lancer')

// Écrans en conversation avec Nova (les autres = formulaires).
// 0 Description · 1 Cible · 4 Publication (attirer, inspiré du Radar) · 6 Conversion (BOFU).
const CHAT_STEPS = [0, 1, 4, 5, 7]

// Prompts par écran (modèle + paramètres définis en admin). Clé de prompt par étape chat.
type NovaPromptCfg = { prompt: string; model: string; temperature: number; maxTokens: number }
const STEP_PROMPT_KEY: Record<number, string> = { 0: 'description', 1: 'cible', 4: 'publication', 5: 'nourrir', 7: 'invitation' }
const fillTpl = (tpl: string, vars: Record<string, string>) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')

type Platform = 'INSTAGRAM' | 'TIKTOK' | 'FACEBOOK'
type Trend = { platform: string; hook: string; views: number; likes?: number; url?: string; author?: string; cover?: string }

const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export default function CampagnePage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [campaignId, setCampaignId] = useState<string | null>(null)

  // Écran 1 — Produit/service à mettre en avant (chat avec Nova).
  const [productName, setProductName] = useState('')

  // Écran 2 — Persona
  const [who, setWho] = useState('')
  const [pain, setPain] = useState('')
  const [desire, setDesire] = useState('')

  // Écran 3 — La réunion
  // Réunion : plus de choix de format par l'utilisateur. Il configure sa session de GROUPE (visio récurrente)
  // et autorise (ou non) le tête-à-tête à la demande. Le PROSPECT choisit à l'inscription (booking, à venir).
  const [allowOneOnOne, setAllowOneOnOne] = useState(true)
  const [offerPitch, setOfferPitch] = useState('')
  const [day, setDay] = useState('Mardi')
  const [time, setTime] = useState('19:00')
  const [link, setLink] = useState('')

  // Canaux
  const [channels, setChannels] = useState<Platform[]>(['INSTAGRAM', 'TIKTOK'])

  // Invitation (finalité MOFU) — contenu qui invite à la réunion, sauvé en ContentPost
  const [bofu, setBofu] = useState('')
  const [bofuPostId, setBofuPostId] = useState<string | null>(null)
  const [recorderOpen, setRecorderOpen] = useState(false) // enregistreur vidéo Face
  const [videoSteps, setVideoSteps] = useState<Set<number>>(new Set()) // étapes dont le contenu a déjà une vidéo
  const [videoNonce, setVideoNonce] = useState(0) // anti-cache pour revoir une vidéo refaite
  const [genVideo, setGenVideo] = useState(false) // génération vidéo IA en cours (overlay de progression)

  // Vidéo faceless générée par l'IA : script → service → sauvée sur le ContentPost (comme la vidéo filmée).
  async function generateAIVideo() {
    if (genVideo) return
    const script = step === 4 ? pubText : step === 5 ? nourri : bofu
    if (!script.trim()) {
      toast.error("Le texte n'est pas encore prêt")
      return
    }
    const postId = step === 4 ? pubPostId : step === 5 ? nourriPostId : bofuPostId
    const role = step === 4 ? 'Attirer' : step === 5 ? 'Nourrir' : 'Invitation'
    setGenVideo(true)
    try {
      const r = await fetch('/api/nova/content/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, postId, script, platform: channels[0], role }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d?.postId) {
        toast.error('La génération a échoué, réessaie')
        return
      }
      if (step === 4) setPubPostId(d.postId)
      else if (step === 5) setNourriPostId(d.postId)
      else setBofuPostId(d.postId)
      setVideoSteps((v) => new Set(v).add(step))
      setVideoNonce((n) => n + 1)
      toast.success('Ta vidéo est prête ✨')
    } catch {
      toast.error('Service vidéo indisponible')
    } finally {
      setGenVideo(false)
    }
  }

  // Prompts éditables en admin (accroches + règles de contenu), fallback intégré
  const [hookPrompt, setHookPrompt] = useState(
    "Propose-moi 8 accroches courtes et percutantes pour ce contenu, faites pour GÉNÉRER DES LEADS (donner envie de commenter ou d'écrire en DM), pas juste des vues. Inspire-toi des formats qui cartonnent dans la niche. Numérote-les.",
  )
  const [contentRules, setContentRules] = useState(
    "Règles de contenu : ne nomme JAMAIS la société ni la marque MLM (ex. Herbalife). Mets en avant le PRODUIT / le bénéfice concret, jamais l'opportunité ni le recrutement. Attirer et créer la confiance, pas vendre. Ton chaleureux, tutoiement, français.",
  )
  // Prompts par écran (chacun avec son modèle + paramètres) définis en admin
  const [novaPrompts, setNovaPrompts] = useState<Record<string, NovaPromptCfg>>({})
  useEffect(() => {
    fetch('/api/nova/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.hookPrompt) setHookPrompt(d.hookPrompt)
        if (d?.contentPrompt) setContentRules(d.contentPrompt)
        if (d?.prompts) setNovaPrompts(d.prompts)
      })
      .catch(() => {})
  }, [])

  // Écran Radar — tendances trouvées par n8n/Apify (null = en cours, [] = rien, [..] = résultats)
  const [radarTrends, setRadarTrends] = useState<Trend[] | null>(null)
  const radarFired = useRef(false)
  const [selectedTrend, setSelectedTrend] = useState(0) // index de la tendance dont Nova s'inspire

  // Nova « regarde ET écoute » la tendance choisie : VISION (miniature) + TRANSCRIPT (audio réel).
  // visualReady gate le chat Publication le temps de l'analyse (ou immédiat si pas de tendance).
  const [visualAnalysis, setVisualAnalysis] = useState('')
  const [trendTranscript, setTrendTranscript] = useState('')
  const [visualReady, setVisualReady] = useState(false)
  const visualFor = useRef<string>('') // clé campagne+index déjà analysée
  useEffect(() => {
    if (step !== 4) return
    const trend = radarTrends?.[selectedTrend]
    if (!campaignId || !trend?.url) {
      setVisualReady(true)
      return
    }
    const key = `${campaignId}:${selectedTrend}`
    if (visualFor.current === key) return
    visualFor.current = key
    setVisualReady(false)
    fetch(`/api/nova/campaigns/${campaignId}/trend-analysis?i=${selectedTrend}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setVisualAnalysis(d?.visual || '')
        setTrendTranscript(d?.transcript || '')
      })
      .catch(() => {})
      .finally(() => setVisualReady(true))
  }, [step, campaignId, selectedTrend, radarTrends])

  // Écran Publication (attirer) — texte rédigé par Nova depuis la tendance choisie, sauvé en ContentPost
  const [pubText, setPubText] = useState('')
  const [pubPostId, setPubPostId] = useState<string | null>(null)

  // Écran Nourrir (MOFU) — contenu éducatif/valeur qui installe la confiance
  const [nourri, setNourri] = useState('')
  const [nourriPostId, setNourriPostId] = useState<string | null>(null)

  // Mode édition : ?id=… → charge la campagne et préremplit tout (les PATCH ciblent l'existant).
  const [loadedStatus, setLoadedStatus] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [loaded, setLoaded] = useState(false) // le chat écran 1 n'apparaît qu'une fois la campagne connue
  const [forId, setForId] = useState('') // clé de persistance : 'new' ou l'id édité

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    const fid = id || 'new'
    setForId(fid)
    if (id) setEditing(true)

    // 0) « Nouvelle campagne » explicite (?fresh=1) → on repart PROPRE (aucune restauration de brouillon),
    // puis on retire le paramètre pour qu'un simple refresh restaure ensuite normalement.
    if (params.get('fresh')) {
      try {
        sessionStorage.removeItem(WKEY)
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const k = sessionStorage.key(i)
          if (k && k.startsWith(CHATKEY)) sessionStorage.removeItem(k)
        }
      } catch {}
      window.history.replaceState(null, '', '/nova/campagne')
      setLoaded(true)
      return
    }

    // 1) Reprise après refresh : on restaure l'état en cours (étape + champs) s'il colle au contexte.
    try {
      const raw = sessionStorage.getItem(WKEY)
      const s = raw ? JSON.parse(raw) : null
      if (s && s.forId === fid) {
        setStep(s.step ?? 0)
        setCampaignId(s.campaignId ?? null)
        setLoadedStatus(s.loadedStatus ?? null)
        setProductName(s.productName ?? '')
        setWho(s.who ?? '')
        setPain(s.pain ?? '')
        setDesire(s.desire ?? '')
        if (typeof s.allowOneOnOne === 'boolean') setAllowOneOnOne(s.allowOneOnOne)
        setOfferPitch(s.offerPitch ?? '')
        setDay(s.day ?? 'Mardi')
        setTime(s.time ?? '19:00')
        setLink(s.link ?? '')
        if (Array.isArray(s.channels)) setChannels(s.channels)
        setBofu(s.bofu ?? '')
        setBofuPostId(s.bofuPostId ?? null)
        setPubText(s.pubText ?? '')
        setPubPostId(s.pubPostId ?? null)
        setNourri(s.nourri ?? '')
        setNourriPostId(s.nourriPostId ?? null)
        if (typeof s.selectedTrend === 'number') setSelectedTrend(s.selectedTrend)
        if (Array.isArray(s.videoSteps)) setVideoSteps(new Set(s.videoSteps))
        setLoaded(true)
        return
      }
      if (raw) sessionStorage.removeItem(WKEY) // contexte différent → on repart propre
    } catch {}

    // 2) Pas de reprise : nouvelle campagne, ou chargement d'une campagne à éditer.
    if (!id) {
      setLoaded(true)
      return
    }
    fetch(`/api/nova/campaigns/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const c = d?.campaign
        if (!c) return
        setCampaignId(c.id)
        setLoadedStatus(c.status)
        if (c.name && c.name !== 'Nouvelle campagne') setProductName(c.name)
        const a = c.audience || {}
        setWho(a.who || '')
        setPain(a.pain || '')
        setDesire(a.desire || '')
        if (c.offerPitch) setOfferPitch(c.offerPitch)
        const mc = c.meetingConfig || {}
        if (mc.day) setDay(mc.day)
        if (mc.time) setTime(mc.time)
        if (mc.link) setLink(mc.link)
        if (typeof mc.allowOneOnOne === 'boolean') setAllowOneOnOne(mc.allowOneOnOne)
        if (Array.isArray(c.channels)) setChannels(c.channels.filter((x: string) => ['INSTAGRAM', 'TIKTOK', 'FACEBOOK'].includes(x)) as Platform[])
        if (Array.isArray(c.radarTrends) && c.radarTrends.length) setRadarTrends(c.radarTrends)
        // Restaure les contenus : postId + texte + vidéo déjà générée/filmée (sinon « Revoir ma vidéo » disparaît)
        const vs = new Set<number>()
        for (const p of (d?.posts || []) as { id: string; format: string; mediaUrl: string | null; caption: string | null }[]) {
          if (p.format === 'Attirer') {
            setPubPostId(p.id)
            if (p.caption) setPubText(p.caption)
            if (p.mediaUrl) vs.add(4)
          } else if (p.format === 'Nourrir') {
            setNourriPostId(p.id)
            if (p.caption) setNourri(p.caption)
            if (p.mediaUrl) vs.add(5)
          } else if (p.format === 'Invitation' || p.format === 'Convertir') {
            setBofuPostId(p.id)
            if (p.caption) setBofu(p.caption)
            if (p.mediaUrl) vs.add(7)
          }
        }
        if (vs.size) setVideoSteps(vs)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  // Sauvegarde l'avancement (survit au rafraîchissement)
  useEffect(() => {
    if (!loaded || !forId) return
    try {
      sessionStorage.setItem(
        WKEY,
        JSON.stringify({ forId, step, campaignId, loadedStatus, productName, who, pain, desire, allowOneOnOne, offerPitch, day, time, link, channels, bofu, bofuPostId, pubText, pubPostId, nourri, nourriPostId, selectedTrend, videoSteps: [...videoSteps] }),
      )
    } catch {}
  }, [loaded, forId, step, campaignId, loadedStatus, productName, who, pain, desire, allowOneOnOne, offerPitch, day, time, link, channels, bofu, bofuPostId, pubText, pubPostId, nourri, nourriPostId, selectedTrend, videoSteps])

  function clearPersistence() {
    try {
      sessionStorage.removeItem(WKEY)
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i)
        if (k && k.startsWith(`${CHATKEY}_${forId}_`)) sessionStorage.removeItem(k)
      }
    } catch {}
  }

  // Radar : sur l'écran, on interroge la campagne jusqu'à recevoir les tendances (ou timeout ~90s → []).
  useEffect(() => {
    if (step !== 3 || !campaignId || radarTrends) return
    // Filet de sécurité : si la recherche n'a pas été pré-lancée (arrivée par les flèches, édition…),
    // on la déclenche ici. Le pré-chargement à l'étape Cible reste, pour la rapidité.
    if (!radarFired.current) {
      radarFired.current = true
      fetch(`/api/nova/campaigns/${campaignId}/radar`, { method: 'POST' }).catch(() => {})
    }
    let stop = false
    let tries = 0
    const check = async (): Promise<boolean> => {
      try {
        const r = await fetch(`/api/nova/campaigns/${campaignId}`)
        if (r.ok) {
          const { campaign } = await r.json()
          if (Array.isArray(campaign?.radarTrends) && campaign.radarTrends.length) {
            if (!stop) setRadarTrends(campaign.radarTrends)
            return true
          }
        }
      } catch {}
      return false
    }
    void check()
    const iv = setInterval(async () => {
      tries++
      const found = await check()
      if (found || tries > 38) {
        clearInterval(iv)
        if (!found && !stop) setRadarTrends([])
      }
    }, 4000)
    return () => {
      stop = true
      clearInterval(iv)
    }
  }, [step, campaignId, radarTrends])

  const launched = !!loadedStatus && loadedStatus !== 'BROUILLON'
  const seed = editing && productName ? editSeed(productName) : PRODUIT_SEED

  function toggleChannel(p: Platform) {
    setChannels((c) => (c.includes(p) ? c.filter((x) => x !== p) : [...c, p]))
  }

  async function persist(): Promise<boolean> {
    setSaving(true)
    try {
      if (step === 0) {
        if (!productName) {
          toast.error('Dis à Nova quel produit tu veux mettre en avant')
          return false
        }
        if (!campaignId) {
          const res = await fetch('/api/nova/campaigns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal: 'CLIENTS' }), // campagne produit ; champ conservé côté modèle
          })
          if (!res.ok) throw new Error()
          const { campaign } = await res.json()
          setCampaignId(campaign.id)
          await fetch(`/api/nova/campaigns/${campaign.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: productName }),
          })
        } else {
          await patch({ name: productName })
        }
        return true
      }
      if (!campaignId) return true
      if (step === 1) {
        await patch({ audience: { who, pain, desire } })
      } else if (step === 2) {
        if (channels.length === 0) {
          toast.error('Choisis au moins un réseau')
          return false
        }
        await patch({ channels })
      } else if (step === 4) {
        // Publication (attirer) : crée/met à jour le ContentPost inspiré de la tendance
        if (pubText) {
          const res = await fetch('/api/nova/content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignId, postId: pubPostId, caption: pubText, platform: channels[0], role: 'Attirer' }),
          })
          if (res.ok) {
            const { post } = await res.json()
            if (post?.id) setPubPostId(post.id)
          }
        }
      } else if (step === 5) {
        // Nourrir (MOFU) : crée/met à jour le contenu de valeur (ContentPost)
        if (nourri) {
          const res = await fetch('/api/nova/content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignId, postId: nourriPostId, caption: nourri, platform: channels[0], role: 'Nourrir' }),
          })
          if (res.ok) {
            const { post } = await res.json()
            if (post?.id) setNourriPostId(post.id)
          }
        }
      } else if (step === 6) {
        if (!link.trim() && !allowOneOnOne) {
          toast.error('Ajoute le lien de ta session de groupe (ou autorise le tête-à-tête)')
          return false
        }
        // Format fixe = GROUPE (offre principale) ; le prospect choisira à l'inscription.
        await patch({ meetingFormat: 'GROUPE', offerPitch, meetingConfig: { day, time, link, allowOneOnOne } })
      } else if (step === 7) {
        // Invitation (finalité MOFU) : le post qui invite à la réunion (ContentPost)
        if (bofu) {
          const res = await fetch('/api/nova/content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignId, postId: bofuPostId, caption: bofu, platform: channels[0], role: 'Invitation' }),
          })
          if (res.ok) {
            const { post } = await res.json()
            if (post?.id) setBofuPostId(post.id)
          }
        }
      }
      return true
    } catch {
      toast.error('Enregistrement impossible, réessaie')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function patch(data: Record<string, unknown>) {
    const res = await fetch(`/api/nova/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error()
  }

  async function next() {
    if (step < STEPS.length - 1) {
      const ok = await persist()
      if (!ok) return
    }
    // Pré-chargement Radar : dès qu'on quitte la Cible, on lance la recherche en arrière-plan
    // pour que ce soit prêt quand on arrive à l'écran Radar (2 étapes plus loin).
    if (step === 1 && campaignId && !radarFired.current) {
      radarFired.current = true
      fetch(`/api/nova/campaigns/${campaignId}/radar`, { method: 'POST' }).catch(() => {})
    }
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
      return
    }
    // Récap → lancer (nouvelle) ou enregistrer (édition d'une campagne déjà lancée)
    setSaving(true)
    try {
      await patch({ status: launched ? loadedStatus : 'ACTIVE' })
      clearPersistence()
      toast.success(launched ? 'Campagne mise à jour' : 'Campagne lancée')
      router.push('/nova')
    } catch {
      toast.error('Enregistrement impossible, réessaie')
    } finally {
      setSaving(false)
    }
  }

  function exit() {
    router.push('/nova')
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Header + progress */}
      <header
        className="sticky top-0 z-30 bg-background/90 px-4 py-3 backdrop-blur"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={exit}
            aria-label="Fermer"
            className="-ml-1 flex size-9 items-center justify-center rounded-full text-fg-2 active:bg-muted"
          >
            <X className="size-5" />
          </button>
          <span className="text-xs font-semibold text-muted-foreground">
            {step + 1} / {STEPS.length}
          </span>
        </div>
        <div className="mt-3 flex gap-1.5">
          {STEPS.map((label, i) => (
            <button
              key={i}
              type="button"
              // En édition : chaque segment est cliquable → on saute direct à l'étape à modifier.
              onClick={editing ? () => setStep(i) : undefined}
              disabled={!editing}
              aria-label={label}
              className={cn('h-1.5 flex-1 rounded-full transition-colors', editing && 'cursor-pointer')}
              style={{ background: i <= step ? NOVA : 'var(--border)' }}
            />
          ))}
        </div>
        {/* Phase (Cadrer/Créer/Lancer) + nom de l'étape = le titre ; les flèches naviguent */}
        <p className="mt-3 text-center text-2xs font-bold uppercase tracking-[0.14em]" style={{ color: NOVA }}>
          {PHASE_OF(step)}
        </p>
        <div className="mt-1 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            aria-label="Étape précédente"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground active:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="min-w-[150px] text-center font-display text-lg font-bold text-foreground">{STEPS[step]}</h1>
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            disabled={step === STEPS.length - 1}
            aria-label="Étape suivante"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground active:bg-muted disabled:opacity-30"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </header>

      {CHAT_STEPS.includes(step) ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {step === 4 && !visualReady ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-full" style={{ background: `${NOVA}1a`, color: NOVA }}>
                <Loader2 className="size-6 animate-spin" />
              </span>
              <p className="text-sm font-semibold text-foreground">Nova regarde et écoute la vidéo virale…</p>
              <p className="max-w-xs text-xs text-muted-foreground">Elle analyse la miniature et transcrit l&apos;audio pour s&apos;inspirer de la vraie accroche. Ça prend quelques secondes.</p>
            </div>
          ) : loaded && forId ? (
            <NovaChat
              key={`${step}-${editing ? 'e' : 'n'}`}
              seed={(() => {
                const cfg = novaPrompts[STEP_PROMPT_KEY[step]]
                const reunion = `une session de groupe en visio${day && time ? ` (${day} à ${time})` : ''}${
                  allowOneOnOne ? ', avec la possibilité d’un tête-à-tête pour ceux qui préfèrent' : ''
                } — le prospect choisit à l’inscription${offerPitch ? ` — « ${offerPitch} »` : ''}`
                const trend = radarTrends?.[selectedTrend]
                const trendStr = trend
                  ? `${trend.hook}${trend.views ? ` (${trend.views.toLocaleString('fr-FR')} vues)` : ''}`
                  : ''
                const visual = step === 4 ? visualAnalysis : ''
                const transcript = step === 4 ? trendTranscript : ''
                // Template admin prioritaire ; sinon fallback sur les seeds intégrés
                const body = cfg?.prompt
                  ? fillTpl(cfg.prompt, { produit: productName, cible: who, audience: who, trend: trendStr, reunion, visual, transcript })
                  : step === 0
                    ? seed
                    : step === 1
                      ? cibleSeed(productName, who)
                      : step === 4
                        ? pubSeed(productName, who, trend, visual, transcript)
                        : step === 5
                          ? nourriSeed(productName, who)
                          : inviteSeed(productName, who, reunion, bofu)
                const isContent = step === 4 || step === 5 || step === 7
                return isContent ? `${contentRules}\n\n${body}` : body
              })()}
              model={novaPrompts[STEP_PROMPT_KEY[step]]?.model}
              temperature={novaPrompts[STEP_PROMPT_KEY[step]]?.temperature}
              maxTokens={novaPrompts[STEP_PROMPT_KEY[step]]?.maxTokens}
              onCapture={
                step === 0 ? setProductName : step === 1 ? setWho : step === 4 ? setPubText : step === 5 ? setNourri : setBofu
              }
              chipLabel={`Configurer : ${STEPS[step + 1]}`}
              onChip={next}
              extras={
                step === 4 || step === 5 || step === 7
                  ? [
                      { label: videoSteps.has(step) ? 'Revoir ma vidéo' : 'Me filmer', onClick: () => setRecorderOpen(true) },
                      { label: videoSteps.has(step) ? "Regénérer par l'IA" : "Vidéo générée par l'IA", onClick: generateAIVideo },
                    ]
                  : undefined
              }
              quickReplies={
                step === 4 || step === 5 || step === 7
                  ? [{ label: 'Générateur d’accroches', message: hookPrompt }]
                  : undefined
              }
              storageKey={`${CHATKEY}_${forId}_${step}`}
            />
          ) : null}
        </div>
      ) : (
        <>
      <div className="flex-1 overflow-y-auto px-4 py-5 pb-32">
        {/* Écran 4 — Radar : aperçu des tendances de la niche (démo ; Apify branché plus tard) */}
        {step === 3 && (
          <Step title="" subtitle="">
            {radarTrends === null ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <span
                  className="flex size-12 items-center justify-center rounded-full"
                  style={{ background: `${NOVA}1a`, color: NOVA }}
                >
                  <Loader2 className="size-6 animate-spin" />
                </span>
                <p className="text-sm font-semibold text-foreground">Nova cherche ce qui cartonne…</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Elle analyse les vidéos les plus vues de ta niche sur TikTok. Quelques secondes.
                </p>
              </div>
            ) : radarTrends.length ? (
              <>
                <p className="text-sm text-muted-foreground text-pretty">
                  Choisis le format dont Nova va s&apos;inspirer pour ta publication.
                </p>
                <div className="flex flex-col gap-3">
                  {radarTrends.map((t, i) => (
                    <TrendCard
                      key={i}
                      trend={t}
                      selected={selectedTrend === i}
                      onSelect={() => setSelectedTrend(i)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <span
                  className="flex size-12 items-center justify-center rounded-full"
                  style={{ background: `${NOVA}1a`, color: NOVA }}
                >
                  <Sparkles className="size-6" />
                </span>
                <p className="text-sm font-semibold text-foreground">Pas de tendances pour l&apos;instant</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  On continue — Nova s&apos;inspirera quand même des bonnes pratiques de ta niche.
                </p>
              </div>
            )}
          </Step>
        )}

        {/* Écran 5 — La réunion */}
        {step === 6 && (
          <Step
            title="Ta session de groupe"
            subtitle="Tu proposes une visio de groupe. À l'inscription, le prospect choisit d'y venir ou de demander un tête-à-tête."
          >
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
                <p className="eyebrow flex items-center gap-1.5">
                  <UsersRound className="size-3.5" style={{ color: NOVA }} />
                  Session de groupe récurrente
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-xs font-semibold text-fg-2">
                    Jour
                    <select
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal text-foreground outline-none"
                    >
                      {WEEKDAYS.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-fg-2">
                    Heure
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal text-foreground outline-none"
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1 text-xs font-semibold text-fg-2">
                  Lien de la visio
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                    <Video className="size-4 shrink-0 text-muted-foreground" />
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      placeholder="https://zoom.us/j/…"
                      className="w-full bg-transparent text-sm font-normal text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </label>
              </div>

              {/* Le prospect choisit à l'inscription : on autorise (ou non) le tête-à-tête à la demande */}
              <button
                type="button"
                onClick={() => setAllowOneOnOne((v) => !v)}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 text-left"
              >
                <span className="flex items-center gap-2.5">
                  <User className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">Autoriser aussi le tête-à-tête</span>
                    <span className="text-xs text-muted-foreground">Le prospect pourra demander un appel perso plutôt que le groupe.</span>
                  </span>
                </span>
                <span
                  className="relative h-6 w-10 shrink-0 rounded-full transition-colors"
                  style={{ background: allowOneOnOne ? NOVA : 'var(--border)' }}
                >
                  <span
                    className="absolute top-0.5 size-5 rounded-full bg-white transition-all"
                    style={{ left: allowOneOnOne ? '18px' : '2px' }}
                  />
                </span>
              </button>

              <div>
                <p className="eyebrow mb-2">Ton invitation à la réunion</p>
                <textarea
                  value={offerPitch}
                  onChange={(e) => setOfferPitch(e.target.value)}
                  rows={4}
                  placeholder="En une phrase : pourquoi ça vaut le coup de venir ? Ex. « 30 min pour voir comment lancer une activité qui te ressemble, sans quitter ton job. »"
                  className="w-full resize-none rounded-2xl border border-border bg-surface p-4 text-sm outline-none focus:ring-2"
                  style={{ ['--tw-ring-color' as string]: NOVA }}
                />
              </div>
            </div>
          </Step>
        )}

        {/* Écran 4 — Canaux */}
        {step === 2 && (
          <Step
            title="Où veux-tu publier ?"
            subtitle="Instagram capte les leads, TikTok apporte la portée. Nova surveillera les tendances sur tes réseaux."
          >
            <div className="flex flex-col gap-3">
              <ChannelCard
                active={channels.includes('INSTAGRAM')}
                onClick={() => toggleChannel('INSTAGRAM')}
                icon={Camera}
                title="Instagram"
                desc="Le moteur de capture : Reels, DM, messages depuis les commentaires."
              />
              <ChannelCard
                active={channels.includes('TIKTOK')}
                onClick={() => toggleChannel('TIKTOK')}
                icon={Music2}
                title="TikTok"
                desc="Le moteur de portée : audience froide, viralité. Renvoie vers ton Instagram."
              />
              <ChannelCard
                active={channels.includes('FACEBOOK')}
                onClick={() => toggleChannel('FACEBOOK')}
                icon={Globe}
                title="Facebook"
                desc="Utile surtout pour une audience plus âgée ou locale."
                optional
              />
            </div>
          </Step>
        )}

        {/* Écran 8 — Récap (Lancer) */}
        {step === 8 && (
          <Step title="Prêt à lancer ?" subtitle="Vérifie, puis lance. Tout reste modifiable ensuite.">
            <div className="flex flex-col gap-2.5">
              <RecapRow icon={Target} label="Produit" value={productName || 'Non précisé'} />
              <RecapRow icon={Users} label="Cible" value={who || 'Non précisée'} />
              <RecapRow
                icon={Radio}
                label="Canaux"
                value={
                  channels
                    .map((c) => (c === 'INSTAGRAM' ? 'Instagram' : c === 'TIKTOK' ? 'TikTok' : 'Facebook'))
                    .join(' · ') || '—'
                }
              />
              <RecapRow
                icon={CalendarCheck}
                label="Réunion"
                value={`Groupe — ${day} à ${time}${allowOneOnOne ? ' (+ tête-à-tête)' : ''}`}
              />
              <RecapRow
                icon={Video}
                label="Contenus prêts"
                value={
                  [pubText && 'Publication', nourri && 'Nourrir', bofu && 'Invitation'].filter(Boolean).join(' · ') ||
                  'Aucun pour l’instant'
                }
              />
            </div>
            <div
              className="flex items-start gap-2.5 rounded-2xl border p-3.5"
              style={{ borderColor: `${NOVA}45`, background: `${NOVA}0f` }}
            >
              <Megaphone className="mt-0.5 size-4 shrink-0" style={{ color: NOVA }} />
              <p className="text-xs text-muted-foreground">
                En lançant, ta campagne passe en Active. Tu retrouves tes contenus et tes vidéos dans Nova.
              </p>
            </div>
          </Step>
        )}
      </div>

      {/* Bouton fixe */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-4 backdrop-blur lg:left-60"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={next}
          disabled={saving}
          className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
          style={{ background: NOVA }}
        >
          {saving
            ? 'Enregistrement…'
            : step === STEPS.length - 1
              ? launched
                ? 'Enregistrer'
                : 'Lancer la campagne'
              : 'Continuer'}
        </button>
      </div>
        </>
      )}

      <VideoRecorder
        open={recorderOpen}
        onClose={() => setRecorderOpen(false)}
        script={step === 4 ? pubText : step === 5 ? nourri : bofu}
        campaignId={campaignId}
        postId={step === 4 ? pubPostId : step === 5 ? nourriPostId : bofuPostId}
        platform={channels[0]}
        existingUrl={
          videoSteps.has(step)
            ? `/api/nova/content/${step === 4 ? pubPostId : step === 5 ? nourriPostId : bofuPostId}/video?t=${videoNonce}`
            : undefined
        }
        onSaved={(pid) => {
          if (step === 4) setPubPostId(pid)
          else if (step === 5) setNourriPostId(pid)
          else setBofuPostId(pid)
          setVideoSteps((v) => new Set(v).add(step))
          setVideoNonce((n) => n + 1)
        }}
      />

      {/* Overlay de génération vidéo IA (~30 s : images + voix off + sous-titres + montage) */}
      {genVideo && (
        <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-background/95 px-8 text-center backdrop-blur-sm">
          <span className="flex size-14 items-center justify-center rounded-full" style={{ background: `${NOVA}1a`, color: NOVA }}>
            <Loader2 className="size-7 animate-spin" />
          </span>
          <p className="text-lg font-semibold text-foreground">Nova crée ta vidéo…</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Elle génère les visuels, la voix off et les sous-titres, puis monte le tout. Ça prend une trentaine de secondes.
          </p>
        </div>
      )}
    </div>
  )
}

// Le titre/sous-titre vit désormais dans le header (une seule source). Step ne garde que la mise en page.
function Step({ children }: { title?: string; subtitle?: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>
}

function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} M`
  if (n >= 1_000) return `${Math.round(n / 1_000)} k`
  return String(n || 0)
}

// Carte d'une tendance repérée par le Radar (donnée réelle Apify/TikTok) — sélectionnable.
function TrendCard({ trend, selected, onSelect }: { trend: Trend; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'rounded-2xl border bg-surface p-4 text-left shadow-card transition-colors',
        selected ? 'border-transparent' : 'border-border active:bg-muted',
      )}
      style={selected ? { borderColor: NOVA, boxShadow: `0 0 0 1px ${NOVA}` } : undefined}
    >
      <div className="flex items-center gap-2">
        <span className="rounded-full px-2 py-0.5 text-2xs font-semibold" style={{ background: `${NOVA}1a`, color: NOVA }}>
          {trend.platform}
        </span>
        <span className="ml-auto shrink-0 text-xs font-semibold text-muted-foreground">{formatViews(trend.views)} vues</span>
        {selected && <Check className="size-4 shrink-0" style={{ color: NOVA }} />}
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm text-foreground">{trend.hook || '—'}</p>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        {trend.author && <span>@{trend.author}</span>}
        {trend.url && (
          <a
            href={trend.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="ml-auto font-semibold"
            style={{ color: NOVA }}
          >
            Voir ↗
          </a>
        )}
      </div>
    </button>
  )
}

function ChannelCard({
  active,
  onClick,
  icon: Icon,
  title,
  desc,
  optional,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Camera
  title: string
  desc: string
  optional?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-2xl border bg-surface p-4 text-left shadow-card transition-colors',
        active ? 'border-transparent' : 'border-border active:bg-muted',
      )}
      style={active ? { borderColor: NOVA, boxShadow: `0 0 0 1px ${NOVA}` } : undefined}
    >
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${NOVA}1a`, color: NOVA }}
      >
        <Icon className="size-5 stroke-[1.5]" />
      </span>
      <span className="flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{title}</span>
          {optional && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-2xs font-semibold text-muted-foreground">
              Optionnel
            </span>
          )}
        </span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      {active && <Check className="size-5" style={{ color: NOVA }} />}
    </button>
  )
}

function RecapRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${NOVA}1a`, color: NOVA }}
      >
        <Icon className="size-4 stroke-[1.5]" />
      </span>
      <div className="flex-1">
        <p className="eyebrow">{label}</p>
        <p className="text-sm font-semibold text-foreground line-clamp-2">{value}</p>
      </div>
    </div>
  )
}


