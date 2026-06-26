'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { X, ChevronRight, CheckCircle2, Clock, XCircle, Trophy, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── BlockNote renderer ──────────────────────────────────────────────────────

type BNTextNode = { type: 'text'; text: string; styles?: { bold?: boolean; italic?: boolean; underline?: boolean } }
type BNBlock = {
  type: 'heading' | 'paragraph' | 'bulletListItem' | 'numberedListItem' | string
  props?: { level?: number }
  content?: BNTextNode[]
  children?: BNBlock[]
}

function renderText(nodes: BNTextNode[] = []) {
  return nodes.map((n, i) => {
    let el: React.ReactNode = n.text
    if (n.styles?.bold) el = <strong key={i}>{el}</strong>
    if (n.styles?.italic) el = <em key={i}>{el}</em>
    if (n.styles?.underline) el = <u key={i}>{el}</u>
    return <span key={i}>{el}</span>
  })
}

function BlockNoteRenderer({ blocks }: { blocks: BNBlock[] }) {
  let bulletBuffer: BNBlock[] = []
  const elements: React.ReactNode[] = []
  let isRef = false

  const flushBullets = (key: string) => {
    if (bulletBuffer.length === 0) return
    elements.push(
      <ul key={key} className={isRef ? 'my-1 flex flex-col gap-3 pl-4' : 'my-2 flex flex-col gap-1.5 pl-4'}>
        {bulletBuffer.map((b, i) => (
          <li key={i} className={isRef
            ? 'relative pl-3 text-xs text-muted-foreground leading-relaxed before:absolute before:left-0 before:top-[0.5em] before:size-1 before:rounded-full before:bg-muted-foreground'
            : 'relative pl-3 text-lg text-foreground leading-relaxed before:absolute before:left-0 before:top-[0.55em] before:size-1.5 before:rounded-full before:bg-primary'
          }>
            {renderText(b.content)}
          </li>
        ))}
      </ul>
    )
    bulletBuffer = []
  }

  blocks.forEach((block, idx) => {
    const blockText = block.content?.map(n => n.text).join('') ?? ''
    const isRefsHeading = block.type === 'heading' && /^Références?/i.test(blockText.trim())

    if (block.type === 'bulletListItem') {
      bulletBuffer.push(block)
      return
    }

    flushBullets(`ul-${idx}`)
    if (isRefsHeading) isRef = true

    if (block.type === 'heading') {
      const level = block.props?.level ?? 2
      const cls = isRef
        ? 'mt-6 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground'
        : level === 2 ? 'mt-6 mb-2 text-2xl font-bold text-foreground'
        : 'mt-4 mb-1 text-lg font-semibold text-foreground'
      elements.push(<p key={idx} className={cls}>{renderText(block.content)}</p>)
      return
    }

    if (block.type === 'paragraph') {
      if (!blockText.trim()) return
      elements.push(
        <p key={idx} className={isRef
          ? 'text-xs text-muted-foreground leading-relaxed'
          : 'text-lg text-foreground leading-relaxed'
        }>
          {renderText(block.content)}
        </p>
      )
    }
  })
  flushBullets('ul-end')

  return <div className="flex flex-col gap-3">{elements}</div>
}

// ── Quiz Player ─────────────────────────────────────────────────────────────

type Question = {
  id: string
  position: number
  type: string
  question: string
  options: string[]
  correctAnswer: number | null
  correctBool: boolean | null
}

type QuizPhase = 'playing' | 'result'

