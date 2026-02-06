"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Music,
  Wind,
  MessageCircle,
  CircleParking,
  VolumeX,
  ArrowLeft,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { OnboardingProgress } from "@/components/onboarding-progress"
import { CalmingCard } from "@/components/calming-card"

const CALMING_OPTIONS = [
  {
    id: "music",
    icon: <Music className="h-6 w-6 text-primary" strokeWidth={1.8} />,
    label: "Calming music",
  },
  {
    id: "breathing",
    icon: <Wind className="h-6 w-6 text-primary" strokeWidth={1.8} />,
    label: "Deep breathing",
  },
  {
    id: "talking",
    icon: <MessageCircle className="h-6 w-6 text-primary" strokeWidth={1.8} />,
    label: "Talking it out",
  },
  {
    id: "pulling-over",
    icon: <CircleParking className="h-6 w-6 text-primary" strokeWidth={1.8} />,
    label: "Pulling over",
  },
  {
    id: "silence",
    icon: <VolumeX className="h-6 w-6 text-primary" strokeWidth={1.8} />,
    label: "Silence",
  },
]

export function CalmingSelection() {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggleOption(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="flex min-h-dvh flex-col px-6 pb-8 pt-6">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/onboarding/triggers")}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors hover:bg-accent"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
        </button>
        <div className="flex-1">
          <OnboardingProgress currentStep={3} totalSteps={4} />
        </div>
      </div>

      {/* Header */}
      <div className="mt-8">
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground text-balance">
          What helps you calm down?
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Select all that apply. We&apos;ll personalize your experience based on
          your preferences.
        </p>
      </div>

      {/* Selected count */}
      {selected.size > 0 && (
        <div className="mt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {selected.size} selected
          </span>
        </div>
      )}

      {/* Calming options grid */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {CALMING_OPTIONS.map((option) => (
          <CalmingCard
            key={option.id}
            icon={option.icon}
            label={option.label}
            selected={selected.has(option.id)}
            onToggle={() => toggleOption(option.id)}
          />
        ))}
      </div>

      {/* Spacer */}
      <div className="min-h-6 flex-1" />

      {/* Continue button */}
      <div className="mt-6">
        <Button
          onClick={() => router.push("/onboarding/profile")}
          className="h-14 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
          size="lg"
        >
          Continue
          <ArrowRight className="ml-1.5 h-5 w-5" />
        </Button>
        {selected.size === 0 && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            You can skip this step for now
          </p>
        )}
      </div>
    </div>
  )
}
