// Helper serveur du harnais E2E — tourne SUR le serveur (Prisma + next-auth + NEXTAUTH_SECRET dispos).
// Il lit DATABASE_URL et NEXTAUTH_SECRET dans .env.local, donc l'appel SSH reste simple.
// Usage : node e2e/server-helper.cjs <create [email]|reset <cid>|delete <cid>>
//  - create        -> crée un contact jetable + forge un token de session, imprime {"cid","token"}
//  - create <email> -> idem, mais POUR CE COMPTE-LÀ.
//
//    🔴 Pourquoi cet argument existe, ajouté le 3 novembre 2026 : sans lui,
//    `create` prend le propriétaire du PREMIER contact, qui n'est pas celui
//    qu'on croit. La base porte CINQ comptes dont les initiales donnent « PH »
//    et DEUX nommés « Patrice Haure-Pallesi » — `haurinvest@gmail.com` et
//    `patricehaurepallesi@gmail.com`. Un écran qui lit des données rattachées
//    à un compte précis semblait donc vide à tort, et l'avatar affichait les
//    bonnes initiales par pure coïncidence. **Un test qui ne sait pas sous
//    quelle identité il tourne ne prouve pas ce qu'on croit.**
//  - reset  <cid>   -> remet le contact à zéro (qualification vide, étape NOUVEAU)
//  - compter <cid>  -> imprime {exposures, lastContact, interactions[]} : CE QUE LE
//                      SERVEUR A GARDÉ. Lecture seule. Un test de navigateur prouve
//                      qu'un écran a changé, pas qu'une ligne est écrite.
//  - delete <cid>   -> supprime le contact jetable
//  - peupler <cid>  -> sème SIX contacts jetables autour du contact <cid> : des
//                      prénoms accentués, six villes françaises, et leurs
//                      COORDONNÉES. Imprime la liste.
//  - depeupler      -> les retire tous, et eux seuls.
//
//    🔴 POURQUOI ILS EXISTENT (20 novembre 2026). Cinq sondes exigeaient la
//    donnée du compte : « plus de 5 points sur la carte », « une Émilie dans
//    la liste », « un segment qui n'est pas vide ». Le compte de travail a
//    SEPT contacts et UN seul géocodé : elles échouaient toutes, sans qu'aucun
//    défaut existe. Sauter aurait rendu le vert gratuit ; **fabriquer garde la
//    preuve**.
//
//    🔴 ET LA SUPPRESSION NE PEUT PAS DÉBORDER. Tous portent le préfixe
//    `E2E-GEO ` dans leur `name`, et `depeupler` ne supprime QUE ça. Le préfixe
//    n'est pas décoratif : c'est la seule chose qui sépare un contact jeté
//    d'un vrai contact de Patrice.
const { readFileSync } = require('fs')

/** La marque des contacts semés. Elle seule autorise leur suppression. */
const MARQUE = 'E2E-GEO '

const env = readFileSync('.env.local', 'utf8')
const pick = (k) => {
  let v = (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]
  if (v == null) return undefined
  v = v.trim()
  if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1)
  return v
}
process.env.DATABASE_URL = process.env.DATABASE_URL || pick('DATABASE_URL')

const { PrismaClient } = require('@prisma/client')
const { encode } = require('next-auth/jwt')

