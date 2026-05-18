"use client"

import { cn } from "@/lib/utils"

interface ChatMessageProps {
  role: "user" | "assistant"
  content: string
  isStreaming?: boolean
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const isUser = role === "user"

  return (
    <div
      className={cn(
        "flex w-full gap-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Atlas avatar */}
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
          <span className="text-sm font-semibold text-white">A</span>
        </div>
      )}

      {/* Message bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-[12px] px-4 py-3 lg:max-w-[60%]",
          isUser
            ? "bg-primary text-white"
            : "border border-border bg-card text-foreground"
        )}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
        {isStreaming && (
          <div className="mt-2 flex gap-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex w-full gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
        <span className="text-sm font-semibold text-white">A</span>
      </div>
      <div className="rounded-[12px] border border-border bg-card px-4 py-3">
        <div className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
        </div>
      </div>
    </div>
  )
}
