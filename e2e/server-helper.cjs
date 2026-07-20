// Helper serveur du harnais E2E — tourne SUR le serveur (Prisma + next-auth + NEXTAUTH_SECRET dispos).
// Il lit DATABASE_URL et NEXTAUTH_SECRET dans .env.local, donc l'appel SSH reste simple.
// Usage : node e2e/server-helper.cjs <create|reset|delete> [cid]
//  - create        -> crée un contact jetable + forge un token de session, imprime {"cid","token"}
//  - reset  <cid>   -> remet le contact à zéro (qualification vide, étape NOUVEAU)
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
      const seed = await prisma.contact.findFirst({ select: { userId: true, mlmBusinessId: true } })
      if (!seed) throw new Error('aucun contact pour semer (userId/mlmBusinessId)')
      const u = await prisma.user.findUnique({ where: { id: seed.userId }, select: { id: true, email: true } })
      const c = await prisma.contact.create({ data: { user: { connect: { id: u.id } }, mlmBusiness: { connect: { id: seed.mlmBusinessId } }, name: 'E2E Test', kind: 'PROSPECT', prospectStage: 'NOUVEAU', initials: 'ET', accent: '#F97316' } })
      const token = await encode({ token: { id: u.id, sub: u.id, email: u.email, onboardingCompleted: true }, secret: pick('NEXTAUTH_SECRET'), maxAge: 3600 })
      console.log(JSON.stringify({ cid: c.id, token }))
    } else if (cmd === 'reset') {
      await prisma.contact.update({ where: { id: cid }, data: { qualification: {}, prospectStage: 'NOUVEAU' } })
      console.log('reset ok')
    } else if (cmd === 'delete') {
      await prisma.contact.delete({ where: { id: cid } })
      console.log('delete ok')
    } else {
      throw new Error('commande ? create | reset <cid> | delete <cid>')
    }
  } finally {
    await prisma.$disconnect()
  }
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
