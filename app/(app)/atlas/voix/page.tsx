'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Room, RoomEvent, Track, type RemoteTrack } from 'livekit-client'
import { X, Mic, MicOff, Volume2 } from 'lucide-react'
import { AtlasMire } from '@/components/atlas-mire'

/**
 * Atlas, à voix haute.
 *
 * L'écran qui ÉCRIT (/atlas) ne bouge pas : celui-ci est un second écran, un
 * moment à part, comme un appel. On parle, on voit ce qui se dit, Atlas répond
 * de vive voix, et ce qu'il n'a pas prononcé (les écrans qu'il ouvre, les
 * actions qu'il propose) apparaît en cartes.
 *
 * Fond sombre : l'exception de charte qui existe déjà pour l'écran d'appel
 * d'Aria. Une mire lumineuse n'existe pas sur fond clair.
 */

type Carte =
  | { type: 'open'; route: string; libelle: string }
  | { type: 'action'; charge: { kind?: string; params?: Record<string, unknown> } }
  | { type: 'action_done' }
  | { type: 'contacts'; charge: string[] }
  | { type: 'fil'; charge: string }

type Etat = 'repos' | 'connexion' | 'en_ligne' | 'echec'

const VOIX = [
  { cle: 'dorian', libelle: 'Dorian' },
  { cle: 'solene', libelle: 'Solène' },
] as const

