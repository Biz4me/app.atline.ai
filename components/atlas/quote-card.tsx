"use client"

import { useEffect, useState } from "react"

const quotes = [
  {
    text: "Le succès n'est pas final, l'échec n'est pas fatal.",
    author: "Winston Churchill",
  },
  {
    text: "La seule façon de faire du bon travail est d'aimer ce que vous faites.",
    author: "Steve Jobs",
  },
  {
    text: "Le réseau marketing, c'est des gens ordinaires qui font des choses extraordinaires.",
    author: "Eric Worre",
  },
  {
    text: "Votre réseau est votre valeur nette.",
    author: "Porter Gale",
  },
  {
    text: "Ne demandez pas ce que le monde a besoin. Demandez-vous ce qui vous fait vibrer.",
    author: "Howard Thurman",
  },
]

export function QuoteCard() {
  const [quote, setQuote] = useState(quotes[0])

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * quotes.length)
    setQuote(quotes[randomIndex])
  }, [])

  return (
    <div className="border-b border-border px-4 py-3 lg:px-6">
      <p className="text-center text-sm italic text-muted-foreground">
        &ldquo;{quote.text}&rdquo;
        <span className="ml-2 not-italic">— {quote.author}</span>
      </p>
    </div>
  )
}
