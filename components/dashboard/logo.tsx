import { cn } from "@/lib/utils"

interface AtlineLogoProps {
  className?: string
  showText?: boolean
  size?: "sm" | "md" | "lg"
}

export function AtlineLogo({ className, showText = true, size = "md" }: AtlineLogoProps) {
  const sizes = {
    sm: { icon: "h-6 w-6", text: "text-base" },
    md: { icon: "h-8 w-8", text: "text-lg" },
    lg: { icon: "h-10 w-10", text: "text-xl" },
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={sizes[size].icon}
      >
        {/* Primary violet triangle - main peak */}
        <path
          d="M16 4L26 26H6L16 4Z"
          fill="#7C6FE8"
        />
        {/* Cyan accent triangle - overlapping smaller peak */}
        <path
          d="M22 12L28 26H16L22 12Z"
          fill="#06B6D4"
          fillOpacity="0.9"
        />
      </svg>
      {showText && (
        <span className={cn("font-logo font-bold text-white", sizes[size].text)}>
          Atline
        </span>
      )}
    </div>
  )
}
