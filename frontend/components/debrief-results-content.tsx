"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  TrendingDown,
  TrendingUp,
  BookOpen,
  Heart,
  Loader2,
  UserCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRequireUser } from "@/hooks/useRequireUser"
import { useDriveStore } from "@/stores/driveStore"

type StepColor = "destructive" | "amber" | "primary"

function getColorForLevel(level: string): StepColor {
  const upper = level.toUpperCase()
  if (upper === "CRITICAL" || upper === "HIGH") return "destructive"
  if (upper === "MEDIUM") return "amber"
  return "primary"
}

function getEmojiForLevel(level: string): string {
  const upper = level.toUpperCase()
  if (upper === "CRITICAL" || upper === "HIGH") return "\uD83D\uDE1F"
  if (upper === "MEDIUM") return "\uD83D\uDE10"
  return "\uD83D\uDE0A"
}

function getColorClasses(color: StepColor) {
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
  const debriefResponse = useDriveStore((s) => s.debriefResponse)

  // Redirect to dashboard if no debrief data (e.g. direct navigation)
  useEffect(() => {
    if (!isLoading && !debriefResponse) {
      router.replace("/dashboard")
    }
  }, [isLoading, debriefResponse, router])

  if (isLoading || !debriefResponse) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const { emotional_journey, learnings, profile_updates, encouragement } = debriefResponse

  // Build journey steps from real data
  const preStressPercent = Math.round(emotional_journey.pre_drive.stress * 100)
  const postStressPercent = Math.round(emotional_journey.post_drive.stress * 100)
  const improvementPercent = Math.round(emotional_journey.improvement * 100)
  const improved = emotional_journey.improvement > 0

  const journeySteps = [
    {
      label: "Before",
      emoji: getEmojiForLevel(emotional_journey.pre_drive.level),
      value: preStressPercent,
      severity: emotional_journey.pre_drive.level.toUpperCase(),
      color: getColorForLevel(emotional_journey.pre_drive.level),
    },
    {
      label: "After",
      emoji: getEmojiForLevel(emotional_journey.post_drive.level),
      value: postStressPercent,
      severity: emotional_journey.post_drive.level.toUpperCase(),
      color: getColorForLevel(emotional_journey.post_drive.level),
    },
  ]

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-14">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Your Drive Summary
        </h1>
      </div>

      {/* Emotional journey visualization */}
      <div className="mt-8 px-6">
        <div className="rounded-2xl border-2 border-border bg-card p-5">
          {/* Two columns */}
          <div className="relative flex items-start justify-around">
            {/* Connecting line behind columns */}
            <div className="absolute left-[25%] right-[25%] top-[52px]">
              <div className="flex items-center">
                <div className="h-0.5 flex-1 bg-border" />
                <ArrowRight className="mx-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
              </div>
            </div>

            {journeySteps.map((step) => {
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
            <div className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 ${
              improved
                ? "border-primary/25 bg-primary/10"
                : "border-destructive/25 bg-destructive/10"
            }`}>
              {improved ? (
                <TrendingDown className="h-4 w-4 text-primary" strokeWidth={2} />
              ) : (
                <TrendingUp className="h-4 w-4 text-destructive" strokeWidth={2} />
              )}
              <span className={`text-sm font-bold ${improved ? "text-primary" : "text-destructive"}`}>
                {Math.abs(improvementPercent)}% {improved ? "improvement" : "increase"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Learnings card */}
      {learnings.length > 0 && (
        <div className="mt-6 px-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" strokeWidth={2} />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              What I Learned
            </h2>
          </div>

          <div className="mt-3 rounded-2xl border-2 border-border bg-card p-5">
            <div className="flex flex-col gap-3.5">
              {learnings.map((item, index) => (
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
      )}

      {/* Profile updates card */}
      {profile_updates.length > 0 && (
        <div className="mt-6 px-6">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" strokeWidth={2} />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Profile Updates
            </h2>
          </div>

          <div className="mt-3 rounded-2xl border-2 border-border bg-card p-5">
            <div className="flex flex-col gap-3">
              {profile_updates.map((update, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <span className="text-[10px] font-bold text-primary">
                      {"\u2713"}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {update}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Encouragement card */}
      <div className="mt-6 px-6">
        <div className="rounded-2xl border-2 border-primary/25 bg-primary/10 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
              <Heart className="h-5 w-5 text-primary" strokeWidth={2} />
            </div>
            <p className="text-sm font-medium leading-relaxed text-foreground">
              {encouragement}
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