export default function AtlasVoixPage() {
  const router = useRouter()
  const [etat, setEtat] = useState<Etat>('repos')
  const [voix, setVoix] = useState<string>('dorian')
  const [muet, setMuet] = useState(false)
  const [cartes, setCartes] = useState<Carte[]>([])
  const [moi, setMoi] = useState('')
  const [lui, setLui] = useState('')
  const [parle, setParle] = useState(false)
  // Le navigateur refuse-t-il de jouer le son ? Sur mobile c'est la règle tant
  // qu'aucun geste ne l'a autorisé, et ça rendait l'écran muet en silence.
  const [sonBloque, setSonBloque] = useState(false)

  const roomRef = useRef<Room | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  // Les deux analyseurs qui font vivre la mire : le micro, et la voix d'Atlas.
  const analyseEntree = useRef<AnalyserNode | null>(null)
  const analyseSortie = useRef<AnalyserNode | null>(null)

  const niveau = (a: AnalyserNode | null) => {
    if (!a) return 0
    const buf = new Uint8Array(a.frequencyBinCount)
    a.getByteFrequencyData(buf)
    let s = 0
    for (const v of buf) s += v
    return s / buf.length / 255
  }
  const lireEntree = useCallback(() => (muet ? 0 : niveau(analyseEntree.current)), [muet])
  const lireSortie = useCallback(() => niveau(analyseSortie.current), [])

  /** Branche une piste audio sur un analyseur, pour que la mire la « voie ». */
  const brancher = (piste: MediaStreamTrack, cible: typeof analyseEntree) => {
    let ctx = audioCtxRef.current
    if (!ctx) {
      ctx = new AudioContext()
      audioCtxRef.current = ctx
    }
    // Sur mobile un AudioContext naît SUSPENDU : sans ce réveil, les analyseurs
    // ne mesurent rien et la mire tourne dans le vide pendant qu'Atlas parle.
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
    const source = ctx.createMediaStreamSource(new MediaStream([piste]))
    const analyse = ctx.createAnalyser()
    analyse.fftSize = 256
    source.connect(analyse)
    // On ne connecte PAS l'analyseur à la sortie : le son d'Atlas est déjà joué
    // par son élément <audio>. Le rebrancher ici le ferait entendre deux fois.
    cible.current = analyse
  }

  const raccrocher = useCallback(async () => {
    await roomRef.current?.disconnect().catch(() => {})
    roomRef.current = null
    await audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    analyseEntree.current = null
    analyseSortie.current = null
    setEtat('repos')
    setParle(false)
    setSonBloque(false)
  }, [])

  useEffect(() => () => { void raccrocher() }, [raccrocher])

  const demarrer = async () => {
    if (etat === 'connexion' || etat === 'en_ligne') return
    setEtat('connexion')
    setCartes([])
    setMoi('')
    setLui('')
    setSonBloque(false)
    try {
      const res = await fetch('/api/atlas/voix/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voix }),
      })
      if (!res.ok) throw new Error('jeton refusé')
      const { token, url } = await res.json()

      const room = new Room()
      roomRef.current = room

      room.on(RoomEvent.TrackSubscribed, (piste: RemoteTrack) => {
        if (piste.kind !== Track.Kind.Audio) return
        const el = piste.attach()
        el.setAttribute('playsinline', 'true')
        el.autoplay = true
        el.muted = false
        el.volume = 1
        // PAS de setSinkId('communications') ici, contrairement à l'écran d'appel
        // d'Aria : sur Android ça route le son vers l'ÉCOUTEUR de téléphone,
        // celui qu'on colle à l'oreille. Sur un ordinateur il n'y en a pas, donc
        // le son sort des haut-parleurs et tout semble marcher ; sur un téléphone
        // posé dans la main, on n'entend rien. Atlas n'est pas un appel : on le
        // regarde, donc il parle par le haut-parleur, comme une vidéo.
        document.body.appendChild(el)
        el.play().catch((e) => {
          // Ne JAMAIS avaler cette erreur : c'est exactement elle qui rendait
          // l'écran muet sans rien dire. Le navigateur refuse de jouer un son
          // qu'aucun geste n'a autorisé ; on le signale et on propose le geste.
          console.warn('Atlas vocal : lecture refusée par le navigateur', e)
          setSonBloque(true)
        })
        if (piste.mediaStreamTrack) brancher(piste.mediaStreamTrack, analyseSortie)
      })

      // Le mécanisme officiel de LiveKit pour le verrou des navigateurs : il
      // faut un geste. On tient le nôtre (le tap sur la mire), mais s'il expire
      // ou si le navigateur refuse quand même, cet événement nous le dit au lieu
      // de nous laisser deviner.
      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        setSonBloque(!room.canPlaybackAudio)
      })

      room.on(RoomEvent.TrackUnsubscribed, (piste) => {
        piste.detach().forEach((el) => el.remove())
      })

      // Ce qui se dit, de part et d'autre. « On parle, on voit ce qu'il dit. »
      room.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
        const texte = segments.map((s) => s.text).join(' ').trim()
        if (!texte) return
        if (participant?.isAgent) setLui(texte)
        else setMoi(texte)
      })

      // Les cartes : ce qu'Atlas n'a PAS prononcé, publié par le worker.
      room.on(RoomEvent.DataReceived, (charge, _p, _k, topic) => {
        if (topic !== 'atlas-carte') return
        try {
          const carte = JSON.parse(new TextDecoder().decode(charge)) as Carte
          // Le fil et l'accusé d'action ne sont pas des cartes à montrer.
          if (carte.type === 'fil' || carte.type === 'action_done') return
          setCartes((c) => [...c, carte])
        } catch {
          /* une carte illisible ne doit jamais couper la conversation */
        }
      })

      room.on(RoomEvent.ActiveSpeakersChanged, (orateurs) => {
        setParle(orateurs.some((o) => o.isAgent))
      })

      room.on(RoomEvent.Disconnected, () => {
        setEtat('repos')
        setParle(false)
      })

      await room.connect(url, token)
      // Déverrouiller le son TANT QUE le geste de l'utilisateur est encore
      // valable. `demarrer` est appelé depuis le tap sur la mire, donc on est
      // dans la bonne pile d'appels : c'est le seul moment où les navigateurs
      // mobiles acceptent d'ouvrir la lecture audio.
      await room.startAudio().catch((e) => {
        console.warn('Atlas vocal : startAudio refusé', e)
      })
      setSonBloque(!room.canPlaybackAudio)
      await room.localParticipant.setMicrophoneEnabled(true)
      const micro = room.localParticipant
        .getTrackPublications()
        .find((p) => p.kind === Track.Kind.Audio)?.track?.mediaStreamTrack
      if (micro) brancher(micro, analyseEntree)
      setMuet(false)
      setEtat('en_ligne')
    } catch (e) {
      console.error('Atlas vocal : connexion impossible', e)
      await raccrocher()
      setEtat('echec')
    }
  }

  const basculerMicro = async () => {
    const room = roomRef.current
    if (!room) return
    const suivant = !muet
    await room.localParticipant.setMicrophoneEnabled(!suivant).catch(() => {})
    setMuet(suivant)
  }

  const quitter = async () => {
    await raccrocher()
    router.push('/atlas')
  }

  const libelleEtat =
    etat === 'connexion' ? 'Connexion…'
    : etat === 'echec' ? 'Connexion impossible'
    : etat !== 'en_ligne' ? 'Touche la mire pour parler'
    : parle ? 'Atlas parle'
    : muet ? 'Micro coupé'
    : 'Je t’écoute'

  return (
    <div className="flex h-[100dvh] flex-col bg-[#0F1012] text-white">
      {/* En-tête */}
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3">
        <button
          onClick={quitter}
          aria-label="Fermer"
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/5 text-white/60 hover:text-white"
        >
          <X size={18} />
        </button>
        <span className="min-w-0 flex-1">
          <b className="block text-sm font-bold">Atlas</b>
          <span className="block text-2xs text-white/45">Ton coach, à voix haute</span>
        </span>
        <span className="flex shrink-0 overflow-hidden rounded-xl border border-white/10" role="group" aria-label="Voix">
          {VOIX.map((v) => (
            <button
              key={v.cle}
              onClick={() => setVoix(v.cle)}
              aria-pressed={voix === v.cle}
              // Changer de voix en pleine conversation demanderait de relancer
              // la session : on le réserve au repos, c'est plus honnête que de
              // laisser croire que ça s'applique.
              disabled={etat === 'en_ligne' || etat === 'connexion'}
              className={[
                'px-3 py-1.5 text-xs transition-colors disabled:opacity-40',
                voix === v.cle ? 'bg-primary font-bold text-[#1A0E02]' : 'text-white/55 hover:text-white',
              ].join(' ')}
            >
              {v.libelle}
            </button>
          ))}
        </span>
      </header>

      {/* La scène : mobile en colonne, desktop avec les cartes à gauche */}
      <main className="flex min-h-0 flex-1 flex-col items-center px-4 lg:grid lg:grid-cols-[330px_1fr_330px] lg:items-center lg:gap-6 lg:px-7">
        {/* Les cartes : sous la mire au téléphone (elle reste le centre), à gauche au bureau */}
        <div className="order-2 flex w-full max-w-[440px] flex-col gap-2.5 overflow-y-auto py-3 lg:order-none lg:col-start-1 lg:max-h-full lg:self-center">
          {cartes.map((c, i) => (
            <CarteVue key={i} carte={c} onOuvrir={(route) => router.push(route)} />
          ))}
        </div>

        <div className="order-1 flex shrink-0 flex-col items-center justify-center gap-3 pt-2 lg:order-none lg:col-start-2 lg:gap-4">
          <p className="min-h-[3.5em] max-w-[34ch] text-center text-sm leading-relaxed lg:text-lg">
            {moi && <span className="mb-1.5 block text-xs text-white/45 lg:text-sm">« {moi} »</span>}
            <span className="text-white">{lui}</span>
          </p>

          <AtlasMire
            niveauEntree={lireEntree}
            niveauSortie={lireSortie}
            onClick={etat === 'en_ligne' ? undefined : demarrer}
            className={[
              'size-[min(38vh,300px)] lg:size-[min(48vh,440px)]',
              etat === 'en_ligne' ? '' : 'cursor-pointer',
            ].join(' ')}
          />

          <p className="text-2xs font-bold uppercase tracking-[0.4em] text-white/45">{libelleEtat}</p>

          {/* Le navigateur bloque le son : on le DIT et on offre le geste.
              Un écran muet qui n'explique rien, c'est ce qu'on vient de corriger. */}
          {sonBloque && etat === 'en_ligne' && (
            <button
              onClick={async () => {
                await roomRef.current?.startAudio().catch(() => {})
                await audioCtxRef.current?.resume().catch(() => {})
                document.querySelectorAll('audio').forEach((a) => void a.play().catch(() => {}))
                setSonBloque(!(roomRef.current?.canPlaybackAudio ?? false))
              }}
              className="mt-1 flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs font-bold text-[#1A0E02]"
            >
              <Volume2 size={15} />
              Activer le son
            </button>
          )}

          {etat === 'en_ligne' && !sonBloque && (
            <button
              onClick={basculerMicro}
              className="mt-1 flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-2 text-xs text-white/70 hover:text-white"
            >
              {muet ? <MicOff size={15} /> : <Mic size={15} />}
              {muet ? 'Reprendre' : 'Couper le micro'}
            </button>
          )}
        </div>

        <div className="hidden lg:block lg:col-start-3" />
      </main>
    </div>
  )
}

