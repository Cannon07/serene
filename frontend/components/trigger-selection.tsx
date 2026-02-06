"use client"

import { useRouter } from "next/navigation"
import {
  Car,
  Volume2,
  ArrowLeft,
  ArrowRight,
  Moon,
  Shuffle,
  Construction,
  Footprints,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { OnboardingProgress } from "@/components/onboarding-progress"
import { TriggerChip } from "@/components/trigger-chip"
import { useOnboardingStore } from "@/stores/onboardingStore"

const TRIGGERS = [
  {
    id: "HEAVY_TRAFFIC",
    icon: <Car className="h-5 w-5 text-primary" strokeWidth={1.8} />,
    label: "Heavy traffic",
  },
  {
    id: "HONKING",
    icon: <Volume2 className="h-5 w-5 text-primary" strokeWidth={1.8} />,
    label: "Honking & loud noises",
  },
  {
    id: "HIGHWAYS",
    icon: <ArrowRight className="h-5 w-5 text-primary" strokeWidth={1.8} />,
    label: "Highways",
  },
  {
    id: "NIGHT_DRIVING",
    icon: <Moon className="h-5 w-5 text-primary" strokeWidth={1.8} />,
    label: "Night driving",
  },
  {
    id: "COMPLEX_INTERSECTIONS",
    icon: <Shuffle className="h-5 w-5 text-primary" strokeWidth={1.8} />,
    label: "Complex intersections",
  },
  {
    id: "CONSTRUCTION",
    icon: <Construction className="h-5 w-5 text-primary" strokeWidth={1.8} />,
    label: "Construction zones",
  },
  {
    id: "PEDESTRIAN_AREAS",
    icon: <Footprints className="h-5 w-5 text-primary" strokeWidth={1.8} />,
    label: "Pedestrian areas",
  },
]

export function TriggerSelection() {
  const router = useRouter()
  const { triggers, toggleTrigger } = useOnboardingStore()

  return (
    <div className="flex min-h-dvh flex-col px-6 pb-8 pt-6">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/onboarding/goal")}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors hover:bg-accent"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
        </button>
        <div className="flex-1">
          <OnboardingProgress currentStep={2} totalSteps={4} />
        </div>
      </div>

      {/* Header */}
      <div className="mt-8">
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground text-balance">
          What tends to stress you while driving?
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Select all that apply. This is optional — you can skip if you prefer.
        </p>
      </div>

      {/* Selected count */}
      {triggers.length > 0 && (
        <div className="mt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {triggers.length} selected
          </span>
        </div>
      )}

      {/* Trigger grid */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {TRIGGERS.map((trigger) => (
          <TriggerChip
            key={trigger.id}
            icon={trigger.icon}
            label={trigger.label}
            selected={triggers.includes(trigger.id)}
            onToggle={() => toggleTrigger(trigger.id)}
          />
        ))}
      </div>

      {/* Spacer */}
      <div className="min-h-6 flex-1" />

      {/* Continue button */}
      <div className="mt-6">
        <Button
          onClick={() => router.push("/onboarding/calming")}
          className="h-14 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
          size="lg"
        >
          Continue
          <ArrowRight className="ml-1.5 h-5 w-5" />
        </Button>
        {triggers.length === 0 && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            You can skip this step for now
          </p>
        )}
      </div>
    </div>
  )
}
