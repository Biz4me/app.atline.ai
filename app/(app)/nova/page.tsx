'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus, SquarePen } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { NovaCalendar } from '@/components/nova/nova-calendar'
import { NovaInbox } from '@/components/nova/nova-inbox'
import { NovaPillars } from '@/components/nova/nova-pillars'
import { inboxMessages } from '@/lib/data'
import { toast } from 'sonner'

export default function NovaPage() {
  const router = useRouter()
  return (
    <>
      <header
        className="sticky top-0 z-30 flex items-center gap-3 bg-background/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur lg:px-6 lg:py-0 lg:h-[68px]"
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="-ml-1 flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted lg:hidden"
        >
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
        <span
          className="hidden lg:flex size-9 shrink-0 items-center justify-center rounded-[11px] text-white shadow-sm"
          style={{ backgroundColor: '#8B5CF6' }}
        >
          <SquarePen className="size-[18px] stroke-[1.5]" />
        </span>
        <h1 className="flex-1 font-display text-lg font-bold text-foreground lg:text-2xl">Nova</h1>
        <button
          type="button"
          onClick={() => toast.info('Créer un post')}
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
        >
          <Plus className="size-5 stroke-[1.5]" />
        </button>
      </header>
      <div className="px-4 pt-4 lg:px-8 lg:pt-6 lg:max-w-3xl lg:mx-auto">
        <Tabs defaultValue="calendrier">
          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted p-1">
            <TabsTrigger value="calendrier">Calendrier</TabsTrigger>
            <TabsTrigger value="inbox" className="gap-1.5">
              Inbox
              <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {inboxMessages.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="piliers">Piliers</TabsTrigger>
          </TabsList>

          <TabsContent value="calendrier" className="mt-5">
            <NovaCalendar />
          </TabsContent>
          <TabsContent value="inbox" className="mt-5">
            <NovaInbox />
          </TabsContent>
          <TabsContent value="piliers" className="mt-5">
            <NovaPillars />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
