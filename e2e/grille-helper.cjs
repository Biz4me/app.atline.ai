#!/usr/bin/env node
// Vérifier que la GRILLE DE COMPÉTENCES se persiste vraiment, de bout en bout.
//
// Le débrief du service rend `competences: [{id, score, observation}]` ; la route
// /api/aria/sessions/[id] doit en faire des lignes SimScore et faire bouger
// UserCompetence. Un typecheck ne prouve ni l'un ni l'autre.
//
// Usage : node e2e/grille-helper.cjs <create|etat|nettoie> [sessionId]
// `create` sème une session jetable AVEC transcript et imprime {sid, token, userId}
// + un instantané de l'état AVANT, pour pouvoir tout remettre en place après.
const fs = require('fs')

// Même amorçage que server-helper.cjs : DATABASE_URL doit être posée AVANT
// d'instancier Prisma, sinon le client se construit sans datasource.
const env = fs.readFileSync('.env.local', 'utf8')
function pick(cle) {
  let v = (env.match(new RegExp('^' + cle + '=(.*)$', 'm')) || [])[1]
  if (v == null) return ''
  v = v.trim()
  if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1)
  return v
}
process.env.DATABASE_URL = process.env.DATABASE_URL || pick('DATABASE_URL')

const { PrismaClient } = require('@prisma/client')
const { encode } = require('next-auth/jwt')

const TRANSCRIPT = [
  ['USER', "Salut Karim, ça fait un bail ! Dis-moi, t'es toujours chez Decathlon ?"],
  ['ARIA', 'Ouais toujours, ça va. Et toi alors, quoi de neuf ?'],
  ['USER', "Écoute, je me suis lancé dans un truc à côté, dans le bien-être. Franchement ça marche bien, tu devrais voir ça, c'est une opportunité énorme."],
  ['ARIA', "Ah ouais ? C'est quoi exactement ?"],
  ['USER', "Une société d'aloe vera, numéro un mondial, avec un plan de rémunération très intéressant. Tu consommes, tu partages, tu touches des commissions."],
  ['ARIA', "Attends... c'est pas un truc pyramidal ton histoire ?"],
  ['USER', "Non non, c'est légal, c'est du marketing de réseau, c'est très différent."],
  ['ARIA', "Mmh. Je connais quelqu'un qui a essayé, il a perdu de l'argent."],
  ['USER', "Oui mais lui il a mal fait. Tu veux qu'on se voie pour que je te montre le plan ?"],
  ['ARIA', 'Je sais pas trop là, je vais réfléchir.'],
]

;(async () => {
  const cmd = process.argv[2]
  const sid = process.argv[3]
  const prisma = new PrismaClient()
  try {
    if (cmd === 'create') {
      const seed = await prisma.contact.findFirst({ select: { userId: true } })
      if (!seed) throw new Error('aucun contact pour semer')
      const u = await prisma.user.findUnique({ where: { id: seed.userId }, select: { id: true, email: true } })
      const avant = await prisma.userCompetence.findMany({
        where: { userId: u.id },
        select: { competenceId: true, niveau: true, mesures: true },
      })
      const sim = await prisma.simSession.create({
        data: {
          userId: u.id, phase: 'INVITATION', characterId: 'e2e-grille',
          difficulty: 'MOYEN', knowledgeLevel: 'A_UN_AVIS',
        },
      })
      await prisma.simMessage.createMany({
        data: TRANSCRIPT.map(([role, content]) => ({ sessionId: sim.id, role, content })),
      })
      const token = await encode({
        token: { id: u.id, sub: u.id, email: u.email, onboardingCompleted: true },
        secret: pick('NEXTAUTH_SECRET'), maxAge: 3600,
      })
      console.log(JSON.stringify({ sid: sim.id, userId: u.id, token, avant }))
    } else if (cmd === 'etat') {
      const sim = await prisma.simSession.findUnique({ where: { id: sid }, select: { userId: true, score: true } })
      const scores = await prisma.simScore.findMany({
        where: { sessionId: sid },
        select: { competenceId: true, score: true, observation: true },
        orderBy: { competenceId: 'asc' },
      })
      const niveaux = await prisma.userCompetence.findMany({
        where: { userId: sim.userId },
        select: { competenceId: true, niveau: true, mesures: true },
        orderBy: { competenceId: 'asc' },
      })
      const faits = await prisma.atlasFact.findMany({
        where: { userId: sim.userId, source: 'aria', competenceId: { not: null } },
        select: { predicate: true, competenceId: true, object: true, supportCount: true, confidence: true },
        orderBy: { lastSeenAt: 'desc' }, take: 8,
      })
      console.log(JSON.stringify({ score: sim.score, scores, niveaux, faits }, null, 1))
    } else if (cmd === 'nettoie') {
      // L'instantané d'AVANT est passé en JSON sur l'entrée standard : on remet
      // UserCompetence exactement dans l'état où on l'a trouvé. Les faits créés
      // par le test restent (ils sont justes, et on ne supprime jamais un fait).
      const sim = await prisma.simSession.findUnique({ where: { id: sid }, select: { userId: true } })
      const avant = JSON.parse(fs.readFileSync(0, 'utf8') || '[]')
      await prisma.simScore.deleteMany({ where: { sessionId: sid } })
      await prisma.simMessage.deleteMany({ where: { sessionId: sid } })
      await prisma.simSession.delete({ where: { id: sid } })
      const garde = new Set(avant.map((a) => a.competenceId))
      await prisma.userCompetence.deleteMany({
        where: { userId: sim.userId, competenceId: { notIn: [...garde] } },
      })
      for (const a of avant) {
        await prisma.userCompetence.update({
          where: { userId_competenceId: { userId: sim.userId, competenceId: a.competenceId } },
          data: { niveau: a.niveau, mesures: a.mesures },
        })
      }
      console.log('nettoye ok')
    } else {
      throw new Error('commande ? create | etat <sid> | nettoie <sid>')
    }
  } finally {
    await prisma.$disconnect()
  }
})().catch((e) => { console.error(e.message); process.exit(1) })
