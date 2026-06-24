import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  session: { strategy: 'jwt' },
  pages: { signIn: '/auth' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await db.user.findUnique({ where: { email: credentials.email } })
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
