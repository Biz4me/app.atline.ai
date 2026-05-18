"use client"

// Header components are now part of navigation.tsx
// This file re-exports them for backward compatibility

export { MobileStatsBar, DesktopTopBar } from "./navigation"

// Alias exports for backward compatibility
export { MobileStatsBar as MobileHeader } from "./navigation"
export { DesktopTopBar as DesktopHeader } from "./navigation"
