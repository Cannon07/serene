"use client"

import { Check } from "lucide-react"
import type { ReactNode } from "react"

interface TriggerChipProps {
  icon: ReactNode
  label: string
  selected: boolean
  onToggle: () => void
}

export function TriggerChip({ icon, label, selected, onToggle }: TriggerChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative flex w-full flex-col items-center gap-2.5 rounded-2xl border-2 px-3 py-4 text-center transition-all ${
        selected
          ? "border-primary bg-primary/8 shadow-sm"
          : "border-border bg-card hover:border-primary/30 hover:bg-accent/50"
      }`}
    >
      {selected && (
        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
          <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
        </div>
      )}
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${
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
