'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, Sparkles, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const isLogin = mode === 'login'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isLogin) {
      router.push('/home')
    } else {
      router.push('/onboarding')
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
          {/* Prénom + Nom (register only) */}
          {!isLogin && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Prénom
                </label>
                <input
                  type="text"
                  placeholder="Léa"
                  autoComplete="given-name"
                  className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Nom
                </label>
                <input
                  type="text"
                  placeholder="Moreau"
                  autoComplete="family-name"
                  className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              placeholder="toi@exemple.com"
              autoComplete="email"
              className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Mot de passe */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-11 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Confirmer le mot de passe (register only) */}
          {!isLogin && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Confirmer
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-11 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          )}

          {/* CTA principal */}
          <button
            type="submit"
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-lg font-bold text-primary-foreground shadow-md transition-transform active:scale-[0.98]"
          >
            {isLogin ? 'Se connecter' : 'Créer mon compte'}
            <ArrowRight className="size-4" />
          </button>

          {/* Mot de passe oublié (login only) */}
          {isLogin && (
            <button
              type="button"
              className="text-center text-sm font-medium text-muted-foreground transition-colors active:text-foreground"
            >
              Mot de passe oublié ?
            </button>
          )}
        </form>

        {/* Separator */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold text-muted-foreground">ou</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Bouton secondaire */}
        {isLogin ? (
          <button
            type="button"
            onClick={() => router.push('/home')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3.5 text-lg font-semibold text-foreground transition-colors active:bg-muted"
          >
            <Sparkles className="size-4 text-primary" />
            Compte démo
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push('/home')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3.5 text-lg font-semibold text-foreground transition-colors active:bg-muted"
          >
            Continuer sans compte
          </button>
        )}
      </div>

      {/* Toggle login / register */}
      <p className="mt-6 text-sm text-muted-foreground">
        {isLogin ? 'Pas encore de compte ?' : 'Déjà membre ?'}{' '}
        <button
          type="button"
          onClick={() => setMode(isLogin ? 'register' : 'login')}
          className="font-bold text-primary"
        >
          {isLogin ? "S'inscrire" : 'Se connecter'}
        </button>
      </p>
    </div>
  )
}
