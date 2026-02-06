"use client"

import { Check } from "lucide-react"
import type { ReactNode } from "react"

interface CalmingCardProps {
  icon: ReactNode
  label: string
  selected: boolean
  onToggle: () => void
}

export function CalmingCard({ icon, label, selected, onToggle }: CalmingCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative flex w-full flex-col items-center gap-3 rounded-2xl border-2 px-4 py-5 text-center transition-all ${
        selected
          ? "border-primary bg-primary/8 shadow-sm"
          : "border-border bg-card hover:border-primary/30 hover:bg-accent/50"
      }`}
    >
      {selected && (
        <div className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
          <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
        </div>
      )}
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
          selected ? "bg-primary/15" : "bg-secondary"
        }`}
      >
        {icon}
      </span>
      <span
        className={`text-sm font-medium leading-snug ${
          selected ? "text-foreground" : "text-foreground/80"
        }`}
      >
        {label}
      </span>
    </button>
  )
}
