"use client"

import { Check } from "lucide-react"

interface RadioCardProps {
  label: string
  selected: boolean
  onSelect: () => void
}

export function RadioCard({ label, selected, onSelect }: RadioCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left text-sm font-medium transition-all ${
        selected
          ? "border-primary bg-primary/5 text-foreground"
          : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-accent/50"
      }`}
    >
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          selected
            ? "border-primary bg-primary"
            : "border-muted-foreground/40 bg-transparent"
        }`}
      >
        {selected && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
      </div>
      <span className="leading-snug">{label}</span>
    </button>
  )
}
