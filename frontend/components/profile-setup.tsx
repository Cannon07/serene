"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, User, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OnboardingProgress } from "@/components/onboarding-progress"
import { RadioCard } from "@/components/radio-card"
import { useOnboardingStore } from "@/stores/onboardingStore"
import { useUserStore } from "@/stores/userStore"
import { userService } from "@/services/userService"
import type { ResolutionGoal, DrivingExperience, DrivingFrequency, StressTrigger, CalmingPreference } from "@/types/user"

const EXPERIENCE_OPTIONS = [
  { id: "NEW", label: "New driver (less than 1 year)" },
  { id: "SOME", label: "Some experience (1-3 years)" },
  { id: "EXPERIENCED", label: "Experienced (3+ years)" },
]

const FREQUENCY_OPTIONS = [
  { id: "DAILY", label: "Daily" },
  { id: "FEW_TIMES_WEEK", label: "Few times a week" },
  { id: "OCCASIONALLY", label: "Occasionally" },
  { id: "RARELY", label: "Rarely" },
]

export function ProfileSetup() {
  const router = useRouter()
  const store = useOnboardingStore()
  const { setUser } = useUserStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValid = store.name.trim().length > 0 && store.experience !== "" && store.frequency !== ""

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
              value={store.name}
              onChange={(e) => store.setName(e.target.value)}
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
                selected={store.experience === option.id}
                onSelect={() => store.setExperience(option.id)}
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
                selected={store.frequency === option.id}
                onSelect={() => store.setFrequency(option.id)}
              />
            ))}
          </div>
        </fieldset>
      </div>

      {/* Spacer */}
      <div className="min-h-6 flex-1" />

      {/* Error message */}
      {error && (
        <div className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Complete button */}
      <div className="mt-8">
        <Button
          disabled={!isValid || isSubmitting}
          onClick={async () => {
            setIsSubmitting(true)
            setError(null)
            try {
              const user = await userService.create({
                name: store.name,
                resolution_goal: store.goal as ResolutionGoal,
                resolution_deadline: store.deadline || undefined,
                driving_experience: store.experience as DrivingExperience,
                driving_frequency: store.frequency as DrivingFrequency,
                stress_triggers: store.triggers as StressTrigger[],
                calming_preferences: store.preferences as CalmingPreference[],
              })
              setUser(user)
              store.reset()
              router.push("/dashboard")
            } catch (err) {
              setError("Something went wrong. Please try again.")
            } finally {
              setIsSubmitting(false)
            }
          }}
          className="h-14 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-40 disabled:shadow-none"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-1.5 h-5 w-5 animate-spin" />
              Creating profile...
            </>
          ) : (
            <>
              Complete Setup
              <ArrowRight className="ml-1.5 h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
