'use client'

import { usePathname } from 'next/navigation'
import { ChatsShell } from '@/components/chats-shell'

// Le fil Atlas vit dans la même coquille que les autres fils : colonne Conversations
// à gauche en desktop (T10b), plein écran sur mobile.
//
// Exception : /atlas/voix. Parler à Atlas est un moment PLEIN ÉCRAN, comme un
// appel. La colonne Conversations y serait du bruit à côté de la mire, qui est
// le seul élément qui doit vivre. Le rail de navigation reste, lui, pour pouvoir
// sortir d'un geste.
export default function AtlasLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname.startsWith('/atlas/voix')) return <>{children}</>
  return <ChatsShell>{children}</ChatsShell>
}
