"use client"

import { useState } from "react"
import { Mic, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  messagesUsed?: number
  messagesLimit?: number
}

export function ChatInput({
  onSend,
  disabled,
  messagesUsed = 8,
  messagesLimit = 10,
}: ChatInputProps) {
  const [message, setMessage] = useState("")
  const [isRecording, setIsRecording] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage("")
    }
  }

  const toggleRecording = () => {
    setIsRecording(!isRecording)
    // STT implementation would go here
  }

  return (
    <div className="border-t border-border bg-background">
      {/* Message counter */}
      <div className="px-4 pt-2 lg:px-6">
        <p className="text-xs text-muted-foreground">
          {messagesUsed}/{messagesLimit} messages aujourd&apos;hui
        </p>
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4 lg:px-6">
        {/* Microphone button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleRecording}
          className={cn(
            "h-10 w-10 shrink-0 rounded-full",
            isRecording && "animate-pulse text-accent"
          )}
        >
          <Mic className={cn("h-5 w-5", isRecording ? "text-accent" : "text-primary")} />
          <span className="sr-only">Dictée vocale</span>
        </Button>

        {/* Text input */}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Pose une question à Atlas..."
          disabled={disabled}
          className="h-10 flex-1 rounded-full border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        />

        {/* Send button */}
        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || disabled}
          className="h-10 w-10 shrink-0 rounded-full bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
          <span className="sr-only">Envoyer</span>
        </Button>
      </form>
    </div>
  )
}
