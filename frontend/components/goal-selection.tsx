"use client"

import { useRouter } from "next/navigation"
import {
  Building2,
  Route,
  Car,
  Moon,
  Users,
  Sparkles,
  ArrowLeft,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { OnboardingProgress } from "@/components/onboarding-progress"
import { GoalCard } from "@/components/goal-card"
import { TargetDatePicker } from "@/components/target-date-picker"
import { useOnboardingStore } from "@/stores/onboardingStore"

const GOALS = [
  {
    id: "WORK_COMMUTE",
    icon: <Building2 className="h-5 w-5 text-primary" strokeWidth={1.8} />,
    label: "Drive to work independently",
  },
  {
    id: "HIGHWAY_ANXIETY",
    icon: <Route className="h-5 w-5 text-primary" strokeWidth={1.8} />,
    label: "Overcome highway anxiety",
  },
  {
    id: "LONGER_TRIPS",
    icon: <Car className="h-5 w-5 text-primary" strokeWidth={1.8} />,
    label: "Take longer road trips",
  },
  {
    id: "NIGHT_DRIVING",
    icon: <Moon className="h-5 w-5 text-primary" strokeWidth={1.8} />,
    label: "Feel comfortable driving at night",
  },
  {
    id: "VISIT_FAMILY",
    icon: <Users className="h-5 w-5 text-primary" strokeWidth={1.8} />,
    label: "Visit family without depending on others",
  },
  {
    id: "OTHER",
    icon: <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.8} />,
    label: "Other goal",
  },
]

function parseDeadline(deadline: string): { month: number; year: number } {
  if (!deadline) return { month: 5, year: 2026 }
  const date = new Date(deadline)
  return { month: date.getMonth(), year: date.getFullYear() }
}

function toDeadlineISO(month: number, year: number): string {
  const date = new Date(year, month + 1, 0) // last day of the month
  return date.toISOString().split("T")[0]
}

export function GoalSelection() {
  const router = useRouter()
  const { goal, deadline, setGoal, setDeadline } = useOnboardingStore()
  const { month: targetMonth, year: targetYear } = parseDeadline(deadline)

  const isValid = goal !== ""

  return (
    <div className="flex min-h-dvh flex-col px-6 pb-8 pt-6">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors hover:bg-accent"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
        </button>
        <div className="flex-1">
          <OnboardingProgress currentStep={1} totalSteps={4} />
        </div>
      </div>

      {/* Header */}
      <div className="mt-8">
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground text-balance">
          What&apos;s your driving goal for 2026?
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Choose the goal that matters most to you. You can always change it later.
        </p>
      </div>

      {/* Goal cards */}
      <div className="mt-6 flex flex-col gap-2.5">
        {GOALS.map((g) => (
          <GoalCard
            key={g.id}
            icon={g.icon}
            label={g.label}
            selected={goal === g.id}
            onSelect={() => setGoal(g.id)}
          />
        ))}
      </div>

      {/* Target date */}
      <div className="mt-6">
        <TargetDatePicker
          month={targetMonth}
          year={targetYear}
          onMonthChange={(m) => setDeadline(toDeadlineISO(m, targetYear))}
          onYearChange={(y) => setDeadline(toDeadlineISO(targetMonth, y))}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1 min-h-6" />

      {/* Continue button */}
      <div className="mt-6">
        <Button
          disabled={!isValid}
          onClick={() => router.push("/onboarding/triggers")}
          className="h-14 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-40 disabled:shadow-none"
          size="lg"
        >
          Continue
          <ArrowRight className="ml-1.5 h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
