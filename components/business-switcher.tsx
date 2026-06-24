'use client'

import { useRef, useState, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, Plus, X, Users, GitFork, UserCheck, Calendar } from 'lucide-react'
import { useBusiness } from '@/components/business-provider'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const COMPANIES = [
  'Herbalife', 'Forever Living', 'Atomy', 'Tupperware',
  'Amway', 'Nu Skin', 'USANA', 'doTERRA', 'Young Living', 'Oriflame',
  '4Life', 'Jeunesse', 'Primerica', 'Avon', 'Autre',
]

interface Props {
  collapsed?: boolean
  variant?: 'sheet' | 'popover'
  fullWidth?: boolean
}

export function BusinessSwitcher({ collapsed, variant = 'sheet', fullWidth = false }: Props) {
  const { current, all, setCurrent, addBusiness } = useBusiness()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [dropMounted, setDropMounted] = useState(false)
  const [dropVisible, setDropVisible] = useState(false)
  const [addMode, setAddMode] = useState(false)
  const [newName, setNewName] = useState('')
  const [dropTop, setDropTop] = useState(0)
  const [dropBottom, setDropBottom] = useState(0)
  const dropRef = useRef<HTMLDivElement>(null)

  // Add page state
  const [addPageMounted, setAddPageMounted] = useState(false)
  const [addPageVisible, setAddPageVisible] = useState(false)
  const [company, setCompany] = useState('')
  const [showCompanyPicker, setShowCompanyPicker] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [nbDirect, setNbDirect] = useState('')
  const [nbTotal, setNbTotal] = useState('')
  const [nbClients, setNbClients] = useState('')
  const [sharedWith, setSharedWith] = useState<string[]>([])
  const [shareToggle, setShareToggle] = useState(false)

  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (variant !== 'popover') return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setAddMode(false)
        setNewName('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [variant])

  function openDropdown() {
    if (fullWidth) {
      if (open) {
        // close with animation
        setDropVisible(false)
        setTimeout(() => { setDropMounted(false); setOpen(false) }, 300)
      } else {
        if (ref.current) {
          const rect = ref.current.getBoundingClientRect()
          setDropTop(rect.bottom)
        }
        setOpen(true)
        setDropMounted(true)
        requestAnimationFrame(() => setDropVisible(true))
      }
    } else {
      setOpen(v => !v)
    }
  }

  function closeDropdown() {
    setDropVisible(false)
    setTimeout(() => { setDropMounted(false); setOpen(false) }, 300)
  }

  useLayoutEffect(() => {
    if (dropMounted && dropRef.current) {
      setDropBottom(dropTop + dropRef.current.offsetHeight)
    }
  }, [dropMounted, dropTop])

  useEffect(() => {
    if (addMode && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [addMode])

  function openAddPage() {
    setOpen(false)
    setAddPageMounted(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setAddPageVisible(true)))
  }

  function closeAddPage() {
    setAddPageVisible(false)
    setTimeout(() => {
      setAddPageMounted(false)
      setCompany(''); setStartDate(''); setNbDirect(''); setNbTotal('')
      setNbClients(''); setSharedWith([]); setShareToggle(false)
      setShowCompanyPicker(false)
    }, 300)
  }

  function handleAdd() {
    if (!company.trim()) return
    addBusiness(company.trim())
    closeAddPage()
  }

  function handleDesktopAdd() {
    if (!newName.trim()) return
    addBusiness(newName.trim())
    setNewName('')
    setAddMode(false)
    setOpen(false)
  }

  function toggleShared(id: string) {
    setSharedWith(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  /* ── Desktop trigger ── */
  const desktopTrigger = collapsed ? (
    <button
      type="button"
      onClick={() => setOpen(v => !v)}
      className="flex size-9 items-center justify-center rounded-full transition-colors hover:ring-2 hover:ring-border"
      title={current.name}
    >
      <span
        className="flex size-9 items-center justify-center rounded-full text-[13px] font-bold text-white"
        style={{ backgroundColor: current.color }}
      >
        {current.initials}
      </span>
    </button>
  ) : (
    <button
      type="button"
      onClick={openDropdown}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-bold transition-colors hover:bg-muted outline-none',
        open && 'bg-muted',
      )}
    >
      <span
        className="flex size-6 items-center justify-center rounded-full text-[11px] font-bold text-white shrink-0"
        style={{ backgroundColor: current.color }}
      >
        {current.initials}
      </span>
      {current.name}
      <ChevronDown className={cn('size-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
    </button>
  )

  /* ── Mobile trigger ── */
  const mobileTrigger = (
    <button type="button" onClick={openDropdown} className="outline-none">
      <span
        className="flex size-10 items-center justify-center rounded-full text-[13px] font-bold text-white"
        style={{ backgroundColor: current.color }}
      >
        {current.initials}
      </span>
    </button>
  )

  /* ── Popover ── */
  if (variant === 'popover') {
    return (
      <>
        <div ref={ref} className="relative">
          {fullWidth ? mobileTrigger : desktopTrigger}

          {/* Desktop dropdown */}
          {!fullWidth && open && (
            <div
              className="fixed left-0 w-56 rounded-b-xl shadow-lg border-b border-border bg-background z-[60] overflow-hidden py-1"
              style={{ top: '3.5rem' }}
            >
              {all.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => { setCurrent(b); setOpen(false) }}
                  className="flex w-full items-center gap-2.5 pl-6 pr-3 py-2"
                >
                  <span
                    className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: b.color }}
                  >
                    {b.initials}
                  </span>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-foreground truncate">{b.name}</p>
                  </div>
                </button>
              ))}
              {addMode ? (
                <div className="flex items-center gap-2 pl-[58px] pr-3 py-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleDesktopAdd()
                      if (e.key === 'Escape') { setAddMode(false); setNewName('') }
                    }}
                    placeholder="Nom de l'activité…"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
                  />
                  {newName.trim() && (
                    <button type="button" onClick={handleDesktopAdd} className="text-primary text-sm font-semibold shrink-0">
                      OK
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setOpen(false); router.push('/activities/new') }}
                  className="flex w-full items-center justify-center py-2 text-primary/60 hover:text-primary transition-colors"
                >
                  <Plus className="size-4" />
                </button>
              )}
            </div>
          )}

          {/* Mobile rangée horizontale */}
          {fullWidth && dropMounted && typeof window !== 'undefined' && createPortal(
            <div
              className="fixed inset-x-0 bottom-0 z-[59] bg-black/40 transition-opacity duration-300"
              style={{ top: dropBottom, opacity: dropVisible ? 1 : 0 }}
              onClick={closeDropdown}
            />,
            document.body
          )}
          {fullWidth && dropMounted && (
            <div
              className="fixed left-0 right-0 z-[60]"
              style={{ top: dropTop, clipPath: 'inset(0 0 0 0)' }}
            >
            <div
              ref={dropRef}
              className="bg-background border-b border-border px-4 py-3 transition-transform duration-300 ease-out"
              style={{ transform: dropVisible ? 'translateY(0)' : 'translateY(-100%)' }}
            >
              <div className="flex items-start gap-5">
                {all.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => { setCurrent(b); closeDropdown() }}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={cn(
                        'flex size-10 items-center justify-center rounded-full text-[13px] font-bold text-white transition-all',
                        current.id === b.id && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                      )}
                      style={{ backgroundColor: b.color }}
                    >
                      {b.initials}
                    </span>
                    <span className="text-xs font-medium text-foreground text-center max-w-[56px] truncate">
                      {b.name}
                    </span>
                  </button>
                ))}
                <button type="button" onClick={openAddPage} className="flex flex-col items-center gap-1.5">
                  <span className="flex size-10 items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground">
                    <Plus className="size-4" />
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">Ajouter</span>
                </button>
              </div>
            </div>
            </div>
          )}
        </div>

        {/* Page slide-in ajout (mobile) */}
        {addPageMounted && typeof window !== 'undefined' && createPortal(
          <div
            className={cn(
              'fixed inset-0 z-[200] flex flex-col bg-background transition-transform duration-300 ease-out',
              addPageVisible ? 'translate-x-0' : 'translate-x-full',
            )}
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Header fixe */}
            <div className="relative flex items-center justify-center px-2 h-14 shrink-0">
              <button
                type="button"
                onClick={closeAddPage}
                className="absolute left-2 flex size-9 items-center justify-center rounded-full text-foreground active:bg-muted"
              >
                <X className="size-5" />
              </button>
              <p className="text-sm font-semibold text-foreground">Nouvelle activité</p>
            </div>

            {/* Contenu scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="px-4 pt-6 pb-8 flex flex-col gap-6">

                {/* ── Section 1 : Activité ── */}
                <div className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-border">
                    <p className="text-sm font-semibold text-foreground">Activité</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCompanyPicker(v => !v)}
                    className="flex w-full items-center justify-between px-4 py-3.5 border-b border-border"
                  >
                    <span className={cn('text-sm', company ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                      {company || 'Choisir une entreprise…'}
                    </span>
                    <ChevronDown className={cn('size-4 text-muted-foreground transition-transform shrink-0', showCompanyPicker && 'rotate-180')} />
                  </button>
                  {showCompanyPicker && (
                    <div className="max-h-44 overflow-y-auto border-b border-border">
                      {COMPANIES.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => { setCompany(c); setShowCompanyPicker(false) }}
                          className={cn(
                            'flex w-full items-center justify-between px-4 py-3 text-sm border-b border-border last:border-0',
                            company === c ? 'text-primary font-semibold' : 'text-foreground',
                          )}
                        >
                          {c}
                          {company === c && <Check className="size-4 text-primary shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => dateRef.current?.showPicker()}
                      className="flex w-full items-center justify-between px-4 py-3.5"
                    >
                      <span className={cn('text-sm', startDate ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                        {startDate
                          ? new Date(startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                          : 'Date de démarrage'}
                      </span>
                      <Calendar className="size-4 text-muted-foreground shrink-0" />
                    </button>
                    <input
                      ref={dateRef}
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="absolute inset-0 opacity-0 pointer-events-none"
                    />
                  </div>
                </div>

                {/* ── Section 2 : Structure initiale ── */}
                <div className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-border flex items-baseline gap-2">
                    <p className="text-sm font-semibold text-foreground">Structure initiale</p>
                    <span className="text-xs text-muted-foreground">— optionnel</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 px-4 py-3.5">
                    {[
                      { line1: 'Partenaires', line2: 'directs',      value: nbDirect,  set: setNbDirect  },
                      { line1: 'Organisation', line2: 'totale',       value: nbTotal,   set: setNbTotal   },
                      { line1: 'Clients',      line2: 'directs',      value: nbClients, set: setNbClients },
                    ].map(({ line1, line2, value, set }) => (
                      <div key={line1} className="flex flex-col items-center gap-0.5 rounded-xl bg-muted/50 px-2 py-2.5">
                        <input
                          type="number"
                          min="0"
                          value={value}
                          onChange={e => set(e.target.value)}
                          placeholder="0"
                          className="w-full bg-transparent text-center text-lg font-bold text-foreground outline-none placeholder:text-muted-foreground/40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                        />
                        <p className="text-xs text-muted-foreground text-center leading-tight">{line1}<br/>{line2}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Section 3 : Base de contacts ── */}
                <div className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-border">
                    <p className="text-sm font-semibold text-foreground">Base de contacts</p>
                  </div>
                  {all.length === 1 ? (
                    <div className="px-4 py-3.5 flex items-center justify-between">
                      <div className="flex-1 pr-4">
                        <p className="text-sm font-medium text-foreground">Partager avec {all[0].name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Contacts accessibles depuis les deux activités</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShareToggle(v => !v)}
                        className={cn(
                          'relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200',
                          shareToggle ? 'bg-primary' : 'bg-muted',
                        )}
                      >
                        <span
                          className="absolute top-1 left-1 size-4 rounded-full bg-white shadow transition-transform duration-200"
                          style={{ transform: shareToggle ? 'translateX(20px)' : 'translateX(0)' }}
                        />
                      </button>
                    </div>
                  ) : (
                    <div className="max-h-52 overflow-y-auto">
                      {all.map((b, i) => {
                        const checked = sharedWith.includes(b.id)
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => toggleShared(b.id)}
                            className={cn(
                              'flex w-full items-center gap-3 px-4 py-3.5 text-left',
                              i < all.length - 1 && 'border-b border-border',
                              checked && 'bg-primary/5',
                            )}
                          >
                            <span
                              className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                              style={{ backgroundColor: b.color }}
                            >
                              {b.initials}
                            </span>
                            <span className="flex-1 text-sm font-medium text-foreground">{b.name}</span>
                            <span className={cn(
                              'flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
                              checked ? 'border-primary bg-primary' : 'border-border bg-background',
                            )}>
                              {checked && <Check className="size-3 text-white" />}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer sticky */}
            <div className="shrink-0 px-5 py-4">
              <button
                type="button"
                onClick={handleAdd}
                disabled={!company.trim()}
                className="w-full rounded-2xl bg-primary px-4 py-3.5 text-base font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
              >
                Créer l&apos;activité
              </button>
            </div>
          </div>,
          document.body
        )}
      </>
    )
  }

  /* ── Sheet (fallback) ── */
  return (
    <>
      {desktopTrigger}
      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setAddMode(false); setNewName('') } }}>
        <SheetContent side="bottom" className="mx-auto max-w-[480px] rounded-t-3xl">
          <SheetHeader className="text-left">
            <SheetTitle className="font-display text-lg">Mes business</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-2 px-4 pb-6">
            {all.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => { setCurrent(b); setOpen(false) }}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
                  current.id === b.id ? 'border-primary bg-accent' : 'border-border bg-surface active:bg-muted',
                )}
              >
                <span
                  className="flex size-9 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: b.color }}
                >
                  {b.initials}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold text-foreground">{b.name}</span>
                </span>
                {current.id === b.id && <Check className="size-5 text-primary" />}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
