"use client"

import { AlertTriangle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RouteCardProps {
  name: string
  duration: string
  distance: string
  calmScore: number
  calmEmoji: string
  stressLevel: string
  stressColor: "green" | "red"
  stressPoints: number
  recommended?: boolean
  onSelect: () => void
}

export function RouteCard({
  name,
  duration,
  distance,
  calmScore,
  calmEmoji,
  stressLevel,
  stressColor,
  stressPoints,
  recommended = false,
  onSelect,
}: RouteCardProps) {
  const isLowStress = stressColor === "green"

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 bg-card p-5 transition-all ${
        recommended
          ? "border-primary shadow-md shadow-primary/10"
          : "border-border"
      }`}
    >
      {/* Recommended badge */}
      {recommended && (
        <div className="mb-3 flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
            <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Recommended
            </span>
          </div>
        </div>
      )}

      {/* Route name and stats */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground">{name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {duration} &middot; {distance}
          </p>
        </div>

        {/* Calm score badge */}
        <div className="flex flex-col items-center gap-1">
          <div
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 ${
              isLowStress ? "bg-primary/10" : "bg-destructive/10"
            }`}
          >
            <span className="text-lg leading-none">{calmEmoji}</span>
            <span
              className={`text-lg font-bold leading-none ${
                isLowStress ? "text-primary" : "text-destructive"
              }`}
            >
              {calmScore}
            </span>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              isLowStress ? "text-primary" : "text-destructive"
            }`}
          >
            {stressLevel}
          </span>
        </div>
      </div>

      {/* Stress points */}
      <div className="mt-3 flex items-center gap-1.5">
        <AlertTriangle
          className={`h-3.5 w-3.5 ${
            stressPoints <= 1 ? "text-chart-4" : "text-destructive"
          }`}
          strokeWidth={2}
        />
        <span className="text-xs font-medium text-muted-foreground">
          {stressPoints} stress {stressPoints === 1 ? "point" : "points"}
        </span>
      </div>

      {/* Select button */}
      <Button
        onClick={onSelect}
        variant={recommended ? "default" : "outline"}
        className={`mt-4 h-12 w-full rounded-xl text-sm font-semibold ${
          recommended
            ? "shadow-md shadow-primary/20"
            : "border-2 text-foreground hover:border-primary hover:text-primary"
        }`}
      >
        Select This Route
      </Button>
    </div>
  )
}
