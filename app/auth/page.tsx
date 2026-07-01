'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { signIn } from 'next-auth/react'
import { Eye, EyeOff, Sparkles, ArrowRight, Loader2, Check, X, RefreshCw } from 'lucide-react'

type Mode = 'login' | 'register'
type UStatus = 'idle' | 'checking' | 'ok' | 'taken' | 'invalid'

const UNAME_FORMAT = /^[a-z0-9._]{3,20}$/

// Capitale initiale, gère composés / tirets / apostrophes : "haure-pallesi" → "Haure-Pallesi"
const titleCase = (s: string) =>
  s.trim().toLowerCase().replace(/(^|[\s\-'])([a-zà-ÿ])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase())

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const isLogin = mode === 'login'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (isLogin) {
      const res = await signIn('credentials', { email, password, redirect: false })
      if (res?.error) {
        setError('Email ou mot de passe incorrect')
        setLoading(false)
        return
      }
      router.push('/atlas')
    } else {
      if (password !== confirm) {
        setError('Les mots de passe ne correspondent pas')
        setLoading(false)
        return
      }
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erreur lors de la création du compte')
        setLoading(false)
        return
      }
      const login = await signIn('credentials', { email, password, redirect: false })
      if (login?.error) {
        setError('Compte créé mais connexion échouée, réessaie.')
        setLoading(false)
        return
      }
      router.push('/onboarding')
    }
  }

  const handleDemo = async () => {
    setLoading(true)
    const res = await signIn('credentials', {
      email: 'demo@atline.ai',
      password: 'demo1234',
      redirect: false,
    })
    if (res?.error) {
      router.push('/atlas')
    } else {
      router.push('/atlas')
    }
  }

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-5 py-10"
      style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top))' }}
    >
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <Image
          src="/brand/atline-icon.png"
          alt="Atline"
          width={56}
          height={56}
          className="rounded-[16px] shadow-md"
        />
        <span className="font-display text-2xl font-extrabold tracking-tight text-foreground">
          atline
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-[360px] rounded-3xl border border-border bg-surface p-6 shadow-card">
        <h1 className="mb-6 font-display text-2xl font-bold text-foreground">
          {isLogin ? 'Content de te revoir' : 'Rejoins Atline'}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Prénom</label>
                <input
                  type="text"
                  placeholder="Léa"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  onBlur={() => setFirstName(titleCase(firstName))}
                  required
                  className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nom</label>
                <input
                  type="text"
                  placeholder="Moreau"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  onBlur={() => setLastName(titleCase(lastName))}
                  required
                  className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {isLogin ? 'Email ou identifiant' : 'Email'}
            </label>
            <input
              type={isLogin ? 'text' : 'email'}
              placeholder={isLogin ? 'email ou @pseudo' : 'toi@exemple.com'}
              autoComplete={isLogin ? 'username' : 'email'}
              value={email}
              onChange={e => setEmail(e.target.value.toLowerCase())}
              required
              className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mot de passe</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="Mot de passe"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-11 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
              />
              <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 outline-none focus:outline-none">
                {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Confirmer</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirmer"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-11 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 outline-none focus:outline-none">
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-lg font-bold text-primary-foreground shadow-md transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : (
              <>{isLogin ? 'Se connecter' : 'Créer mon compte'}<ArrowRight className="size-4" /></>
            )}
          </button>

          {isLogin && (
            <button type="button" className="text-center text-sm font-medium text-muted-foreground transition-colors active:text-foreground">
              Mot de passe oublié ?
            </button>
          )}
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold text-muted-foreground">ou</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/onboarding' })}
          disabled={loading}
          className="mb-3 flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-background py-3.5 text-base font-semibold text-foreground transition-colors active:bg-muted disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Continuer avec Google
        </button>

        {isLogin ? (
          <button
            type="button"
            onClick={handleDemo}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3.5 text-lg font-semibold text-foreground transition-colors active:bg-muted disabled:opacity-60"
          >
            <Sparkles className="size-4 text-primary" />
            Compte démo
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { setMode('login') }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3.5 text-lg font-semibold text-foreground transition-colors active:bg-muted"
          >
            J&apos;ai déjà un compte
          </button>
        )}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        {isLogin ? 'Pas encore de compte ?' : 'Déjà membre ?'}{' '}
        <button
          type="button"
          onClick={() => { setMode(isLogin ? 'register' : 'login'); setError('') }}
          className="font-bold text-primary"
        >
          {isLogin ? "S'inscrire" : 'Se connecter'}
        </button>
      </p>
    </div>
  )
}
