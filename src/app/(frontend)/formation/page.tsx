import { DashboardShell } from "@/components/dashboard/shell"
import { CurrentLessonCard } from "@/components/formation/current-lesson-card"
import { GlobalProgressBar } from "@/components/formation/progress-bar"
import { ModuleList, type Module } from "@/components/formation/module-list"
import { ProgressSidebar } from "@/components/formation/progress-sidebar"

const modules: Module[] = [
  { number: "01", name: "Mindset & Vision", lessons: 6, duration: 45, status: "done", xp: 150 },
  { number: "02", name: "Prospection", lessons: 8, duration: 60, status: "active", progress: 50, xp: 75 },
  { number: "03", name: "Invitation", lessons: 7, duration: 55, status: "locked" },
  { number: "04", name: "Presentation", lessons: 9, duration: 70, status: "locked" },
  { number: "05", name: "Suivi prospect", lessons: 6, duration: 50, status: "locked" },
  { number: "06", name: "Closing", lessons: 7, duration: 55, status: "locked" },
  { number: "07", name: "Reseaux sociaux", lessons: 8, duration: 65, status: "locked" },
  { number: "08", name: "Leadership", lessons: 6, duration: 50, status: "locked" },
]

export default function FormationPage() {
  return (
    <DashboardShell layout="with-sidebar">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* Main content */}
        <div className="min-w-0 flex-1 lg:max-w-[680px]">
          {/* Page header */}
          <div className="mb-6">
            <h1 className="font-heading text-2xl font-semibold text-white">Formation</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Methode Go Pro — Eric Worre
            </p>
          </div>

          {/* Current lesson card */}
          <CurrentLessonCard
            lessonNumber={4}
            title="La liste de noms"
            moduleNumber={2}
            moduleName="Prospection"
            minutesRemaining={12}
          />

          {/* Global progress */}
          <div className="mt-6">
            <GlobalProgressBar percentage={37} modulesRemaining={3} />
          </div>

          {/* Modules list */}
          <div className="mt-6">
            <ModuleList modules={modules} />
          </div>
        </div>

        {/* Desktop sidebar */}
        <ProgressSidebar
          streak={12}
          totalXP={225}
          nextBadge="Studieux"
          badgeRequirement="5 modules"
          atlasRecommendation="Continue le module Prospection !"
        />
      </div>
    </DashboardShell>
  )
}
