"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OnboardingProgress } from "@/components/onboarding-progress"
import { RadioCard } from "@/components/radio-card"

const EXPERIENCE_OPTIONS = [
  { id: "new", label: "New driver (less than 1 year)" },
  { id: "some", label: "Some experience (1-3 years)" },
  { id: "experienced", label: "Experienced (3+ years)" },
]

const FREQUENCY_OPTIONS = [
  { id: "daily", label: "Daily" },
  { id: "few-times", label: "Few times a week" },
  { id: "occasionally", label: "Occasionally" },
  { id: "rarely", label: "Rarely" },
]

export function ProfileSetup() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [experience, setExperience] = useState<string | null>(null)
  const [frequency, setFrequency] = useState<string | null>(null)

  const isValid = name.trim().length > 0 && experience !== null && frequency !== null

  return (
    <div className="flex min-h-dvh flex-col px-6 pb-8 pt-6">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/onboarding/calming")}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors hover:bg-accent"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
        </button>
        <div className="flex-1">
          <OnboardingProgress currentStep={4} totalSteps={4} />
        </div>
      </div>

      {/* Header */}
      <div className="mt-8">
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground text-balance">
          Almost there!
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Tell us a bit about yourself so we can tailor your experience.
        </p>
      </div>

      {/* Form content */}
      <div className="mt-8 flex flex-col gap-8">
        {/* Name input */}
        <div className="flex flex-col gap-2.5">
          <label
            htmlFor="user-name"
            className="text-sm font-semibold text-foreground"
          >
            Your name
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <User className="h-4.5 w-4.5 text-muted-foreground" strokeWidth={1.8} />
            </div>
            <input
              id="user-name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-13 w-full rounded-xl border-2 border-border bg-card pl-11 pr-4 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-primary focus:ring-0"
            />
          </div>
        </div>

        {/* Driving experience */}
        <fieldset className="flex flex-col gap-2.5">
          <legend className="text-sm font-semibold text-foreground">
            Driving experience
          </legend>
          <div className="flex flex-col gap-2">
            {EXPERIENCE_OPTIONS.map((option) => (
              <RadioCard
                key={option.id}
                label={option.label}
                selected={experience === option.id}
                onSelect={() => setExperience(option.id)}
              />
            ))}
          </div>
        </fieldset>

        {/* Driving frequency */}
        <fieldset className="flex flex-col gap-2.5">
          <legend className="text-sm font-semibold text-foreground">
            How often do you drive?
          </legend>
          <div className="flex flex-col gap-2">
            {FREQUENCY_OPTIONS.map((option) => (
              <RadioCard
                key={option.id}
                label={option.label}
                selected={frequency === option.id}
                onSelect={() => setFrequency(option.id)}
              />
            ))}
          </div>
        </fieldset>
      </div>

      {/* Spacer */}
      <div className="min-h-6 flex-1" />

      {/* Complete button */}
      <div className="mt-8">
        <Button
          disabled={!isValid}
          onClick={() => router.push("/dashboard")}
          className="h-14 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-40 disabled:shadow-none"
          size="lg"
        >
          Complete Setup
          <ArrowRight className="ml-1.5 h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