/** Ce qu'Atlas n'a pas prononcé : un écran à ouvrir, une action à confirmer. */
function CarteVue({ carte, onOuvrir }: { carte: Carte; onOuvrir: (route: string) => void }) {
  if (carte.type === 'open') {
    return (
      <div className="rounded-2xl border border-white/10 border-l-[3px] border-l-primary bg-[#17181B] px-4 py-3">
        <div className="mb-1 text-2xs uppercase tracking-wider text-white/45">Atlas ouvre</div>
        <div className="text-sm font-semibold">{carte.libelle || carte.route}</div>
        <button
          onClick={() => onOuvrir(carte.route)}
          className="mt-2.5 w-full rounded-xl bg-primary/15 py-2 text-xs font-semibold text-primary"
        >
          Ouvrir
        </button>
      </div>
    )
  }
  if (carte.type === 'action') {
    const quoi = String(carte.charge?.kind ?? 'Action')
    return (
      <div className="rounded-2xl border border-white/10 border-l-[3px] border-l-[#F4B342] bg-[#17181B] px-4 py-3">
        <div className="mb-1 text-2xs uppercase tracking-wider text-white/45">Atlas propose</div>
        <div className="text-sm font-semibold">{LIBELLES[quoi] ?? quoi}</div>
        <div className="mt-0.5 text-xs text-white/45">
          {Object.values(carte.charge?.params ?? {}).filter(Boolean).join(' · ') || '—'}
        </div>
        {/* La confirmation réelle passe par /api/atlas/actions, comme à l'écrit.
            Branchée dans la foulée : ici on montre d'abord que la carte ARRIVE. */}
        <div className="mt-2.5 text-2xs text-white/35">À confirmer depuis le fil Atlas</div>
      </div>
    )
  }
  if (carte.type === 'contacts' && carte.charge?.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#17181B] px-4 py-3 text-xs text-white/55">
        Contacts reconnus : {carte.charge.length}
      </div>
    )
  }
  return null
}

const LIBELLES: Record<string, string> = {
  create_relance: 'Programmer une relance',
  schedule_rdv: 'Programmer un rendez-vous',
  log_note: 'Noter',
  update_profile: 'Mettre à jour ton profil',
  update_activite: 'Mettre à jour ton activité',
}
