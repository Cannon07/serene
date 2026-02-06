"use client"

import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  TrendingDown,
  BookOpen,
  Heart,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRequireUser } from "@/hooks/useRequireUser"

const JOURNEY_STEPS = [
  {
    label: "Before",
    emoji: "\uD83D\uDE1F",
    value: 72,
    severity: "HIGH",
    color: "destructive" as const,
  },
  {
    label: "During",
    emoji: "\uD83D\uDE10",
    value: 55,
    severity: "MEDIUM",
    color: "amber" as const,
  },
  {
    label: "After",
    emoji: "\uD83D\uDE0A",
    value: 25,
    severity: "LOW",
    color: "primary" as const,
  },
]

const LEARNINGS = [
  "The busy intersection was the main stress point, but you handled it well",
  "Breathing exercise helped reduce stress",
  "Local roads route was a good choice",
]

function getColorClasses(color: "destructive" | "amber" | "primary") {
  switch (color) {
    case "destructive":
      return {
        text: "text-destructive",
        bg: "bg-destructive/10",
        ring: "hsl(0, 84%, 60%)",
      }
    case "amber":
      return {
        text: "text-[hsl(38,90%,50%)]",
        bg: "bg-[hsl(38,90%,50%)]/10",
        ring: "hsl(38, 90%, 50%)",
      }
    case "primary":
      return {
        text: "text-primary",
        bg: "bg-primary/10",
        ring: "hsl(152, 55%, 42%)",
      }
  }
}

export function DebriefResultsContent() {
  const router = useRouter()
  const { isLoading } = useRequireUser()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-14">
        <button
          type="button"
          onClick={() => router.push("/debrief")}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors hover:bg-accent"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Your Drive Summary
        </h1>
      </div>

      {/* Emotional journey visualization */}
      <div className="mt-8 px-6">
        <div className="rounded-2xl border-2 border-border bg-card p-5">
          {/* Three columns */}
          <div className="relative flex items-start justify-between">
            {/* Connecting line behind columns */}
            <div className="absolute left-[16.67%] right-[16.67%] top-[52px]">
              <div className="flex items-center">
                <div className="h-0.5 flex-1 bg-border" />
                <ArrowRight className="mx-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
                <div className="h-0.5 flex-1 bg-border" />
                <ArrowRight className="mx-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
              </div>
            </div>

            {JOURNEY_STEPS.map((step) => {
              const colors = getColorClasses(step.color)
              const circumference = 2 * Math.PI * 32
              const filled = circumference * (step.value / 100)

              return (
                <div
                  key={step.label}
                  className="relative z-10 flex flex-col items-center gap-2"
                >
                  {/* Label */}
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {step.label}
                  </span>

                  {/* Circle with emoji */}
                  <div className="relative flex h-[76px] w-[76px] items-center justify-center">
                    <svg
                      className="absolute inset-0 h-full w-full -rotate-90"
                      viewBox="0 0 76 76"
                    >
                      <circle
                        cx="38"
                        cy="38"
                        r="32"
                        fill="none"
                        stroke="hsl(var(--border))"
                        strokeWidth="5"
                      />
                      <circle
                        cx="38"
                        cy="38"
                        r="32"
                        fill="none"
                        stroke={colors.ring}
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={`${filled} ${circumference - filled}`}
                      />
                    </svg>
                    <span className="relative text-2xl" role="img" aria-label={step.label}>
                      {step.emoji}
                    </span>
                  </div>

                  {/* Percentage */}
                  <span className={`text-lg font-bold ${colors.text}`}>
                    {step.value}%
                  </span>

                  {/* Severity badge */}
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${colors.bg} ${colors.text}`}
                  >
                    {step.severity}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Improvement badge */}
          <div className="mt-5 flex justify-center">
            <div className="flex items-center gap-2 rounded-full border-2 border-primary/25 bg-primary/10 px-4 py-2">
              <TrendingDown className="h-4 w-4 text-primary" strokeWidth={2} />
              <span className="text-sm font-bold text-primary">
                65% improvement
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Learnings card */}
      <div className="mt-6 px-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" strokeWidth={2} />
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            What I Learned
          </h2>
        </div>

        <div className="mt-3 rounded-2xl border-2 border-border bg-card p-5">
          <div className="flex flex-col gap-3.5">
            {LEARNINGS.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <span className="text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-foreground">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Encouragement card */}
      <div className="mt-6 px-6">
        <div className="rounded-2xl border-2 border-primary/25 bg-primary/10 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
              <Heart className="h-5 w-5 text-primary" strokeWidth={2} />
            </div>
            <p className="text-sm font-medium leading-relaxed text-foreground">
              You handled a challenging drive really well today! Your stress
              reduced by 65% — that{"'"}s real progress. Keep it up!
            </p>
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom button */}
      <div className="mt-8 px-6">
        <Button
          onClick={() => router.push("/dashboard")}
          className="h-14 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
          size="lg"
        >
          Done
          <ArrowRight className="ml-1.5 h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
