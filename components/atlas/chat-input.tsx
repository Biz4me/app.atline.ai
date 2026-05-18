"use client"

import { useState } from "react"
import { Mic, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function ChatInput({
  onSend,
  disabled,
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
      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5 p-3 lg:gap-2 lg:p-4 lg:px-6">
        {/* Microphone button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleRecording}
          className={cn(
            "h-9 w-9 shrink-0 rounded-full lg:h-10 lg:w-10",
            isRecording && "animate-pulse text-accent"
          )}
        >
          <Mic className={cn("h-5 w-5", isRecording ? "text-accent" : "text-primary")} />
          <span className="sr-only">Dictee vocale</span>
        </Button>

        {/* Text input */}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Pose une question..."
          disabled={disabled}
          className="h-9 min-w-0 flex-1 rounded-full border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 lg:h-10 lg:px-4"
        />

        {/* Send button */}
        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || disabled}
          className="h-9 w-9 shrink-0 rounded-full bg-primary text-white hover:bg-primary/90 disabled:opacity-50 lg:h-10 lg:w-10"
        >
          <Send className="h-4 w-4 lg:h-5 lg:w-5" />
          <span className="sr-only">Envoyer</span>
        </Button>
      </form>
    </div>
  )
}
