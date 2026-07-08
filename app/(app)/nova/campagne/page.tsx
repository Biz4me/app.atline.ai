'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Sparkles,
  User,
  UsersRound,
  Video,
  CalendarClock,
  Check,
  Camera,
  Globe,
  Music2,
  Wand2,
  Image as ImageIcon,
  AtSign,
  Link2,
  Grid3x3,
  MessageCircle,
  Filter,
  CalendarCheck,
  Handshake,
  RefreshCw,
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
const bofuSeed = (produit: string, cible: string, reunion: string, existant: string) =>
  `Tu es Nova, l'assistante réseaux sociaux d'Atline. On crée le CONTENU DE CONVERSION de la campagne : le post court (Reel/TikTok) qui invite à la réunion.
Contexte — produit : « ${produit || 'non précisé'} » ; cible : « ${cible || 'non précisée'} » ; réunion : ${reunion}.
${existant ? `Un brouillon existe déjà :\n« ${existant} »\nRappelle-le, demande ce qu'on ajuste, et propose une version améliorée.` : "Propose UN brouillon : une accroche forte + 2-3 lignes qui donnent envie + un appel à l'action clair vers la réunion (ex. « commente RDV » ou « lien en bio »). Court, parlé, sans jargon."}
Présente le brouillon, demande si ça lui va ou ce qu'il veut changer (plus court, plus direct, autre angle…). Tutoiement, chaleureux.
Quand l'utilisateur valide, termine ton message par ce marqueur exact sur une nouvelle ligne, contenant UNIQUEMENT le texte final du post : [[OK: le texte final du post]]`

// Flow campagne complet (8 écrans), noms courts. Canaux en 3 : il conditionne Radar/profil/contenu.
const STEPS = ['Description', 'Cible', 'Canaux', 'Radar', 'Réunion', 'Conversion', 'Profil', 'Contenu', 'Parcours', 'Récap']

// Écrans en conversation avec Nova (les autres = formulaires). Conversion (BOFU) = chat aussi.
const CHAT_STEPS = [0, 1, 5]

type Goal = 'CLIENTS' | 'PARTENAIRES'
type MeetingFormat = 'TETE_A_TETE' | 'GROUPE'
type Platform = 'INSTAGRAM' | 'TIKTOK' | 'FACEBOOK'

