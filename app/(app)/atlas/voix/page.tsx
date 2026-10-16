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
  // Le navigateur a-t-il refusé de jouer ? On le montre au lieu de laisser un
  // écran muet sans explication.
  const [sonBloque, setSonBloque] = useState(false)
  // Les vingt minutes quotidiennes : ce qu'il reste, et le message quand c'est fini.
  const [restant, setRestant] = useState<number | null>(null)
  const [quotaAtteint, setQuotaAtteint] = useState('')
  // Le budget de la semaine, lu au repos : l'utilisateur doit savoir où il en
  // est AVANT de parler, pas le découvrir quand la voix s'arrête.
  const [budget, setBudget] = useState<{ semaine: number; dose: number } | null>(null)

  const roomRef = useRef<Room | null>(null)
  const audioRef = useRef<HTMLMediaElement | null>(null)

  // ── Ce qui fait respirer la mire ────────────────────────────────────────────
  //
  // SURTOUT PAS d'AudioContext ici : faire entrer une piste WebRTC distante dans
  // un graphe Web Audio capte le flux, et comme l'analyseur n'est relié à aucune
  // sortie, le son y part et n'en ressort jamais.
  //
  // On se sert donc du niveau que LiveKit calcule DÉJÀ, sans toucher à l'audio.
  // Contrepartie assumée : ce signal est rafraîchi quelques fois par seconde et
  // non soixante, d'où le lissage vers la cible à chaque image — sinon la mire
  // sauterait par paliers au lieu de respirer.
  const lissEntree = useRef(0)
  const lissSortie = useRef(0)

  const lisser = (ref: typeof lissEntree, cible: number) => {
    ref.current += (cible - ref.current) * 0.18
    return ref.current
  }

  const lireEntree = useCallback(() => {
    const p = roomRef.current?.localParticipant
    return lisser(lissEntree, muet || !p ? 0 : p.audioLevel)
  }, [muet])

  const lireSortie = useCallback(() => {
    const salle = roomRef.current
    let niveau = 0
    if (salle) {
      for (const p of salle.remoteParticipants.values()) {
        if (p.audioLevel > niveau) niveau = p.audioLevel
      }
    }
    return lisser(lissSortie, niveau)
  }, [])

  const raccrocher = useCallback(async () => {
    await roomRef.current?.disconnect().catch(() => {})
    roomRef.current = null
    lissEntree.current = 0
    lissSortie.current = 0
    audioRef.current = null
    setEtat('repos')
    setParle(false)
    setSonBloque(false)
  }, [])

  useEffect(() => () => { void raccrocher() }, [raccrocher])

  // Au repos, on relit le budget : au chargement, et après chaque conversation
  // pour que le compteur affiché reflète ce qui vient d'être consommé.
  useEffect(() => {
    if (etat !== 'repos') return
    let vivant = true
    fetch('/api/atlas/voix/token')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivant && d) setBudget({ semaine: d.resteSemaine, dose: d.doseSemaine }) })
      .catch(() => {})
    return () => { vivant = false }
  }, [etat])

  // Le décompte des vingt minutes. L'agent coupe de son côté ; ceci n'est que
  // l'affichage, pour que la fin se voie venir au lieu de tomber dessus.
  useEffect(() => {
    if (etat !== 'en_ligne' || restant === null) return
    const t = setInterval(() => setRestant((r) => (r === null ? null : Math.max(0, r - 1))), 1000)
    return () => clearInterval(t)
  }, [etat, restant === null])

  const demarrer = async () => {
    if (etat === 'connexion' || etat === 'en_ligne') return
    setEtat('connexion')
    setCartes([])
    setMoi('')
    setLui('')
    setSonBloque(false)
    setQuotaAtteint('')

    // ⚠️ LA PREMIÈRE INSTRUCTION, et elle doit le rester.
    //
    // Sur mobile, la lecture audio reste MUETTE tant qu'un geste de
    // l'utilisateur n'a pas déclenché `getUserMedia()` ou `startAudio()`. Ici on
    // est encore dans le tap sur la mire ; tout ce qui suit (jeton, connexion,
    // abonnement à la piste) comporte des attentes réseau, et à leur sortie le
    // geste est éteint. Déplacer cette ligne plus bas rend l'écran muet.
    //
    // On ne relâche pas non plus les pistes obtenues : ce flux vivant fait
    // partie de la séquence qui fonctionne.
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      console.warn('Atlas vocal : micro refusé', e)
      setEtat('echec')
      return
    }

    try {
      const res = await fetch('/api/atlas/voix/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voix }),
      })
      // 429 = les vingt minutes du jour sont faites. Ce n'est pas une erreur,
      // c'est la règle du jeu : on le dit clairement et on renvoie vers l'écrit.
      if (res.status === 429) {
        const d = await res.json().catch(() => ({}))
        setQuotaAtteint(d?.message || "Tu as fait tes vingt minutes de coaching parlé aujourd'hui.")
        setEtat('repos')
        return
      }
      if (!res.ok) throw new Error('jeton refusé')
      const { token, url, secondesRestantes } = await res.json()
      setRestant(typeof secondesRestantes === 'number' ? secondesRestantes : null)

      const room = new Room()
      roomRef.current = room

      // ⚠️ LE CHEMIN AUDIO — ne pas « améliorer » sans vérifier sur un téléphone.
      //
      // C'est la séquence exacte de l'écran d'appel d'Aria, et l'ordre compte :
      // `play()` AVANT l'insertion dans la page. Toute addition par-dessus
      // (`startAudio()`, un réveil sur chaque toucher, un chien de garde sur le
      // flux, une re-attache) a rendu Atlas muet sur mobile — les paquets
      // arrivaient, mais le moteur de rendu audio ne démarrait jamais.
      room.on(RoomEvent.TrackSubscribed, (piste: RemoteTrack) => {
        if (piste.kind !== Track.Kind.Audio) return
        const el = piste.attach()
        el.setAttribute('playsinline', 'true')
        const avecSink = el as HTMLMediaElement & { setSinkId?: (id: string) => Promise<void> }
        if (typeof avecSink.setSinkId === 'function') {
          avecSink.setSinkId('communications').catch(() => {
            avecSink.setSinkId?.('').catch(() => {})
          })
        }
        // Un refus de lecture se voit à l'écran plutôt que de laisser un silence
        // inexpliqué, mais on n'essaie RIEN de plus : c'est ce qui cassait.
        el.play().catch(() => setSonBloque(true))
        document.body.appendChild(el)
        audioRef.current = el
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
      await room.localParticipant.setMicrophoneEnabled(true)
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
    : etat === 'echec' ? 'Micro refusé ou connexion impossible'
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

          {/* AU REPOS : le budget de la semaine, bien lisible. */}
          {etat === 'repos' && !quotaAtteint && budget && (
            <p className="text-2xs text-white/40">
              {Math.ceil(budget.semaine / 60)} min de coaching parlé cette semaine
            </p>
          )}

          {/* EN CONVERSATION : rien, SAUF les trois dernières minutes.
              Un décompte qui tourne pendant qu'on parle transforme le coaching
              en taxi — on regarde le compteur au lieu d'écouter. */}
          {etat === 'en_ligne' && restant !== null && restant <= 180 && (
            <p className="text-2xs text-[#F4B342]/80">
              encore {Math.max(0, Math.ceil(restant / 60))} min
            </p>
          )}

          {/* Les vingt minutes sont faites. On ne laisse pas l'utilisateur
              devant une porte close : le fil écrit est à un tap. */}
          {quotaAtteint && (
            <div className="mt-2 max-w-[34ch] rounded-2xl border border-white/10 bg-[#17181B] px-4 py-3 text-center">
              <p className="text-sm leading-relaxed text-white/80">{quotaAtteint}</p>
              <button
                onClick={() => router.push('/atlas')}
                className="mt-3 w-full rounded-xl bg-primary py-2 text-xs font-bold text-[#1A0E02]"
              >
                Continuer à l’écrit
              </button>
            </div>
          )}

          {/* Recours visible quand l'élément est en pause. Le geste se contente
              de rejouer l'élément : plus de `startAudio`, plus de réveil global,
              on ne veut qu'UNE variable à la fois tant que le son ne sort pas. */}
          {sonBloque && etat === 'en_ligne' && (
            <button
              onClick={() => void audioRef.current?.play().catch(() => {})}
              className="mt-1 flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs font-bold text-[#1A0E02]"
            >
              <Volume2 size={15} />
              Activer le son
            </button>
          )}

          {/* Le micro reste accessible même quand le son est bloqué : les deux
              problèmes sont indépendants, les cacher l'un l'autre n'aide personne. */}
          {etat === 'en_ligne' && (
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
