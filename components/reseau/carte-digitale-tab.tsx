"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IconBrandWhatsapp, IconBrandLinkedin, IconLink } from "@tabler/icons-react"

export function CarteDigitaleTab() {
  return (
    <div className="mt-4 flex flex-col items-center">
      {/* Digital card preview */}
      <Card className="w-full max-w-sm overflow-hidden">
        {/* Gradient header */}
        <div className="relative h-24 bg-gradient-to-br from-primary to-primary/60">
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-card bg-primary text-2xl font-bold text-white">
              PH
            </div>
          </div>
        </div>

        {/* Card content */}
        <div className="px-4 pb-6 pt-14 text-center">
          <h2 className="font-heading text-lg font-semibold">Patrice Haure-Pallesi</h2>
          <p className="mt-1 text-sm text-muted-foreground">Distributeur Pro · Herbalife</p>

          {/* QR code placeholder */}
          <div className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-lg bg-muted">
            <span className="text-xs text-muted-foreground">QR Code</span>
          </div>

          {/* Share buttons */}
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <IconBrandWhatsapp className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <IconBrandLinkedin className="h-4 w-4" />
              LinkedIn
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <IconLink className="h-4 w-4" />
              Copier
            </Button>
          </div>
        </div>
      </Card>

      {/* Edit button */}
      <Button variant="ghost" className="mt-4">
        Modifier ma carte
      </Button>
    </div>
  )
}
