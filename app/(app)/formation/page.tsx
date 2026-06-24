'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/top-bar'
import { Card } from '@/components/card'
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
        <TopBar />
        <div className="flex flex-col gap-4 px-4 pt-5 pb-8">
          <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-[-0.025em] text-foreground">
            Formation
          </h1>

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
                          <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                            {stripPrefix(mod.title)}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {mod._count.lessons} leçons
                          </p>
                          {inProgress && (
                            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
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

      {/* ── DESKTOP ONLY ── */}
      <div className="hidden lg:block" />
    </>
  )
}
