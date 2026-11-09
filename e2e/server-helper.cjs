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
const { readFileSync } = require('fs')

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
        select: { type: true, outcome: true, direction: true, isExposure: true },
      })
      console.log(JSON.stringify({ exposures: c.exposures, lastContact: c.lastContact, interactions }))
    } else if (cmd === 'delete') {
      await prisma.contact.delete({ where: { id: cid } })
      console.log('delete ok')
    } else {
      throw new Error('commande ? create | reset <cid> | compter <cid> | delete <cid>')
    }
  } finally {
    await prisma.$disconnect()
  }
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
