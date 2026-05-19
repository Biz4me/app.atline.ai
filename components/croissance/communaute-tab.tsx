"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IconHeart, IconMessage, IconPlus } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

const filters = ["Général", "Herbalife", "Forever", "Amway"]

interface Post {
  id: string
  author: string
  initials: string
  time: string
  content: string
  likes: number
  comments: number
  xpBadge?: number
}

const posts: Post[] = [
  {
    id: "1",
    author: "Marie L.",
    initials: "ML",
    time: "Il y a 2h",
    content: "J'ai converti mon 5ème prospect cette semaine grâce aux simulations Atlas! 🔥",
    likes: 24,
    comments: 8,
    xpBadge: 300,
  },
  {
    id: "2",
    author: "Thomas R.",
    initials: "TR",
    time: "Il y a 5h",
    content: "Quelqu'un a une technique pour l'objection prix sur Herbalife?",
    likes: 12,
    comments: 15,
  },
  {
    id: "3",
    author: "Emma K.",
    initials: "EK",
    time: "Il y a 1j",
    content: "Parrainage = 1 mois offert pour vous deux 🎁 Mon lien en bio",
    likes: 45,
    comments: 3,
  },
]

export function CommunauteTab() {
  const [activeFilter, setActiveFilter] = useState("Général")

  return (
    <div className="mt-4 space-y-4">
      {/* Filter tabs */}
      <div className="-mx-4 overflow-hidden">
        <div
          className="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-none"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                activeFilter === filter
                  ? "bg-primary text-white"
                  : "bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-3">
        {posts.map((post) => (
          <Card key={post.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary">
                {post.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{post.author}</span>
                  <span className="text-xs text-muted-foreground">{post.time}</span>
                  {post.xpBadge && (
                    <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-medium text-success">
                      +{post.xpBadge} XP
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm">{post.content}</p>
                <div className="mt-3 flex items-center gap-4">
                  <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                    <IconHeart className="h-4 w-4" />
                    <span className="text-xs">{post.likes}</span>
                  </button>
                  <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                    <IconMessage className="h-4 w-4" />
                    <span className="text-xs">{post.comments}</span>
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Floating action button */}
      <Button
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full p-0 shadow-lg lg:bottom-8 lg:right-8"
        size="icon"
      >
        <IconPlus className="h-6 w-6" />
      </Button>
    </div>
  )
}
