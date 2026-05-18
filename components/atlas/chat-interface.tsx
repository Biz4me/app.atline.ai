"use client"

import { useState, useRef, useEffect } from "react"
import { QuoteCard } from "./quote-card"
import { ChatMessage, TypingIndicator } from "./chat-message"
import { QuickPrompts } from "./quick-prompts"
import { ChatInput } from "./chat-input"
import { MessageToast } from "./message-toast"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "user",
    content: "Comment gérer l'objection 'c'est une pyramide' ?",
  },
  {
    id: "2",
    role: "assistant",
    content: `Excellente question Patrice ! Voici la méthode Feel-Felt-Found que recommande Eric Worre :

1. **Feel** (Ressentir) : "Je comprends ce que tu ressens..."
2. **Felt** (Ressenti) : "J'ai ressenti la même chose au début..."
3. **Found** (Découvert) : "Ce que j'ai découvert, c'est que..."

Cette approche permet de valider l'émotion de ton prospect tout en l'amenant à voir les choses différemment. Tu veux que je te donne un script précis ?`,
  },
]

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const handleSend = (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
    }
    setMessages((prev) => [...prev, userMessage])

    // Simulate Atlas typing
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Merci pour ta question ! Je suis en train de préparer une réponse détaillée pour toi...",
      }
      setMessages((prev) => [...prev, assistantMessage])
    }, 2000)
  }

  const handleQuickPrompt = (prompt: string) => {
    handleSend(prompt)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Quote card */}
      <QuoteCard />

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 lg:px-6"
      >
        {messages.length === 0 ? (
          // Empty state
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
              <span className="text-2xl font-bold text-white">A</span>
            </div>
            <p className="text-muted-foreground">
              Bonjour Patrice, comment puis-je t&apos;aider aujourd&apos;hui ?
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
              />
            ))}
            {isTyping && <TypingIndicator />}
          </div>
        )}

        {/* Gradient fade at bottom to show scrollability */}
        {messages.length > 0 && (
          <div className="pointer-events-none sticky bottom-0 h-8 bg-gradient-to-t from-background to-transparent" />
        )}
      </div>

      {/* Quick prompts with toast */}
      <div className="relative w-full">
        <MessageToast messagesRemaining={8} />
        <QuickPrompts onSelect={handleQuickPrompt} />
      </div>

      {/* Input area */}
      <ChatInput onSend={handleSend} />
    </div>
  )
}
