import { ChatShell } from "@/components/atlas/chat-shell"
import { ChatInterface } from "@/components/atlas/chat-interface"

export const metadata = {
  title: "Atlas - Atline.ai",
  description: "Ton coach IA personnel pour le marketing de réseau",
}

export default function AtlasPage() {
  return (
    <ChatShell breadcrumbs={[{ label: "Atlas" }]}>
      <ChatInterface />
    </ChatShell>
  )
}
