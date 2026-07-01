'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/card'
import { SectionTabs, FORMATION_TABS } from '@/components/section-tabs'
import { cn } from '@/lib/utils'
import { CheckCircle2, ChevronRight } from 'lucide-react'

type ApiModule = {
  id: string
  title: string
  position: number
  _count: { lessons: number }
  progress: { pct: number; status: string }[]
}

type ApiCourse = {
  id: string
  title: string
  modules: ApiModule[]
}

function stripPrefix(title: string) {
  return title.replace(/^Module \d+\s*[—–-]\s*/, '')
}

export default function FormationPage() {
  const [course, setCourse] = useState<ApiCourse | null>(null)

  useEffect(() => {
    fetch('/api/formation/modules').then(r => r.json()).then(setCourse)
  }, [])

  const modules = course?.modules ?? []
  const doneCount = modules.filter(m => m.progress?.[0]?.status === 'DONE').length
  const totalPct = modules.length
    ? Math.round(modules.reduce((acc, m) => acc + (m.progress?.[0]?.pct ?? 0), 0) / modules.length)
    : 0

  return (
    <>
      {/* ── MOBILE ONLY ── */}
      <div className="lg:hidden">
        <div className="flex flex-col gap-4 px-4 pt-5 pb-8">
          {/* Titre géré par la top-bar centrée */}
          <SectionTabs items={FORMATION_TABS} />

          {/* Progression globale */}
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {doneCount}/{modules.length} modules complétés
              </p>
              <span className="text-2xl font-bold text-primary">{totalPct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${totalPct}%` }}
              />
            </div>
          </Card>

          {/* Skeleton pendant le chargement */}
          {!course && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-[72px] animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          )}

          {/* Liste des modules */}
          {course && (
            <div className="flex flex-col gap-2">
              {modules.map((mod) => {
                const pct = mod.progress?.[0]?.pct ?? 0
                const done = mod.progress?.[0]?.status === 'DONE'
                const inProgress = pct > 0 && !done

                return (
                  <Link key={mod.id} href={`/formation/${mod.id}`}>
                    <Card className="transition-colors active:bg-muted/50">
                      <div className="flex items-center gap-3 p-3.5">

                        {/* Badge numéro */}
                        <span className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-xl',
                          done
                            ? 'bg-success'
                            : inProgress
                            ? 'bg-primary'
                            : 'bg-muted'
                        )}>
                          {done ? (
                            <CheckCircle2 className="size-5 stroke-2 text-white" />
                          ) : (
                            <span className={cn(
                              'text-base font-bold',
                              inProgress ? 'text-white' : 'text-muted-foreground'
                            )}>
                              {mod.position + 1}
                            </span>
                          )}
                        </span>

                        {/* Contenu */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {stripPrefix(mod.title)}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {mod._count.lessons} leçons
                          </p>
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </div>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}

        </div>
      </div>


      {/* ══════════════ DESKTOP ══════════════ */}
      <div className="hidden lg:block px-8 pt-8 pb-10 max-w-6xl mx-auto">

        {/* ── En-tête ── */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-[-0.025em] text-foreground">
              Formation
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {doneCount}/{modules.length} modules complétés · {totalPct}% du parcours
            </p>
          </div>
          <div className="w-64">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Progression globale</span>
              <span className="font-bold text-primary">{totalPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${totalPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Grille modules ── */}
        {!course && (
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        )}

        {course && (
          <div className="grid grid-cols-3 gap-4">
            {modules.map((mod) => {
              const pct = mod.progress?.[0]?.pct ?? 0
              const done = mod.progress?.[0]?.status === 'DONE'
              const inProgress = pct > 0 && !done

              return (
                <Link key={mod.id} href={`/formation/${mod.id}`}>
                  <Card className="flex flex-col gap-3 p-5 hover:border-primary/50 transition-colors cursor-pointer">
                    {/* Numéro + badge */}
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        'flex size-10 items-center justify-center rounded-xl text-base font-bold',
                        done ? 'bg-success text-white' : inProgress ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                      )}>
                        {done ? <CheckCircle2 className="size-5 stroke-2" /> : mod.position + 1}
                      </span>
                      {inProgress && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          En cours
                        </span>
                      )}
                      {done && (
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                          Terminé
                        </span>
                      )}
                    </div>

                    {/* Titre */}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                        {stripPrefix(mod.title)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{mod._count.lessons} leçons</p>
                    </div>

                    {/* Barre */}
                    <div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-right text-[10px] text-muted-foreground">{pct}%</p>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
