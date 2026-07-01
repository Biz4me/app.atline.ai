import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

const UNAME_FORMAT = /^[a-z0-9._]{3,20}$/
const titleCase = (s: string) =>
  s.trim().toLowerCase().replace(/(^|[\s\-'])([a-zà-ÿ])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase())
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')

async function isFree(u: string): Promise<boolean> {
  if (!UNAME_FORMAT.test(u)) return false
  const existing = await db.user.findUnique({ where: { username: u }, select: { id: true } })
  return !existing
}

// Génère un username valide et disponible à partir d'une base (compte OAuth sans username saisi)
async function freeUsername(baseRaw: string): Promise<string> {
  let base = (baseRaw || 'membre').slice(0, 18)
  if (base.length < 3) base = (base + 'membre').slice(0, 6)
  if (await isFree(base)) return base
  for (let i = 0; i < 20; i++) {
    const c = `${base}${Math.floor(Math.random() * 9999)}`.slice(0, 20)
    if (await isFree(c)) return c
  }
  return `membre${Date.now().toString().slice(-6)}`
}

// Adapter Prisma avec createUser custom : dérive prénom/nom du `name` Google et auto-génère le username
const baseAdapter = PrismaAdapter(db)
const adapter = {
  ...baseAdapter,
  createUser: async (data: { name?: string | null; email: string; emailVerified?: Date | null; image?: string | null }) => {
    const parts = String(data.name || '').trim().split(/\s+/).filter(Boolean)
    const emailLocal = String(data.email || '').split('@')[0]
    const firstName = titleCase(parts[0] || emailLocal || 'Membre')
    const lastName = titleCase(parts.slice(1).join(' '))
    const username = await freeUsername(norm(`${firstName}${lastName}`) || norm(emailLocal) || 'membre')
    return db.user.create({
      data: {
        email: data.email,
        emailVerified: data.emailVerified ?? null,
        firstName,
        lastName,
        username,
        photoUrl: data.image ?? null,
      },
    }) as any
  },
}

export const authOptions: NextAuthOptions = {
  adapter: adapter as any,
  session: { strategy: 'jwt' },
  pages: { signIn: '/auth' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      // Google vérifie les emails → on lie au compte existant si même email
      allowDangerousEmailAccountLinking: true,
      // Toujours afficher le sélecteur de compte (sinon Google reconnecte direct la session ouverte)
      authorization: { params: { prompt: 'select_account' } },
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email ou identifiant', type: 'text' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        // L'identifiant saisi peut être un email OU un username
        const identifier = credentials.email.toLowerCase().trim()
        const user = await db.user.findFirst({
          where: { OR: [{ email: identifier }, { username: identifier }] },
        })
        if (!user || !user.passwordHash) return null
        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null
        return { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}` }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { onboardingCompleted: true } })
        token.onboardingCompleted = dbUser?.onboardingCompleted ?? false
      }
      if (trigger === 'update') {
        const dbUser = await db.user.findUnique({ where: { id: token.id as string }, select: { onboardingCompleted: true } })
        token.onboardingCompleted = dbUser?.onboardingCompleted ?? false
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.onboardingCompleted = token.onboardingCompleted as boolean
      }
      return session
    },
  },
}
