import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { sendVerificationEmail } from '@/lib/email-verification'

const FORMAT = /^[a-z0-9._]{3,20}$/

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')
}

// Capitale initiale, gère composés / tirets / apostrophes : "haure-pallesi" → "Haure-Pallesi"
function titleCase(s: string): string {
  return s.trim().toLowerCase().replace(/(^|[\s\-'])([a-zà-ÿ])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase())
}

async function freeUsername(base: string): Promise<string> {
  const root = base || 'membre'
  for (let i = 0; i < 15; i++) {
    const candidate = i === 0 ? root : `${root}${Math.floor(Math.random() * 99999)}`
    if (FORMAT.test(candidate)) {
      const taken = await db.user.findUnique({ where: { username: candidate }, select: { id: true } })
      if (!taken) return candidate
    }
  }
  return `membre${Date.now().toString().slice(-6)}`
}

export async function POST(req: Request) {
  const { firstName, lastName, email, password, username: rawUsername } = await req.json()

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Mot de passe trop court (8 car. min)' }, { status: 400 })
  }

  // Normalisation autoritaire : noms en capitale initiale, email en minuscules
  const cleanFirst = titleCase(String(firstName))
  const cleanLast = titleCase(String(lastName))
  const cleanEmail = String(email).trim().toLowerCase()

  const existing = await db.user.findUnique({ where: { email: cleanEmail } })
  if (existing) {
    return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 })
  }

  // Identifiant : celui choisi (validé) sinon généré disponible
  let username = (rawUsername ?? '').toLowerCase().trim()
  if (username) {
    if (!FORMAT.test(username)) {
      return NextResponse.json({ error: 'Identifiant invalide (3-20 car. : lettres, chiffres, . _)' }, { status: 400 })
    }
    const taken = await db.user.findUnique({ where: { username }, select: { id: true } })
    if (taken) {
      return NextResponse.json({ error: 'Identifiant déjà pris' }, { status: 409 })
    }
  } else {
    username = await freeUsername(norm(`${cleanFirst}${cleanLast}`))
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await db.user.create({
    data: { firstName: cleanFirst, lastName: cleanLast, email: cleanEmail, username, passwordHash },
    select: { id: true },
  })

  // Attribution parrainage (mononiveau) — cookie posé par /r/{code}
  try {
    const ref = (await cookies()).get('atline_ref')?.value
    if (ref && ref !== username) {
      const referrer = await db.user.findUnique({ where: { username: ref.toLowerCase() }, select: { id: true } })
      if (referrer && referrer.id !== user.id) {
        await db.atlineReferral.create({ data: { referrerId: referrer.id, referredId: user.id, level: 1 } })
      }
    }
  } catch {}

  // Vérification email DOUCE : on envoie le lien de confirmation sans bloquer l'inscription.
  // Inerte tant que Brevo n'est pas configuré (voir lib/brevo.ts) → l'inscription marche quand même.
  await sendVerificationEmail(user.id, cleanEmail, cleanFirst)

  const res = NextResponse.json({ ok: true })
  res.cookies.delete('atline_ref')
  return res
}
