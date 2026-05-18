"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface MessageToastProps {
  messagesRemaining: number
}

export function MessageToast({ messagesRemaining }: MessageToastProps) {
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Show toast after 1 second
    const showTimer = setTimeout(() => {
      setVisible(true)
    }, 1000)

    // Start fade out after 4 seconds (1s delay + 3s visible)
    const fadeTimer = setTimeout(() => {
      setFadeOut(true)
    }, 4000)

    // Hide completely after fade animation
    const hideTimer = setTimeout(() => {
      setVisible(false)
    }, 4300)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className={cn(
        "absolute left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-[20px] bg-[#27272A] px-3 py-1.5 transition-opacity duration-300",
        fadeOut ? "opacity-0" : "opacity-100"
      )}
      style={{ bottom: "100%", marginBottom: "8px" }}
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
      <span className="whitespace-nowrap text-[11px] text-[#A1A1AA]">
        {messagesRemaining} messages restants aujourd&apos;hui
      </span>
    </div>
  )
}