const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export default function CampagnePage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [campaignId, setCampaignId] = useState<string | null>(null)

  // Écran 1 — Produit/service à mettre en avant (chat avec Nova). Objectif = CLIENTS (produit) pour la phase 1.
  const goal: Goal = 'CLIENTS'
  const [productName, setProductName] = useState('')

  // Écran 2 — Persona
  const [who, setWho] = useState('')
  const [pain, setPain] = useState('')
  const [desire, setDesire] = useState('')

  // Écran 3 — La réunion
  const [meetingFormat, setMeetingFormat] = useState<MeetingFormat | null>(null)
  const [offerPitch, setOfferPitch] = useState('')
  const [day, setDay] = useState('Mardi')
  const [time, setTime] = useState('19:00')
  const [link, setLink] = useState('')

  // Écran 4 — Canaux
  const [channels, setChannels] = useState<Platform[]>(['INSTAGRAM', 'TIKTOK'])

  // Écran 5 — Optimise ton profil (checklist consultative, non persistée)
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  // Écran 6 — Contenu
  const [contentMode, setContentMode] = useState<'FACE' | 'FACELESS'>('FACELESS')
  const [cadence, setCadence] = useState(5)

  // Écran Conversion (BOFU) — contenu de conversion rédigé par Nova, sauvé en ContentPost
  const [bofu, setBofu] = useState('')
  const [bofuPostId, setBofuPostId] = useState<string | null>(null)
  const [recorderOpen, setRecorderOpen] = useState(false) // enregistreur vidéo Face

  // Mode édition : ?id=… → charge la campagne et préremplit tout (les PATCH ciblent l'existant).
  const [loadedStatus, setLoadedStatus] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [loaded, setLoaded] = useState(false) // le chat écran 1 n'apparaît qu'une fois la campagne connue
  const [forId, setForId] = useState('') // clé de persistance : 'new' ou l'id édité

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id')
    const fid = id || 'new'
    setForId(fid)
    if (id) setEditing(true)

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
        if (s.meetingFormat) setMeetingFormat(s.meetingFormat)
        setOfferPitch(s.offerPitch ?? '')
        setDay(s.day ?? 'Mardi')
        setTime(s.time ?? '19:00')
        setLink(s.link ?? '')
        if (Array.isArray(s.channels)) setChannels(s.channels)
        if (s.contentMode) setContentMode(s.contentMode)
        if (typeof s.cadence === 'number') setCadence(s.cadence)
        setBofu(s.bofu ?? '')
        setBofuPostId(s.bofuPostId ?? null)
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
        if (c.meetingFormat) setMeetingFormat(c.meetingFormat)
        if (c.offerPitch) setOfferPitch(c.offerPitch)
        const mc = c.meetingConfig || {}
        if (mc.day) setDay(mc.day)
        if (mc.time) setTime(mc.time)
        if (mc.link) setLink(mc.link)
        if (Array.isArray(c.channels)) setChannels(c.channels.filter((x: string) => ['INSTAGRAM', 'TIKTOK', 'FACEBOOK'].includes(x)) as Platform[])
        if (c.contentMode) setContentMode(c.contentMode)
        if (typeof c.cadence === 'number') setCadence(c.cadence)
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
        JSON.stringify({ forId, step, campaignId, loadedStatus, productName, who, pain, desire, meetingFormat, offerPitch, day, time, link, channels, contentMode, cadence, bofu, bofuPostId }),
      )
    } catch {}
  }, [loaded, forId, step, campaignId, loadedStatus, productName, who, pain, desire, meetingFormat, offerPitch, day, time, link, channels, contentMode, cadence, bofu, bofuPostId])

  function clearPersistence() {
    try {
      sessionStorage.removeItem(WKEY)
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i)
        if (k && k.startsWith(`${CHATKEY}_${forId}_`)) sessionStorage.removeItem(k)
      }
    } catch {}
  }

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
            body: JSON.stringify({ goal }),
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
        if (!meetingFormat) {
          toast.error('Choisis un format de réunion')
          return false
        }
        const meetingConfig = meetingFormat === 'GROUPE' ? { day, time, link } : {}
        await patch({ meetingFormat, offerPitch, meetingConfig })
      } else if (step === 5) {
        // BOFU : crée/met à jour le contenu de conversion (ContentPost)
        if (bofu) {
          const res = await fetch('/api/nova/content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignId, postId: bofuPostId, caption: bofu, platform: channels[0] }),
          })
          if (res.ok) {
            const { post } = await res.json()
            if (post?.id) setBofuPostId(post.id)
          }
        }
      } else if (step === 7) {
        await patch({ contentMode, cadence })
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={exit}
            aria-label="Fermer"
            className="-ml-1 flex size-9 items-center justify-center rounded-full text-fg-2 active:bg-muted"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="font-display text-lg font-semibold">
            {loadedStatus ? 'Modifier la campagne' : 'Nouvelle campagne'}
          </h1>
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
        {/* Titre d'étape centré + flèches avant/après */}
        <div className="mt-2 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            aria-label="Étape précédente"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground active:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="min-w-[104px] text-center text-sm font-bold text-foreground">{STEPS[step]}</span>
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
          {loaded && forId && (
            <NovaChat
              key={`${step}-${editing ? 'e' : 'n'}`}
              seed={
                step === 0
                  ? seed
                  : step === 1
                    ? cibleSeed(productName, who)
                    : bofuSeed(
                        productName,
                        who,
                        meetingFormat === 'GROUPE'
                          ? `réunion de groupe${offerPitch ? ` — « ${offerPitch} »` : ''}`
                          : meetingFormat === 'TETE_A_TETE'
                            ? `rendez-vous individuel${offerPitch ? ` — « ${offerPitch} »` : ''}`
                            : 'une réunion (format à préciser)',
                        bofu,
                      )
              }
              onCapture={step === 0 ? setProductName : step === 1 ? setWho : setBofu}
              chipLabel={`Configurer : ${STEPS[step + 1]}`}
              onChip={next}
              extraLabel={step === 5 ? 'Filmer ta vidéo' : undefined}
              onExtra={step === 5 ? () => setRecorderOpen(true) : undefined}
              storageKey={`${CHATKEY}_${forId}_${step}`}
            />
          )}
        </div>
      ) : (
        <>
      <div className="flex-1 overflow-y-auto px-4 py-5 pb-32">
        {/* Écran 4 — Radar : aperçu des tendances de la niche (démo ; Apify branché plus tard) */}
        {step === 3 && (
          <Step
            title="Ce qui cartonne dans ta niche"
            subtitle={`Nova a repéré ces formats qui marchent sur ${channels.map((c) => (c === 'INSTAGRAM' ? 'Instagram' : c === 'TIKTOK' ? 'TikTok' : 'Facebook')).join(' et ') || 'tes réseaux'}. On s'en inspirera pour créer ton contenu.`}
          >
            <div className="flex flex-col gap-3">
              {RADAR_DEMO.map((t) => (
                <TrendCard key={t.title} {...t} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Aperçu — la veille des tendances en temps réel arrive bientôt.
            </p>
          </Step>
        )}

        {/* Écran 5 — La réunion */}
        {step === 4 && (
          <Step
            title="Comment se passe la rencontre ?"
            subtitle="C'est le rendez-vous vers lequel Nova conduit chaque prospect."
          >
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <FormatCard
                  active={meetingFormat === 'TETE_A_TETE'}
                  onClick={() => setMeetingFormat('TETE_A_TETE')}
                  icon={User}
                  title="En tête-à-tête"
                  desc="Le prospect réserve un créneau ; il choisit appel ou visio."
                />
                <FormatCard
                  active={meetingFormat === 'GROUPE'}
                  onClick={() => setMeetingFormat('GROUPE')}
                  icon={UsersRound}
                  title="En groupe"
                  desc="Une visio récurrente ; les prospects s'inscrivent à la session."
                />
              </div>

              {meetingFormat === 'GROUPE' && (
                <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
                  <p className="eyebrow flex items-center gap-1.5">
                    <CalendarClock className="size-3.5" style={{ color: NOVA }} />
                    Session récurrente
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
              )}

              {meetingFormat && (
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
              )}
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

        {/* Écran 5 — Optimise ton profil */}
        {step === 6 && (
          <Step
            title="Prépare tes profils"
            subtitle="Un visiteur qui clique doit comprendre en 3 secondes. Coche au fur et à mesure."
          >
            <div className="flex flex-col gap-2.5">
              {PROFILE_TIPS.map((tip) => (
                <ChecklistItem
                  key={tip.id}
                  icon={tip.icon}
                  title={tip.title}
                  desc={tip.desc}
                  done={!!checked[tip.id]}
                  onToggle={() => setChecked((c) => ({ ...c, [tip.id]: !c[tip.id] }))}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Facultatif — mais ça change tout sur le taux de clic. Tu peux y revenir plus tard.
            </p>
          </Step>
        )}

        {/* Écran 6 — Contenu */}
        {step === 7 && (
          <Step
            title="Comment tu crées ?"
            subtitle="Nova écrit tout. À toi de dire si tu apparais à l'écran ou non."
          >
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <ModeCard
                  active={contentMode === 'FACELESS'}
                  onClick={() => setContentMode('FACELESS')}
                  icon={Wand2}
                  title="Sans te montrer"
                  desc="Nova génère visuels et textes. Publié tout seul, zéro effort."
                  badge="Automatique"
                />
                <ModeCard
                  active={contentMode === 'FACE'}
                  onClick={() => setContentMode('FACE')}
                  icon={Video}
                  title="Face caméra"
                  desc="Nova écrit ton script, tu te filmes. Atlas te rappelle de tourner."
                  badge="Plus de lien"
                />
              </div>

              <div>
                <p className="eyebrow mb-2">Rythme de publication</p>
                <div className="grid grid-cols-3 gap-2">
                  {CADENCES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCadence(c.value)}
                      className={cn(
                        'flex flex-col items-center gap-0.5 rounded-xl border bg-surface py-3 transition-colors',
                        cadence === c.value ? 'border-transparent' : 'border-border active:bg-muted',
                      )}
                      style={
                        cadence === c.value
                          ? { borderColor: NOVA, boxShadow: `0 0 0 1px ${NOVA}` }
                          : undefined
                      }
                    >
                      <span className="text-base font-bold text-foreground">{c.value}</span>
                      <span className="text-[10px] font-semibold text-muted-foreground">{c.label}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">Publications par semaine.</p>
              </div>

              <div>
                <p className="eyebrow mb-2">Ton mix de contenu</p>
                <div className="flex h-2.5 overflow-hidden rounded-full">
                  <span style={{ width: '70%', background: NOVA }} />
                  <span style={{ width: '20%', background: `${NOVA}8c` }} />
                  <span style={{ width: '10%', background: `${NOVA}45` }} />
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  <MixRow op="" label="Attirer" pct="70%" desc="Du contenu qui capte les inconnus." />
                  <MixRow op="8c" label="Nourrir" pct="20%" desc="Tu crées le lien et la confiance." />
                  <MixRow op="45" label="Convertir" pct="10%" desc="Tu invites à la réunion." />
                </div>
              </div>
            </div>
          </Step>
        )}

        {/* Écran 7 — Parcours du lead */}
        {step === 8 && (
          <Step
            title="Ce qui se passe ensuite"
            subtitle="Atlas s'occupe de tout jusqu'à la réunion. Toi, tu animes et tu closes."
          >
            <div className="flex flex-col">
              {JOURNEY.map((s, i) => (
                <JourneyStep key={s.title} {...s} last={i === JOURNEY.length - 1} />
              ))}
            </div>
          </Step>
        )}

        {/* Écran 8 — Récap */}
        {step === 9 && (
          <Step
            title="Prêt à lancer ?"
            subtitle="Vérifie ta campagne. Tu pourras tout modifier ensuite."
          >
            <div className="flex flex-col gap-2.5">
              <RecapRow
                icon={Target}
                label="Objectif"
                value={goal === 'PARTENAIRES' ? 'Recruter des partenaires' : 'Trouver des clients'}
              />
              <RecapRow icon={Users} label="Cible" value={who || 'Non précisée'} />
              <RecapRow
                icon={CalendarCheck}
                label="Réunion"
                value={
                  meetingFormat === 'GROUPE'
                    ? `En groupe — ${day} à ${time}`
                    : meetingFormat === 'TETE_A_TETE'
                      ? 'En tête-à-tête — sur rendez-vous'
                      : 'Non définie'
                }
              />
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
                icon={contentMode === 'FACELESS' ? Wand2 : Video}
                label="Contenu"
                value={`${contentMode === 'FACELESS' ? 'Sans te montrer' : 'Face caméra'} · ${cadence}/sem`}
              />
            </div>
            <div
              className="flex items-start gap-2.5 rounded-2xl border p-3.5"
              style={{ borderColor: `${NOVA}45`, background: `${NOVA}0f` }}
            >
              <Megaphone className="mt-0.5 size-4 shrink-0" style={{ color: NOVA }} />
              <p className="text-xs text-muted-foreground">
                En lançant, Nova commence à produire ton contenu et à publier au rythme choisi. Tu gardes
                la main sur chaque publication.
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
        script={bofu}
        campaignId={campaignId}
        postId={bofuPostId}
        platform={channels[0]}
        onSaved={setBofuPostId}
      />
    </div>
  )
}

function Step({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground text-balance">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function FormatCard({
  active,
  onClick,
  icon: Icon,
  title,
  desc,
}: {
  active: boolean
  onClick: () => void
  icon: typeof User
  title: string
  desc: string
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
        <span className="block text-sm font-bold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      {active && <Check className="size-5" style={{ color: NOVA }} />}
    </button>
  )
}

const PROFILE_TIPS: { id: string; icon: typeof ImageIcon; title: string; desc: string }[] = [
  { id: 'photo', icon: ImageIcon, title: 'Photo de profil nette', desc: 'Ton visage ou ton logo, lumineux et reconnaissable.' },
  { id: 'bio', icon: AtSign, title: 'Une bio qui parle à ta cible', desc: 'Qui tu aides, à quoi, en une ligne. Pas de jargon.' },
  { id: 'lien', icon: Link2, title: 'Le lien vers ta réunion en bio', desc: 'Le seul call-to-action : là où tout le trafic atterrit.' },
  { id: 'feed', icon: Grid3x3, title: 'Un feed cohérent', desc: 'Mêmes couleurs, même ton : on te reconnaît d\'un coup d\'œil.' },
  { id: 'epingle', icon: Sparkles, title: 'Un post épinglé qui présente ton offre', desc: 'Le premier réflexe d\'un curieux, c\'est de scroller ton profil.' },
]

// Démo Radar : remplacé par la vraie recherche Apify (tendances de la niche) plus tard.
const RADAR_DEMO: { platform: string; title: string; hook: string; views: string }[] = [
  { platform: 'TikTok', title: 'Avant / Après', hook: 'Transformation en 15 s, gros texte, son tendance.', views: '2,4 M' },
  { platform: 'Instagram', title: 'Les 3 erreurs à éviter', hook: '« Arrête de faire ça… » face caméra, format liste.', views: '1,1 M' },
  { platform: 'TikTok', title: 'Ma routine en POV', hook: '3 gestes filmés à la première personne, rythme rapide.', views: '890 k' },
  { platform: 'Instagram', title: 'Témoignage client', hook: 'Avis authentique en story, sous-titres gros.', views: '540 k' },
]

function TrendCard({ platform, title, hook, views }: { platform: string; title: string; hook: string; views: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-center gap-2">
        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${NOVA}1a`, color: NOVA }}>
          {platform}
        </span>
        <span className="flex-1 truncate text-sm font-bold text-foreground">{title}</span>
        <span className="shrink-0 text-xs font-semibold text-muted-foreground">{views} vues</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{hook}</p>
    </div>
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
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
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

const CADENCES = [
  { value: 3, label: 'Tranquille' },
  { value: 5, label: 'Régulier' },
  { value: 7, label: 'Intense' },
]

const ATLAS = '#F97316'

const JOURNEY: { icon: typeof MessageCircle; title: string; desc: string; actor: 'Atlas' | 'Toi' }[] = [
  { icon: MessageCircle, title: 'Un curieux se manifeste', desc: 'Il commente ou t\'écrit — Atlas engage la conversation en privé.', actor: 'Atlas' },
  { icon: Filter, title: 'Atlas qualifie', desc: 'Il cerne son besoin et sa maturité, sans être insistant.', actor: 'Atlas' },
  { icon: CalendarCheck, title: 'Il s\'inscrit à la réunion', desc: 'Atlas l\'invite et le place sur ton créneau.', actor: 'Atlas' },
  { icon: Handshake, title: 'La réunion', desc: 'Tu présentes, tu réponds, tu closes en direct.', actor: 'Toi' },
  { icon: RefreshCw, title: 'Le suivi', desc: 'Tu notes le résultat ; Atlas relance ceux qui hésitent.', actor: 'Toi' },
]

function JourneyStep({
  icon: Icon,
  title,
  desc,
  actor,
  last,
}: {
  icon: typeof MessageCircle
  title: string
  desc: string
  actor: 'Atlas' | 'Toi'
  last: boolean
}) {
  const color = actor === 'Atlas' ? ATLAS : NOVA
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: `${color}1a`, color }}
        >
          <Icon className="size-4 stroke-[1.5]" />
        </span>
        {!last && <span className="my-1 w-px flex-1 bg-border" />}
      </div>
      <div className={cn('flex-1', !last && 'pb-4')}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{title}</span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: `${color}1a`, color }}
          >
            {actor}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
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

function ModeCard({
  active,
  onClick,
  icon: Icon,
  title,
  desc,
  badge,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Wand2
  title: string
  desc: string
  badge: string
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
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: `${NOVA}1a`, color: NOVA }}
          >
            {badge}
          </span>
        </span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      {active && <Check className="size-5" style={{ color: NOVA }} />}
    </button>
  )
}

function MixRow({ op, label, pct, desc }: { op: string; label: string; pct: string; desc: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: `${NOVA}${op}` }} />
      <span className="text-xs font-bold text-foreground">{label}</span>
      <span className="text-xs font-semibold" style={{ color: NOVA }}>
        {pct}
      </span>
      <span className="text-xs text-muted-foreground">— {desc}</span>
    </div>
  )
}

function ChecklistItem({
  icon: Icon,
  title,
  desc,
  done,
  onToggle,
}: {
  icon: typeof ImageIcon
  title: string
  desc: string
  done: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left transition-colors active:bg-muted"
    >
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${NOVA}1a`, color: NOVA }}
      >
        <Icon className="size-4 stroke-[1.5]" />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors"
        style={done ? { background: NOVA, borderColor: NOVA } : { borderColor: 'var(--border)' }}
      >
        {done && <Check className="size-4 text-white" />}
      </span>
    </button>
  )
}

