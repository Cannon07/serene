"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Wind,
  MessageCircle,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRequireUser } from "@/hooks/useRequireUser"
import { useDriveStore } from "@/stores/driveStore"

function getStressEmoji(score: number): string {
  if (score <= 0.3) return "\u{1F60A}" // 😊
  if (score <= 0.5) return "\u{1F610}" // 😐
  if (score <= 0.7) return "\u{1F61F}" // 😟
  return "\u{1F630}" // 😰
}

function getStressColorClass(level: string) {
  switch (level) {
    case "LOW":
      return { badge: "bg-primary/10 text-primary", ring: "hsl(var(--primary))" }
    case "MEDIUM":
      return { badge: "bg-chart-4/10 text-chart-4", ring: "hsl(45, 93%, 47%)" }
    case "HIGH":
      return { badge: "bg-destructive/10 text-destructive", ring: "hsl(0, 84%, 60%)" }
    case "CRITICAL":
      return { badge: "bg-destructive/10 text-destructive", ring: "hsl(0, 84%, 45%)" }
    default:
      return { badge: "bg-muted text-muted-foreground", ring: "hsl(var(--muted-foreground))" }
  }
}

function getEncouragingMessage(level: string): string {
  switch (level) {
    case "LOW":
      return "You're looking calm and ready. Great mental state for driving!"
    case "MEDIUM":
      return "You seem a little on edge, but that's normal. A breathing exercise could help you feel more centered."
    case "HIGH":
      return "I can see you're feeling anxious about this drive. That's completely okay. Let's take it one step at a time together."
    case "CRITICAL":
      return "You're showing signs of significant stress. Consider taking a few minutes for a breathing exercise before driving, or choosing the calmest route available."
    default:
      return "Remember, every drive is progress. You've got this."
  }
}

export function CheckinResultsContent() {
  const router = useRouter()
  const { isLoading: authLoading } = useRequireUser()
  const checkinResult = useDriveStore((s) => s.checkinResult)

  // Redirect if no result
  useEffect(() => {
    if (!authLoading && !checkinResult) {
      router.replace("/checkin")
    }
  }, [authLoading, checkinResult, router])

  if (authLoading || !checkinResult) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const scorePercent = Math.round(checkinResult.stress_score * 100)
  const emoji = getStressEmoji(checkinResult.stress_score)
  const colors = getStressColorClass(checkinResult.stress_level)
  const circumference = 2 * Math.PI * 70
  const strokeProgress = circumference * (checkinResult.stress_score)
  const strokeRemaining = circumference - strokeProgress

  return (
    <div className="flex min-h-dvh flex-col pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-14">
        <button
          type="button"
          onClick={() => router.push("/checkin")}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors hover:bg-accent"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Your Pre-Drive Check-in
        </h1>
      </div>

      {/* Stress score circle */}
      <div className="mt-8 flex flex-col items-center gap-2 px-6">
        <div className="relative flex h-40 w-40 items-center justify-center">
          <svg
            className="absolute inset-0 h-full w-full -rotate-90"
            viewBox="0 0 160 160"
          >
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="10"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke={colors.ring}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${strokeProgress} ${strokeRemaining}`}
            />
          </svg>
          <div className="relative flex flex-col items-center">
            <span className="text-3xl" role="img" aria-label="stress emoji">
              {emoji}
            </span>
            <span className="mt-1 text-4xl font-bold text-foreground">
              {scorePercent}%
            </span>
          </div>
        </div>
        <span
          className={`rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-widest ${colors.badge}`}
        >
          {checkinResult.stress_level}
        </span>
      </div>

      {/* Detected concerns section */}
      {checkinResult.detected_concerns.length > 0 && (
        <div className="mt-8 px-6">
          <div className="flex items-center gap-2">
            <AlertCircle
              className="h-4 w-4 text-destructive"
              strokeWidth={2}
            />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Detected
            </h2>
          </div>

          <div className="mt-3 rounded-2xl border-2 border-destructive/20 bg-destructive/5 p-4">
            <div className="flex flex-col gap-3">
              {checkinResult.detected_concerns.map((concern) => (
                <div key={concern} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                    <AlertCircle
                      className="h-4 w-4 text-destructive"
                      strokeWidth={2}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {concern}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recommendations section */}
      {checkinResult.recommendations.length > 0 && (
        <div className="mt-6 px-6">
          <div className="flex items-center gap-2">
            <CheckCircle2
              className="h-4 w-4 text-primary"
              strokeWidth={2}
            />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Recommendations
            </h2>
          </div>

          <div className="mt-3 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4">
            <div className="flex flex-col gap-3">
              {checkinResult.recommendations.map((rec) => (
                <div key={rec} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base">
                    {"\u{1F49A}"}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {rec}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI message bubble */}
      <div className="mt-6 px-6">
        <div className="rounded-2xl border-2 border-primary/15 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <MessageCircle
                className="h-4 w-4 text-primary"
                strokeWidth={2}
              />
            </div>
            <p className="text-sm leading-relaxed text-foreground">
              {getEncouragingMessage(checkinResult.stress_level)}
            </p>
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom buttons */}
      <div className="mt-8 flex flex-col gap-3 px-6">
        <Button
          variant="outline"
          onClick={() => router.push("/breathing")}
          className="h-14 w-full rounded-2xl border-2 bg-transparent text-base font-semibold text-foreground hover:border-primary/30 hover:text-primary"
          size="lg"
        >
          <Wind className="mr-2 h-5 w-5" />
          Do Breathing Exercise
        </Button>
        <Button
          onClick={() => router.push("/prepare")}
          className="h-14 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
          size="lg"
        >
          Continue
          <ArrowRight className="ml-1.5 h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
