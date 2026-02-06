"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { MapPin, Clock, Route, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface StressInterventionProps {
  onDismiss: () => void
}

export function StressIntervention({ onDismiss }: StressInterventionProps) {
  const router = useRouter()
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in")
  const [countdown, setCountdown] = useState(4)
  const [visible, setVisible] = useState(false)

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  // Breathing cycle: 4s in -> 4s hold -> 4s out -> repeat
  const phaseDurations = { in: 4, hold: 4, out: 4 }

  const nextPhase = useCallback(() => {
    setPhase((prev) => {
      if (prev === "in") return "hold"
      if (prev === "hold") return "out"
      return "in"
    })
  }, [])

  useEffect(() => {
    const duration = phaseDurations[phase]
    setCountdown(duration)

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          nextPhase()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [phase, nextPhase])

  const phaseLabel =
    phase === "in"
      ? "Breathe In..."
      : phase === "hold"
        ? "Hold..."
        : "Breathe Out..."

  // Scale for the breathing circle
  const circleScale =
    phase === "in"
      ? "scale-110"
      : phase === "hold"
        ? "scale-110"
        : "scale-90"

  function handleDismiss() {
    setVisible(false)
    setTimeout(onDismiss, 300)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleDismiss}
        onKeyDown={(e) => e.key === "Escape" && handleDismiss()}
        role="button"
        tabIndex={0}
        aria-label="Dismiss overlay"
      />

      {/* Modal card */}
      <div
        className={`relative z-10 mx-auto w-full max-w-[390px] transform transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="rounded-t-3xl bg-card px-6 pb-[env(safe-area-inset-bottom,16px)] pt-6 shadow-2xl">
          {/* Drag handle */}
          <div className="mb-4 flex justify-center">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>

          {/* Calming message */}
          <p className="text-center text-lg font-semibold leading-relaxed text-foreground">
            {"I'm here with you."}
          </p>
          <p className="mb-6 text-center text-lg font-semibold leading-relaxed text-foreground">
            {"Let's breathe together."}
          </p>

          {/* Breathing circle */}
          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="relative flex h-[150px] w-[150px] items-center justify-center">
              {/* Outer glow */}
              <div
                className={`absolute inset-0 rounded-full bg-primary/10 transition-transform duration-[4000ms] ease-in-out ${circleScale}`}
              />
              {/* Middle ring */}
              <div
                className={`absolute inset-3 rounded-full bg-primary/15 transition-transform duration-[4000ms] ease-in-out ${circleScale}`}
              />
              {/* Inner circle */}
              <div
                className={`relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/20 transition-transform duration-[4000ms] ease-in-out ${circleScale}`}
              >
                <span className="text-sm font-semibold text-primary">
                  {phaseLabel}
                </span>
              </div>
            </div>
            <span className="font-mono text-2xl font-bold text-primary">
              {countdown}s
            </span>
          </div>

          {/* Reroute suggestion card */}
          <div className="mb-5 rounded-2xl border border-border bg-secondary/50 p-4">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Route className="h-4.5 w-4.5 text-primary" strokeWidth={1.8} />
              </div>
              <p className="text-sm font-semibold text-foreground">
                A calmer route is available
              </p>
            </div>

            <div className="mb-4 flex items-center gap-3 rounded-xl bg-card px-3.5 py-2.5">
              <MapPin className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
              <span className="text-sm font-medium text-foreground">
                Via Lake Road
              </span>
              <span className="text-xs text-muted-foreground">{"/"}</span>
              <Clock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
              <span className="text-xs text-muted-foreground">+8 min</span>
              <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Much calmer
              </span>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => router.push("/drive")}
                className="h-11 flex-1 rounded-xl text-sm font-semibold"
                size="sm"
              >
                Take Calmer Route
              </Button>
              <Button
                variant="outline"
                onClick={handleDismiss}
                className="h-11 flex-1 rounded-xl border-2 text-sm font-semibold text-foreground bg-transparent"
                size="sm"
              >
                Keep Current
              </Button>
            </div>
          </div>

          {/* Dismiss link */}
          <div className="flex justify-center pb-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" strokeWidth={2} />
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
