"use client"

import { Check } from "lucide-react"
import type { ReactNode } from "react"

interface GoalCardProps {
  icon: ReactNode
  label: string
  selected: boolean
  onSelect: () => void
}

export function GoalCard({ icon, label, selected, onSelect }: GoalCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3.5 rounded-2xl border-2 px-4 py-3.5 text-left transition-all ${
        selected
          ? "border-primary bg-primary/8 shadow-sm"
          : "border-border bg-card hover:border-primary/30 hover:bg-accent/50"
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-lg">
        {icon}
      </span>
      <span
        className={`flex-1 text-sm font-medium leading-snug ${
          selected ? "text-foreground" : "text-foreground/80"
        }`}
      >
        {label}
      </span>
      {selected && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary">
          <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
        </div>
      )}
    </button>
  )
}