function QuizPlayer({
  questions,
  passThreshold,
  lessonId,
  nextLesson,
  moduleId,
  onDone,
  onProgress,
}: {
  questions: Question[]
  passThreshold: number
  lessonId: string
  nextLesson: { id: string; title: string; kind: string } | null
  moduleId: string
  done: boolean
  onDone: (passed: boolean) => void
  onProgress: (current: number, total: number, phase: 'playing' | 'result') => void
}) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<(number | null)[]>(Array(questions.length).fill(null))
  const [phase, setPhase] = useState<QuizPhase>('playing')
  const [score, setScore] = useState(0)

  useEffect(() => {
    onProgress(currentIdx, questions.length, phase)
  }, [currentIdx, phase])

  const q = questions[currentIdx]
  const isAnswered = selected !== null
  const correctIdx = q?.type === 'TRUEFALSE' ? (q.correctBool ? 0 : 1) : (q?.correctAnswer ?? 0)

  const handleSelect = (idx: number) => {
    if (isAnswered) return
    setSelected(idx)
    const newAnswers = [...answers]
    newAnswers[currentIdx] = idx
    setAnswers(newAnswers)
  }

  const handleNext = async () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1)
      setSelected(null)
    } else {
      const finalAnswers = [...answers]
      finalAnswers[currentIdx] = selected

      let correct = 0
      questions.forEach((q, i) => {
        const exp = q.type === 'TRUEFALSE' ? (q.correctBool ? 0 : 1) : (q.correctAnswer ?? 0)
        if (finalAnswers[i] === exp) correct++
      })

      const pct = Math.round((correct / questions.length) * 100)
      setScore(pct)
      setPhase('result')
      setAnswers(finalAnswers)
      onProgress(questions.length, questions.length, 'result')

      try {
        await fetch('/api/formation/quiz-attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId, score: pct, passed: pct >= passThreshold, answers: finalAnswers }),
        })
        if (pct >= passThreshold) {
          await fetch('/api/formation/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lessonId, done: true }),
          })
          onDone(pct >= passThreshold)
        }
      } catch (_) {}
    }
  }

  const handleRetry = () => {
    setCurrentIdx(0)
    setSelected(null)
    setAnswers(Array(questions.length).fill(null))
    setPhase('playing')
    setScore(0)
  }

  const passed = score >= passThreshold

  if (phase === 'result') {
    const correctCount = questions.filter((q, i) => {
      const exp = q.type === 'TRUEFALSE' ? (q.correctBool ? 0 : 1) : (q.correctAnswer ?? 0)
      return answers[i] === exp
    }).length

    return (
      <>
      <div className={cn(
        'flex-1 overflow-y-auto no-scrollbar flex flex-col pb-4',
        passed ? 'justify-center gap-8' : 'gap-6'
      )}>
        {/* Score card */}
        <div className={cn(
          'flex flex-col items-center gap-3 rounded-3xl p-8',
          passed ? 'bg-success/10' : 'bg-destructive/10'
        )}>
          {passed
            ? <CheckCircle2 className="size-14 text-success stroke-[1.5]" />
            : <XCircle className="size-14 text-destructive stroke-[1.5]" />
          }
          <p className="text-[40px] font-extrabold leading-none text-foreground">{score}%</p>
          <p className="text-sm font-semibold text-muted-foreground">
            {passed ? 'Quiz réussi !' : `Seuil requis : ${passThreshold}%`}
          </p>
          <p className="text-xs text-muted-foreground">
            {correctCount} / {questions.length} bonnes réponses
          </p>
        </div>

        {/* Message contextuel */}
        <p className="text-center text-base text-muted-foreground leading-relaxed px-2">
          {passed
            ? 'Tu maîtrises ce module. Ferme pour récupérer ton badge.'
            : 'Révise les leçons du module et réessaye dans 24 heures.'
          }
        </p>

        {/* Questions ratées (quiz échoué seulement) */}
        {!passed && (
          <div className="flex flex-col gap-2">
            {questions.map((q, i) => {
              const exp = q.type === 'TRUEFALSE' ? (q.correctBool ? 0 : 1) : (q.correctAnswer ?? 0)
              const isOk = answers[i] === exp
              if (isOk) return null
              return (
                <div key={q.id} className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-3.5">
                  <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-2">{q.question}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Bonne réponse : {q.options[exp]}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      </>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="shrink-0 pb-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Question {currentIdx + 1} / {questions.length}</span>
            <span>{Math.round((currentIdx / questions.length) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${(currentIdx / questions.length) * 100}%` }}
            />
          </div>
        </div>
  
        <p className="mt-4 text-xl font-bold text-foreground leading-snug">{q.question}</p>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar pb-[88px] flex flex-col gap-2.5">
        {q.options.map((opt, i) => {
          const isSelected = selected === i
          const isCorrect = i === correctIdx
          let cls = 'rounded-2xl border px-4 py-3.5 text-left text-base font-medium transition-all active:scale-[0.99] min-h-[4rem] flex items-center '

          if (!isAnswered) {
            cls += 'border-border text-foreground bg-surface active:bg-muted/50'
          } else if (isCorrect) {
            cls += 'border-success bg-success/10 text-success'
          } else if (isSelected && !isCorrect) {
            cls += 'border-destructive bg-destructive/10 text-destructive'
          } else {
            cls += 'border-border/50 text-muted-foreground bg-transparent'
          }

          return (
            <button key={i} type="button" className={cls} onClick={() => handleSelect(i)}>
              {opt}
            </button>
          )
        })}
      </div>

      {/* Spacer for fixed button */}
      <div className="h-[88px]" />

      <div
        className="fixed bottom-0 left-0 right-0 z-[61] bg-background px-4 py-4"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={isAnswered ? handleNext : undefined}
          className={`w-full rounded-2xl py-4 text-lg font-semibold text-white transition-all ${isAnswered ? 'bg-primary active:scale-[0.98]' : 'bg-primary/30 cursor-default'}`}
        >
          {currentIdx < questions.length - 1 ? "Question suivante" : "Voir les résultats"}
        </button>
      </div>
    </div>
  )
}

// ── Types ───────────────────────────────────────────────────────────────────

type NavLesson = { id: string; title: string; kind: string }

type Lesson = {
  id: string
  title: string
  intro: string | null
  position: number
  kind: 'LESSON' | 'QUIZ'
  durationMin: number | null
  content: BNBlock[] | null
  questions: Question[]
  passThreshold: number
  moduleTitle: string | null
  modulePosition: number
  total: number
  nextLesson: NavLesson | null
  prevLesson: NavLesson | null
  done: boolean
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function LessonPage() {
  const router = useRouter()
  const rawParams = useParams()
  const moduleId = rawParams.moduleId as string
  const lessonId = rawParams.lessonId as string

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [isQuizPage, setIsQuizPage] = useState(false)
  const [done, setDone] = useState(false)
  const [quizPassed, setQuizPassed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const [showCongratsModal, setShowCongratsModal] = useState(false)
  const [showFailModal, setShowFailModal] = useState(false)
  const [quizProgress, setQuizProgress] = useState({ current: 0, total: 0, phase: 'playing' as 'playing' | 'result' })

  useEffect(() => {
    fetch(`/api/formation/modules/${moduleId}/lessons/${lessonId}`)
      .then(r => r.json())
      .then((data: Lesson) => { setLesson(data); setDone(data.done); setIsQuizPage(data.kind === 'QUIZ') })
  }, [moduleId, lessonId])

  const markDone = useCallback(async () => {
    if (done || saving) return
    setSaving(true)
    await fetch('/api/formation/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId, done: true }),
    })
    setDone(true)
    setSaving(false)
  }, [done, saving, lessonId])

  const lessonNum = (lesson?.position ?? 0) + 1
  const total = lesson?.total ?? 0
  const isQuiz = lesson?.kind === 'QUIZ'

  return (
    <div
      className={isQuizPage ? "fixed inset-0 z-[60] flex flex-col bg-background animate-slide-in-right" : "min-h-screen bg-background animate-slide-in-right"}
    >
      {/* Header sticky */}
      <div
        className="sticky top-0 z-10 relative flex items-center justify-center border-b border-border bg-background/90 px-2 backdrop-blur"
        style={{ height: 56, paddingTop: 'env(safe-area-inset-top)' }}
      >
        <button
          type="button"
          onClick={() => {
            if (isQuiz && quizProgress.phase === 'result' && quizPassed) {
              setShowCongratsModal(true)
            } else if (isQuiz && quizProgress.phase === 'result' && !quizPassed) {
              setShowFailModal(true)
            } else if (isQuiz && quizProgress.phase === 'playing' && quizProgress.current > 0) {
              setShowExitModal(true)
            } else {
              router.push(`/formation/${moduleId}`)
            }
          }}
          className="absolute left-2 flex size-9 items-center justify-center rounded-full text-foreground active:bg-muted"
        >
          <X className="size-6" />
        </button>
        <div className="flex flex-col items-center">
          {lesson?.moduleTitle && (
            <p className="text-[10px] text-muted-foreground leading-none mb-0.5">
              Module {lesson.modulePosition + 1}
            </p>
          )}
          <p className="text-sm font-semibold text-foreground">
            {isQuiz ? 'Quiz' : `Leçon ${lessonNum} / ${total}`}
          </p>
        </div>
        {done && (
          <div className="absolute right-2 flex size-9 items-center justify-center">
            <CheckCircle2 className="size-5 text-success stroke-2" />
          </div>
        )}
      </div>

      {/* Modal confirmation quitter quiz */}
      {showExitModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full rounded-3xl bg-background p-8 flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <p className="text-2xl font-bold text-foreground text-center">Quiz en cours</p>
              <p className="text-lg text-muted-foreground leading-relaxed text-center">
                Il vous reste {quizProgress.total - quizProgress.current} question{quizProgress.total - quizProgress.current > 1 ? 's' : ''}. Votre progression sera perdue si vous quittez maintenant.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowExitModal(false)}
              className="w-full rounded-2xl bg-primary py-4 text-lg font-semibold text-white active:scale-[0.98] transition-transform"
            >
              Continuer le quiz
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full rounded-2xl border border-border py-4 text-lg font-semibold text-foreground active:bg-muted/50"
            >
              Quitter
            </button>
          </div>
        </div>
      )}

      {/* Modal quiz échoué */}
      {showFailModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full rounded-3xl bg-background p-8 flex flex-col gap-6">
            <div className="flex flex-col gap-3 items-center text-center">
              <div className="flex size-20 items-center justify-center rounded-full bg-destructive/10">
                <BookOpen className="size-10 text-destructive" />
              </div>
              <p className="text-2xl font-bold text-foreground">Pas encore !</p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Révise les leçons du module et réessaye dans{' '}
                <span className="font-semibold text-foreground">24 heures</span>.
                Tu vas y arriver !
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full rounded-2xl bg-primary py-4 text-lg font-semibold text-white active:scale-[0.98] transition-transform"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Modal félicitation quiz réussi */}
      {showCongratsModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full rounded-3xl bg-background p-8 flex flex-col gap-6">
            <div className="flex flex-col gap-3 items-center text-center">
              <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
                <Trophy className="size-10 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">Félicitations !</p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Tu as réussi ce quiz et débloqué le{' '}
                <span className="font-semibold text-primary">
                  badge Module {(lesson?.modulePosition ?? 0) + 1}
                </span>.
                Il y a 11 badges au total à collectionner.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/formation")}
              className="w-full rounded-2xl bg-primary py-4 text-lg font-semibold text-white active:scale-[0.98] transition-transform"
            >
              Continuer à apprendre
            </button>
            <p className="text-center text-sm text-muted-foreground">ou entraîne-toi avec Atlas ou Aria</p>
          </div>
        </div>
      )}

      {/* Body */}
      <div className={isQuizPage ? "flex-1 flex flex-col overflow-hidden px-4 pt-6" : "flex flex-col gap-5 px-4 pt-6 pb-10"}>

        {!lesson && (
          <div className="space-y-3">
            <div className="h-8 w-3/4 animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
          </div>
        )}

        {lesson && (
          <>
            <div>
              <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-[-0.025em] text-foreground">
                {lesson.title}
              </h1>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                {!isQuiz && lesson.durationMin && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" />
                    {lesson.durationMin} min
                  </span>
                )}
                {isQuiz && (
                  <span>{lesson.questions.length} questions · seuil {lesson.passThreshold}%</span>
                )}
                {!isQuiz && lesson.intro && (
                  <span className="line-clamp-2 text-sm">{lesson.intro}</span>
                )}
              </div>
            </div>

            <div className="h-px bg-border" />

            {isQuiz && lesson.questions.length > 0 && (
              <QuizPlayer
                questions={lesson.questions}
                passThreshold={lesson.passThreshold ?? 80}
                lessonId={lessonId}
                nextLesson={lesson.nextLesson}
                moduleId={moduleId}
                done={done}
                onDone={(p) => { setDone(true); setQuizPassed(p) }}
                onProgress={(current, total, phase) => setQuizProgress({ current, total, phase })}
              />
            )}

            {!isQuiz && (
              <>
                {lesson.content && lesson.content.length > 0 && (
                  <BlockNoteRenderer blocks={lesson.content} />
                )}

                <div className="h-px bg-border" />

                <button
                  type="button"
                  onClick={markDone}
                  disabled={done || saving}
                  className={cn(
                    'w-full rounded-2xl py-3 text-base font-semibold transition-all active:scale-[0.98]',
                    done
                      ? 'bg-success/15 text-success cursor-default'
                      : 'bg-primary text-white'
                  )}
                >
                  {done ? '✓ Leçon terminée' : saving ? 'Enregistrement…' : 'Marquer comme terminée'}
                </button>

                {lesson.nextLesson && (
                  <Link href={`/formation/${moduleId}/${lesson.nextLesson.id}`} className="block w-full">
                    <div className="w-full rounded-2xl bg-surface py-3 px-4 flex items-center justify-between active:opacity-80">
                      <p className="text-base font-semibold text-foreground line-clamp-1 flex-1">
                        {lesson.nextLesson.title}
                      </p>
                      <ChevronRight className="ml-3 size-6 shrink-0 text-muted-foreground" />
                    </div>
                  </Link>
                )}

                {!lesson.nextLesson && (
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-full rounded-2xl border border-border py-4 text-lg font-semibold text-foreground active:bg-muted/50"
                  >
                    Retour au module
                  </button>
                )}
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}
