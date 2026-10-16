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
  const audioRef = useRef<HTMLMediaElement | null>(null)
  // Un bandeau de diagnostic, visible sur l'appareil où ça cloche. Deux fausses
  // pistes ont coûté deux allers-retours : mieux vaut lire l'état réel que
  // deviner une troisième fois. À retirer quand le son sera stable.
  const [sonde, setSonde] = useState('')
  // Interrupteur de diagnostic : geler la mire pour voir si c'est ELLE qui
  // étrangle le son sur mobile. Temporaire, comme la sonde.
  const [mireAnimee, setMireAnimee] = useState(true)
  // Les statistiques WebRTC : la seule mesure qui dise si des échantillons sont
  // réellement décodés, et si ce qui arrive porte de l'énergie ou du silence.
  const [rtc, setRtc] = useState('')
  const dernierT = useRef(0)
  const figeDepuis = useRef(0)
  const dejaRebranche = useRef(false)

  // ── Ce qui fait respirer la mire ────────────────────────────────────────────
  //
  // SURTOUT PAS d'AudioContext ici. Première version : un `createMediaStreamSource`
  // sur la piste distante alimentait deux analyseurs. Sur ordinateur, parfait.
  // Sur téléphone, Atlas devenait MUET — faire entrer une piste WebRTC distante
  // dans un graphe Web Audio capte le flux, et comme l'analyseur n'est relié à
  // aucune sortie, le son part dans le graphe et n'en ressort jamais. Aria, qui
  // ne touche à aucun AudioContext, n'a jamais eu le problème : c'est la seule
  // différence entre les deux écrans, et c'était la bonne piste.
  //
  // On se sert donc du niveau que LiveKit calcule DÉJÀ, sans toucher à l'audio.
  // Contrepartie assumée : ce signal est rafraîchi quelques fois par seconde, pas
  // soixante. On le lisse donc vers sa cible à chaque image, sinon la mire
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

  /**
   * Re-brancher la piste de zéro. Recours quand le flux se fige : un élément
   * qui « joue » avec un `currentTime` immobile ne rejouera jamais tout seul,
   * et aucun `play()` de plus n'y changera rien. On refait donc l'attache.
   */
  const rebrancher = useCallback(async () => {
    const salle = roomRef.current
    if (!salle) return
    for (const p of salle.remoteParticipants.values()) {
      for (const pub of p.audioTrackPublications.values()) {
        const piste = pub.track
        if (!piste) continue
        piste.detach().forEach((e) => e.remove())
        const el = piste.attach()
        el.setAttribute('playsinline', 'true')
        document.body.appendChild(el)
        audioRef.current = el
        await el.play().catch(() => {})
        console.warn('Atlas vocal : flux figé, piste re-branchée')
        return
      }
    }
  }, [])

  /** Tenter de faire jouer le son. Idempotent, donc rappelable à volonté. */
  const reveiller = useCallback(async () => {
    await roomRef.current?.startAudio().catch(() => {})
    const el = audioRef.current
    if (el?.paused) {
      try {
        await el.play()
      } catch (e) {
        console.warn('Atlas vocal : lecture encore refusée', e)
      }
    }
    setSonBloque(!!audioRef.current?.paused)
  }, [])

  // CEINTURE : n'importe quel toucher sur la page tente de réveiller le son.
  // Un navigateur mobile n'ouvre la lecture que dans un geste, et le nôtre (le
  // tap sur la mire) est consommé bien avant que la piste n'arrive. Plutôt que
  // d'espérer le bon instant, on saisit tous les gestes suivants.
  useEffect(() => {
    if (etat !== 'en_ligne') return
    const surGeste = () => { void reveiller() }
    document.addEventListener('pointerdown', surGeste)
    return () => document.removeEventListener('pointerdown', surGeste)
  }, [etat, reveiller])

  const raccrocher = useCallback(async () => {
    await roomRef.current?.disconnect().catch(() => {})
    roomRef.current = null
    // Les éléments <audio> posés par `attach()` survivent à la déconnexion :
    // sans ce ménage, un second appel en empile un de plus à chaque fois.
    document.querySelectorAll('audio[data-lk-local-player], audio').forEach((a) => {
      if (a.parentElement === document.body) a.remove()
    })
    lissEntree.current = 0
    lissSortie.current = 0
    audioRef.current = null
    dernierT.current = 0
    figeDepuis.current = 0
    dejaRebranche.current = false
    setEtat('repos')
    setParle(false)
    setSonBloque(false)
    setSonde('')
  }, [])

  useEffect(() => () => { void raccrocher() }, [raccrocher])

  // La sonde : l'état réel du chemin audio, relevé deux fois par seconde.
  useEffect(() => {
    if (etat !== 'en_ligne') return
    const minuteur = setInterval(() => {
      const salle = roomRef.current
      const el = audioRef.current as (HTMLMediaElement & { sinkId?: string }) | null
      const distants = salle ? [...salle.remoteParticipants.values()] : []
      const pistes = distants.reduce((n, p) => n + p.audioTrackPublications.size, 0)
      const niveau = distants.reduce((m, p) => Math.max(m, p.audioLevel), 0)
      // LA vérité sur le son, c'est l'élément lui-même, pas l'avis du navigateur.
      setSonBloque(!!el?.paused)

      // Le temps AVANCE-t-il ? « joue » ne veut rien dire si le flux est figé.
      const t = el?.currentTime ?? 0
      const avance = t - dernierT.current
      dernierT.current = t

      // Chien de garde : figé plus de 2 s alors qu'une piste existe et que
      // l'élément se dit en lecture, c'est un flux mort. On re-branche une fois,
      // puis on laisse tranquille — une boucle de réparation serait pire que le mal.
      if (el && !el.paused && pistes > 0 && avance <= 0.05) {
        figeDepuis.current += 1
        if (figeDepuis.current === 4 && !dejaRebranche.current) {
          dejaRebranche.current = true
          void rebrancher()
        }
      } else {
        figeDepuis.current = 0
      }

      // L'état de la PISTE elle-même : `muted` au sens WebRTC signifie
      // « aucune donnée n'arrive », ce qui est très différent d'un volume à zéro.
      const flux = el?.srcObject as MediaStream | null
      const p0 = flux?.getAudioTracks?.()[0]

      setSonde(
        [
          `pistes ${pistes}`,
          el ? `el ${el.paused ? 'PAUSE' : 'joue'} v${el.volume}${el.muted ? ' MUET' : ''}` : 'el ABSENT',
          `t ${t.toFixed(1)} ${avance > 0.05 ? 'avance' : 'FIGE'}`,
          p0 ? `piste ${p0.readyState}${p0.muted ? ' SANS-DONNEES' : ' alimentee'}${p0.enabled ? '' : ' DESACTIVEE'}` : 'piste ABSENTE',
          `niveau ${niveau.toFixed(2)}`,
          dejaRebranche.current ? 'rebranche' : '',
        ].filter(Boolean).join(' · '),
      )

      // Les stats du récepteur WebRTC. C'est la mesure qui tranche :
      //  - « ech 0 »              -> rien n'est décodé, problème de transport
      //  - « ech monte, energie 0 » -> on nous envoie du SILENCE
      //  - « ech monte, energie > 0 » -> le navigateur rend bien du son, et le
      //                              problème est après lui (sortie matérielle)
      void (async () => {
        const piste = [...(salle?.remoteParticipants.values() ?? [])]
          .flatMap((p) => [...p.audioTrackPublications.values()])
          .map((pub) => pub.track)
          .find(Boolean)
        if (!piste) return setRtc('')
        try {
          const rapport = await piste.getRTCStatsReport()
          if (!rapport) return setRtc('pas de stats')
          for (const s of rapport.values()) {
            if (s.type !== 'inbound-rtp' || s.kind !== 'audio') continue
            setRtc(
              [
                `paquets ${s.packetsReceived ?? '?'}`,
                `perdus ${s.packetsLost ?? 0}`,
                `ech ${s.totalSamplesReceived ?? '?'}`,
                `energie ${(s.totalAudioEnergy ?? 0).toFixed(3)}`,
                `masques ${s.concealedSamples ?? 0}`,
                `tampon ${(s.jitterBufferDelay ?? 0).toFixed(1)}`,
              ].join(' · '),
            )
            return
          }
          setRtc('aucun flux entrant audio')
        } catch (e) {
          setRtc(`stats KO : ${String(e).slice(0, 40)}`)
        }
      })()
    }, 500)
    return () => clearInterval(minuteur)
  }, [etat, rebrancher])

  const demarrer = async () => {
    if (etat === 'connexion' || etat === 'en_ligne') return
    setEtat('connexion')
    setCartes([])
    setMoi('')
    setLui('')
    setSonBloque(false)

    // ─────────────────────────────────────────────────────────────────────────
    // LA PREMIÈRE CHOSE, et elle doit le rester.
    //
    // La documentation de livekit-client est explicite : la lecture audio d'un
    // navigateur mobile reste MUETTE tant qu'un geste de l'utilisateur n'a pas
    // déclenché l'une de ces deux choses — `startAudio()` ou `getUserMedia()`.
    //
    // Demander le micro ICI, en tout premier, c'est encore être dans le tap sur
    // la mire. Tout ce qui suit (le jeton, la connexion, l'abonnement à la
    // piste) comporte des attentes réseau : à leur sortie le geste est éteint
    // depuis longtemps, et `setMicrophoneEnabled()` n'ouvre alors plus rien.
    //
    // C'est exactement ce qui rendait Atlas muet sur téléphone pendant que
    // l'écran se croyait sain (« el joue », « lecture ok », et aucun son). Aria
    // faisait déjà ce geste depuis longtemps, commentaire à l'appui — je ne
    // l'avais pas repris.
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ audio: true })
      // On relâche tout de suite : LiveKit redemandera le micro pour de bon,
      // la permission est désormais accordée et la lecture déverrouillée.
      flux.getTracks().forEach((p) => p.stop())
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
      if (!res.ok) throw new Error('jeton refusé')
      const { token, url } = await res.json()

      const room = new Room()
      roomRef.current = room

      room.on(RoomEvent.TrackSubscribed, (piste: RemoteTrack) => {
        if (piste.kind !== Track.Kind.Audio) return
        // ALIGNÉ MOT POUR MOT SUR L'ÉCRAN D'APPEL D'ARIA, qui s'entend très bien
        // sur le téléphone de Patrice. Après deux diagnostics faux (l'écouteur,
        // puis l'AudioContext), on repart de ce qui MARCHE plutôt que de ce qui
        // paraît correct : même ordre d'appels, même routage, même tout. Les
        // améliorations se rajouteront une par une, en vérifiant à chaque fois.
        const el = piste.attach()
        el.setAttribute('playsinline', 'true')
        const avecSink = el as HTMLMediaElement & { setSinkId?: (id: string) => Promise<void> }
        if (typeof avecSink.setSinkId === 'function') {
          avecSink.setSinkId('communications').catch(() => {
            avecSink.setSinkId?.('').catch(() => {})
          })
        }
        document.body.appendChild(el)
        audioRef.current = el
        void reveiller()        // et on redemande la lecture une fois la piste là
      })

      // ATTENTION : `canPlaybackAudio` dit si LiveKit estime que le navigateur
      // AUTORISE le son. Il ne dit PAS si notre élément joue. Les deux peuvent
      // diverger, et c'est exactement ce qui est arrivé : « lecture ok » alors
      // que l'élément était en pause, donc le bouton de secours restait caché.
      // On s'en sert comme signal, jamais comme vérité : la vérité, c'est
      // `element.paused`, relevé par la sonde.
      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        if (!room.canPlaybackAudio) setSonBloque(true)
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
      // `startAudio()` ne joue que les éléments qui EXISTENT déjà. Appelé ici,
      // juste après connect, il ne trouvait rien : la piste d'Atlas n'arrive
      // qu'une seconde plus tard, dans TrackSubscribed. C'était un appel à vide,
      // et c'est la deuxième moitié du bug. On le rappelle donc à l'arrivée de
      // la piste (voir `reveiller`), pas seulement ici.
      await room.startAudio().catch(() => {})
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
            anime={mireAnimee}
            niveauEntree={lireEntree}
            niveauSortie={lireSortie}
            onClick={etat === 'en_ligne' ? undefined : demarrer}
            className={[
              'size-[min(38vh,300px)] lg:size-[min(48vh,440px)]',
              etat === 'en_ligne' ? '' : 'cursor-pointer',
            ].join(' ')}
          />

          <p className="text-2xs font-bold uppercase tracking-[0.4em] text-white/45">{libelleEtat}</p>

          {/* Sonde temporaire : l'état réel du chemin audio, lisible sur place. */}
          {sonde && (
            <>
              <p className="max-w-[90vw] break-words text-center text-[10px] leading-relaxed text-[#F4B342]/80">
                {sonde}
              </p>
              {rtc && (
                <p className="max-w-[90vw] break-words text-center text-[10px] leading-relaxed text-[#22C55E]/85">
                  {rtc}
                </p>
              )}
              <button
                onClick={() => setMireAnimee((v) => !v)}
                className="rounded-full border border-[#F4B342]/40 px-3 py-1 text-[10px] text-[#F4B342]/80"
              >
                {mireAnimee ? 'Geler la mire (test)' : 'Animer la mire'}
              </button>
            </>
          )}

          {/* Le navigateur bloque le son : on le DIT et on offre le geste.
              Un écran muet qui n'explique rien, c'est ce qu'on vient de corriger. */}
          {sonBloque && etat === 'en_ligne' && (
            <button
              onClick={() => void reveiller()}
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