;(async () => {
  const cmd = process.argv[2]
  const cid = process.argv[3]
  const prisma = new PrismaClient()
  try {
    if (cmd === 'create') {
      const voulu = process.argv[3]
      let u, mlmBusinessId
      if (voulu) {
        u = await prisma.user.findUnique({ where: { email: voulu }, select: { id: true, email: true } })
        if (!u) throw new Error(`aucun compte ${voulu}`)
        const b = await prisma.userMlmBusiness.findFirst({ where: { userId: u.id }, select: { id: true } })
        if (!b) throw new Error(`${voulu} n'a aucune activité : un contact doit être rattaché à une activité`)
        mlmBusinessId = b.id
      } else {
        const seed = await prisma.contact.findFirst({ select: { userId: true, mlmBusinessId: true } })
        if (!seed) throw new Error('aucun contact pour semer (userId/mlmBusinessId)')
        u = await prisma.user.findUnique({ where: { id: seed.userId }, select: { id: true, email: true } })
        mlmBusinessId = seed.mlmBusinessId
      }
      const c = await prisma.contact.create({ data: { user: { connect: { id: u.id } }, mlmBusiness: { connect: { id: mlmBusinessId } }, name: 'E2E Test', kind: 'PROSPECT', prospectStage: 'NOUVEAU', initials: 'ET', accent: '#F97316' } })
      const token = await encode({ token: { id: u.id, sub: u.id, email: u.email, onboardingCompleted: true }, secret: pick('NEXTAUTH_SECRET'), maxAge: 3600 })
      console.log(JSON.stringify({ cid: c.id, token }))
    } else if (cmd === 'reset') {
      await prisma.contact.update({ where: { id: cid }, data: { qualification: {}, prospectStage: 'NOUVEAU' } })
      console.log('reset ok')
    } else if (cmd === 'compter') {
      /**
       * CE QUE LE SERVEUR A VRAIMENT GARDÉ, pour un contact.
       *
       * 🔴 AJOUTÉ LE 10 NOVEMBRE 2026 POUR LE JOURNAL DES ÉCHANGES. Un test
       * de navigateur prouve qu'un écran a changé ; il ne dit RIEN de ce qui
       * est écrit. Et le journal n'a d'intérêt que persisté : c'est lui qui
       * nourrit « 3 expositions » et « froide depuis 6 jours », donc l'appel
       * que l'étape impose, donc le prochain pas.
       *
       * ⚠️ LECTURE SEULE. Ce helper sait déjà créer et supprimer un contact
       * jetable ; compter ne touche à rien.
       */
      const c = await prisma.contact.findUnique({
        where: { id: cid },
        select: { exposures: true, lastContact: true },
      })
      if (!c) throw new Error(`aucun contact ${cid}`)
      const interactions = await prisma.interaction.findMany({
        where: { contactId: cid },
        orderBy: { createdAt: 'desc' },
        // body : le message PREPARE, depuis l'ecran d'ecriture du
        // 18 novembre 2026. Sans lui, la sonde ne peut pas prouver que le
        // texte se range — et c'est lui qui rend l'historique possible.
        select: { type: true, outcome: true, direction: true, isExposure: true, body: true },
      })
      console.log(JSON.stringify({ exposures: c.exposures, lastContact: c.lastContact, interactions }))
    } else if (cmd === 'adresse') {
      /**
       * L'ADRESSE ET LA POSITION QUE LE SERVEUR A GARDÉES, pour un contact.
       *
       * 🔴 AJOUTÉ LE 16 NOVEMBRE 2026 POUR LA RECHERCHE D'ADRESSE. Elle est
       * la première chose qui écrive `lat` et `lng` — mesuré avant de coder :
       * **0 contact sur 44 en portait**. Or ces deux nombres ne s'affichent
       * NULLE PART : la fiche montre la rue, le code postal, la ville, le
       * pays, et rien de la position. Un test de navigateur ne peut donc pas
       * les voir, et c'est précisément eux dont dépend la carte à venir.
       *
       * 🧭 Un écran qui a l'air juste avec des coordonnées manquantes, c'est
       * la panne silencieuse parfaite : on ne la découvrirait qu'au moment de
       * dessiner la carte, trois chantiers plus loin.
       *
       * ⚠️ LECTURE SEULE.
       */
      const c = await prisma.contact.findUnique({
        where: { id: cid },
        select: {
          address: true, address2: true, postal: true, city: true,
          country: true, lat: true, lng: true,
        },
      })
      if (!c) throw new Error(`aucun contact ${cid}`)
      console.log(JSON.stringify(c))
    } else if (cmd === 'rdv') {
      /**
       * UN RENDEZ-VOUS FUTUR SUR LE CONTACT JETABLE.
       *
       * 🔴 AJOUTÉ LE 13 NOVEMBRE 2026 POUR UNE RAISON PRÉCISE. La famille
       * « Ce qui t'attend » lit les rendez-vous à venir, et le compte de
       * travail n'en a **aucun** — mesuré, zéro. Sans de quoi la nourrir, on
       * livrerait une surface que personne ne peut voir et qu'aucune sonde ne
       * peut exercer : exactement les tables vides qu'on a passé la semaine à
       * retirer d'ailleurs.
       *
       * ⚠️ IL EST RATTACHÉ AU CONTACT JETABLE, comme tout ce que les tests
       * écrivent, et la sonde le supprime elle-même. Aucun rendez-vous réel
       * n'est touché, et il ne reste rien après le passage.
       */
      const h = Number(process.argv[4] ?? 26)
      const c = await prisma.contact.findUnique({
        where: { id: cid },
        select: { userId: true, mlmBusinessId: true },
      })
      if (!c) throw new Error(`aucun contact ${cid}`)
      const quand = new Date(Date.now() + h * 3600 * 1000)
      /**
       * UN LIEU FACULTATIF, ajouté le 17 novembre 2026 pour l'itinéraire.
       *
       * 🔴 POURQUOI PAS LE FORMULAIRE DE L'APP. Ce serait le chemin réel, et
       * donc la meilleure preuve — sauf que `creerRendezVous` POUSSE dans
       * l'agenda Google quand il est raccordé. Une sonde déposerait de vrais
       * rendez-vous « E2E » dans le calendrier de quelqu'un, à chaque
       * passage. On écrit donc en base, sur le contact jetable, et la sonde
       * retire sa ligne elle-même.
       *
       * ⚠️ Et le TYPE suit : un itinéraire ne s'affiche qu'en présentiel ou
       * quand un lieu est écrit. Sans ce paramètre, la sonde ne pourrait
       * éprouver que le cas où le bouton est ABSENT.
       */
      const lieu = process.argv[5] ? String(process.argv[5]) : null
      const r = await prisma.appointment.create({
        data: {
          userId: c.userId,
          mlmBusinessId: c.mlmBusinessId,
          contactId: cid,
          title: 'E2E Rendez-vous',
          startAt: quand,
          endAt: new Date(quand.getTime() + 30 * 60 * 1000),
          ...(lieu ? { lieu, type: 'PRESENTIEL' } : {}),
        },
        select: { id: true },
      })
      console.log(JSON.stringify({ rid: r.id, startAt: quand.toISOString(), lieu }))
    } else if (cmd === 'rdv-delete') {
      await prisma.appointment.delete({ where: { id: cid } })
      console.log('rdv-delete ok')
    } else if (cmd === 'peupler') {
      /**
       * SIX CONTACTS JETABLES, GÉOCODÉS, AUTOUR DU CONTACT DONNÉ.
       *
       * ⚠️ `firstName` EST POSÉ EXPLICITEMENT. La liste affiche
       * `firstName?.trim() || name.split(/\s+/)[0]` : sans lui, le prénom
       * affiché serait « E2E-GEO » pour les six, et la recherche par prénom
       * ne prouverait rien.
       *
       * ⚠️ SIX VILLES ÉLOIGNÉES, PAS SIX FOIS PARIS. La sonde de la carte
       * vérifie que les points ne s'EMPILENT pas : six contacts à la même
       * adresse lui donneraient un seul point et elle échouerait encore.
       *
       * ⚠️ UN PRÉNOM UNIQUE AU MONDE — Zéphirin. Une sonde doit pouvoir
       * réduire la liste à UNE personne pour éprouver la touche Entrée ; avec
       * des prénoms courants elle n'y arriverait jamais à coup sûr.
       */
      const base = await prisma.contact.findUnique({
        where: { id: cid },
        select: { userId: true, mlmBusinessId: true },
      })
      if (!base) throw new Error(`aucun contact ${cid} pour semer autour`)
      const gens = [
        { p: 'Émilie', n: 'Vasseur', v: 'Paris', cp: '75011', lat: 48.8566, lng: 2.3522, k: 'PROSPECT', e: 'NOUVEAU' },
        { p: 'Gaël', n: 'Rouvier', v: 'Lyon', cp: '69003', lat: 45.764, lng: 4.8357, k: 'PROSPECT', e: 'INVITATION' },
        { p: 'Chloé', n: 'Berthaud', v: 'Marseille', cp: '13006', lat: 43.2965, lng: 5.3698, k: 'CLIENT', e: null },
        { p: 'Zéphirin', n: 'Malandain', v: 'Bordeaux', cp: '33000', lat: 44.8378, lng: -0.5792, k: 'PROSPECT', e: 'SUIVI' },
        { p: 'Hélène', n: 'Caradec', v: 'Lille', cp: '59000', lat: 50.6292, lng: 3.0573, k: 'CLIENT', e: null },
        { p: 'Noé', n: 'Fournel', v: 'Strasbourg', cp: '67000', lat: 48.5734, lng: 7.7521, k: 'PROSPECT', e: 'CLOSING' },
      ]
      const faits = []
      for (const g of gens) {
        const c = await prisma.contact.create({
          data: {
            user: { connect: { id: base.userId } },
            mlmBusiness: { connect: { id: base.mlmBusinessId } },
            name: `${MARQUE}${g.p} ${g.n}`,
            firstName: g.p,
            lastName: g.n,
            kind: g.k,
            prospectStage: g.e,
            initials: (g.p[0] + g.n[0]).toUpperCase(),
            accent: '#14B8A6',
            city: g.v,
            postal: g.cp,
            country: 'FR',
            lat: g.lat,
            lng: g.lng,
          },
          select: { id: true, firstName: true, city: true },
        })
        faits.push(c)
      }
      console.log(JSON.stringify(faits))
    } else if (cmd === 'depeupler') {
      /**
       * 🔴 LE PRÉFIXE, ET RIEN QUE LUI. Un `deleteMany` sans filtre étroit sur
       * la base qui porte les contacts de Patrice serait la pire commande de
       * ce fichier. `startsWith` sur la marque est la seule condition, et elle
       * est écrite en dur : pas d'argument, donc rien à se tromper d'appeler.
       */
      const r = await prisma.contact.deleteMany({ where: { name: { startsWith: MARQUE } } })
      console.log(JSON.stringify({ retires: r.count }))
    } else if (cmd === 'delete') {
      await prisma.contact.delete({ where: { id: cid } })
      console.log('delete ok')
    } else {
      throw new Error('commande ? create | reset <cid> | compter <cid> | adresse <cid> | rdv <cid> [heures] | rdv-delete <rid> | peupler <cid> | depeupler | delete <cid>')
    }
  } finally {
    await prisma.$disconnect()
  }
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
