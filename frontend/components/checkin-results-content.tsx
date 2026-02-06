"use client"

import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Mic,
  ScanFace,
  Activity,
  CheckCircle2,
  Wind,
  MessageCircle,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRequireUser } from "@/hooks/useRequireUser"

const DETECTED_ITEMS = [
  { icon: Mic, label: "Voice tremor detected" },
  { icon: ScanFace, label: "Facial tension elevated" },
  { icon: Activity, label: "Anxiety indicators present" },
]

const RECOMMENDATIONS = [
  { emoji: "\uD83D\uDC9A", label: "Consider the calmer route option" },
  { emoji: "\uD83E\uDDD8", label: "Try the breathing exercise before driving" },
  { emoji: "\uD83C\uDFB5", label: "Prepare your calming playlist" },
]

export function CheckinResultsContent() {
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
          {/* Background ring */}
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 160 160">
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
              stroke="hsl(0, 84%, 60%)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 70 * 0.72} ${2 * Math.PI * 70 * 0.28}`}
            />
          </svg>
          {/* Center content */}
          <div className="relative flex flex-col items-center">
            <span className="text-3xl" role="img" aria-label="worried face">
              {"\uD83D\uDE1F"}
            </span>
            <span className="mt-1 text-4xl font-bold text-foreground">72%</span>
          </div>
        </div>
        <span className="rounded-lg bg-destructive/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-destructive">
          High
        </span>
      </div>

      {/* Detected section */}
      <div className="mt-8 px-6">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" strokeWidth={2} />
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Detected
          </h2>
        </div>

        <div className="mt-3 rounded-2xl border-2 border-destructive/20 bg-destructive/5 p-4">
          <div className="flex flex-col gap-3">
            {DETECTED_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                  <item.icon className="h-4 w-4 text-destructive" strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-foreground">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations section */}
      <div className="mt-6 px-6">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" strokeWidth={2} />
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Recommendations
          </h2>
        </div>

        <div className="mt-3 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4">
          <div className="flex flex-col gap-3">
            {RECOMMENDATIONS.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base">
                  {item.emoji}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI message bubble */}
      <div className="mt-6 px-6">
        <div className="rounded-2xl border-2 border-primary/15 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <MessageCircle className="h-4 w-4 text-primary" strokeWidth={2} />
            </div>
            <p className="text-sm leading-relaxed text-foreground">
              I can see you{"'"}re feeling anxious about this drive. That{"'"}s
              completely okay. Let{"'"}s take it one step at a time together.
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
          className="h-14 w-full rounded-2xl border-2 text-base font-semibold text-foreground hover:border-primary/30 hover:text-primary bg-transparent"
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
