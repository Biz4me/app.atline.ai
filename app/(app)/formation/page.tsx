'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/card'
import { SectionTabs, FORMATION_TABS } from '@/components/section-tabs'
import { cn } from '@/lib/utils'
import { CheckCircle2, ChevronRight, BookOpen, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { PageShell } from '@/components/page-shell'

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

          {/* Progression globale — alignée sur la barre du profil (bande nue, % orange inline) */}
          <div className="px-1">
            <p className="mb-1.5 text-base font-semibold text-foreground">{doneCount}/{modules.length} modules complétés · <span className="text-primary">{totalPct}%</span></p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${totalPct}%` }} />
            </div>
          </div>

          {/* Skeleton pendant le chargement */}
          {!course && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-[72px] animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          )}

          {/* Liste des modules — un module est VERROUILLÉ tant que le précédent n'est pas terminé */}
          {course && (
            <div className="flex flex-col gap-2">
              {modules.map((mod, i) => {
                const pct = mod.progress?.[0]?.pct ?? 0
                const done = mod.progress?.[0]?.status === 'DONE'
                const inProgress = pct > 0 && !done
                const locked = i > 0 && modules[i - 1].progress?.[0]?.status !== 'DONE'

                const inner = (
                  <Card className={cn('transition-colors', locked ? 'opacity-60' : 'active:bg-muted/50')}>
                    <div className="flex items-center gap-3 p-3.5">
                      <span className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-xl',
                        done ? 'bg-success' : inProgress ? 'bg-primary' : 'bg-muted'
                      )}>
                        {done ? <CheckCircle2 className="size-5 stroke-2 text-white" />
                          : locked ? <Lock className="size-4 stroke-[1.5] text-muted-foreground" />
                          : <span className={cn('text-base font-bold', inProgress ? 'text-white' : 'text-muted-foreground')}>{mod.position + 1}</span>}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-semibold text-foreground">{stripPrefix(mod.title)}</p>
                        <p className="mt-0.5 text-base text-muted-foreground">
                          {locked ? 'Termine le module précédent pour débloquer' : `${mod._count.lessons} leçons`}
                        </p>
                        {!locked && (
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </div>
                      {locked ? <Lock className="size-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
                    </div>
                  </Card>
                )

                return locked
                  ? <button key={mod.id} type="button" onClick={() => toast('Termine le module précédent pour débloquer celui-ci.')} className="text-left">{inner}</button>
                  : <Link key={mod.id} href={`/formation/${mod.id}`}>{inner}</Link>
              })}
            </div>
          )}

        </div>
      </div>


      {/* ══════════════ DESKTOP — gabarit unique (large), un module par LIGNE ══════════════ */}
      <PageShell title="Formation" icon={BookOpen} wide>
        <p className="mb-5 text-sm text-muted-foreground">
          {doneCount}/{modules.length} modules complétés · {totalPct}% du parcours
        </p>
        <div className="flex flex-col gap-3">
          {!course && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[68px] animate-pulse rounded-2xl bg-muted" />
          ))}
          {course && modules.map((mod, i) => {
            const pct = mod.progress?.[0]?.pct ?? 0
            const done = mod.progress?.[0]?.status === 'DONE'
            const inProgress = pct > 0 && !done
            const locked = i > 0 && modules[i - 1].progress?.[0]?.status !== 'DONE'

            const inner = (
              <Card className={cn('flex items-center gap-4 p-4 transition-colors', locked ? 'opacity-60' : 'hover:border-primary/50')}>
                <span className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-xl text-base font-bold',
                  done ? 'bg-success text-white' : inProgress ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                )}>
                  {done ? <CheckCircle2 className="size-5 stroke-2" /> : locked ? <Lock className="size-4 stroke-[1.5]" /> : mod.position + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{stripPrefix(mod.title)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{locked ? 'Termine le module précédent pour débloquer' : `${mod._count.lessons} leçons`}</p>
                </div>
                {!locked && (
                  <div className="hidden w-40 shrink-0 sm:block">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-right text-[10px] text-muted-foreground">{pct}%</p>
                  </div>
                )}
                {inProgress && <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">En cours</span>}
                {done && <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">Terminé</span>}
                {locked ? <Lock className="size-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
              </Card>
            )

            return locked
              ? <button key={mod.id} type="button" onClick={() => toast('Termine le module précédent pour débloquer celui-ci.')} className="text-left">{inner}</button>
              : <Link key={mod.id} href={`/formation/${mod.id}`}>{inner}</Link>
          })}
        </div>
      </PageShell>
    </>
  )
}
