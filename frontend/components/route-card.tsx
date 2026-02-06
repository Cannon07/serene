"use client"

import { AlertTriangle, Check, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RouteCardProps {
  name: string
  duration: string
  distance: string
  calmScore: number
  calmEmoji: string
  stressLevel: string
  stressColor: "green" | "yellow" | "red"
  stressPoints: number
  recommended?: boolean
  mapsUrl?: string
  loading?: boolean
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
  mapsUrl,
  loading = false,
  onSelect,
}: RouteCardProps) {
  const colorClasses = {
    green: {
      scoreBg: "bg-primary/10",
      scoreText: "text-primary",
      pointIcon: "text-chart-4",
    },
    yellow: {
      scoreBg: "bg-chart-4/10",
      scoreText: "text-chart-4",
      pointIcon: "text-chart-4",
    },
    red: {
      scoreBg: "bg-destructive/10",
      scoreText: "text-destructive",
      pointIcon: "text-destructive",
    },
  }

  const colors = colorClasses[stressColor]

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
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 ${colors.scoreBg}`}
          >
            <span className="text-lg leading-none">{calmEmoji}</span>
            <span
              className={`text-lg font-bold leading-none ${colors.scoreText}`}
            >
              {calmScore}
            </span>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${colors.scoreText}`}
          >
            {stressLevel}
          </span>
        </div>
      </div>

      {/* Stress points + maps link */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <AlertTriangle
            className={`h-3.5 w-3.5 ${colors.pointIcon}`}
            strokeWidth={2}
          />
          <span className="text-xs font-medium text-muted-foreground">
            {stressPoints} stress {stressPoints === 1 ? "point" : "points"}
          </span>
        </div>

        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View on Maps
            <ExternalLink className="h-3 w-3" strokeWidth={2} />
          </a>
        )}
      </div>

      {/* Select button */}
      <Button
        onClick={onSelect}
        disabled={loading}
        variant={recommended ? "default" : "outline"}
        className={`mt-4 h-12 w-full rounded-xl text-sm font-semibold ${
          recommended
            ? "shadow-md shadow-primary/20"
            : "border-2 text-foreground hover:border-primary hover:text-primary"
        }`}
      >
        {loading ? "Preparing..." : "Select This Route"}
      </Button>
    </div>
  )
}
