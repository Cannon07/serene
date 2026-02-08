"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { MapPin, Clock, Route, X, Hand, AlertOctagon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useInterventionStore } from "@/stores/interventionStore"
import { useDriveStore } from "@/stores/driveStore"
import { driveService } from "@/services/driveService"
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis"

interface StressInterventionProps {
  onDismiss: () => void
}

export function StressIntervention({ onDismiss }: StressInterventionProps) {
  const intervention = useInterventionStore((s) => s.activeIntervention)
  const activeDrive = useDriveStore((s) => s.activeDrive)

  const tts = useSpeechSynthesis()

  const [phase, setPhase] = useState<"in" | "hold" | "out">("in")
  const [countdown, setCountdown] = useState(4)
  const [visible, setVisible] = useState(false)
  const [acceptingReroute, setAcceptingReroute] = useState(false)
  const spokeRef = useRef(false)

  // Fade in on mount + speak the calming message
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    if (intervention?.message && !spokeRef.current) {
      spokeRef.current = true
      tts.speak(intervention.message)
    }
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Determine intervention mode
  const hasBreathing = !!intervention?.breathing_content
  const hasGrounding = !!intervention?.grounding_content
  const hasPullOver = intervention?.pull_over_guidance && intervention.pull_over_guidance.length > 0
  const hasReroute = intervention?.reroute_available && !!intervention.reroute_option

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
    if (!hasBreathing) return

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
  }, [phase, nextPhase, hasBreathing])

  const phaseLabel =
    phase === "in"
      ? "Breathe In..."
      : phase === "hold"
        ? "Hold..."
        : "Breathe Out..."

  const circleScale =
    phase === "in"
      ? "scale-110"
      : phase === "hold"
        ? "scale-110"
        : "scale-90"

  function handleDismiss() {
    tts.stop()
    setVisible(false)
    setTimeout(onDismiss, 300)
  }

  async function handleAcceptReroute() {
    if (!hasReroute || !activeDrive || acceptingReroute) return
    setAcceptingReroute(true)

    try {
      await driveService.acceptReroute(activeDrive.id, {
        route_name: intervention!.reroute_option!.alternative_route_name,
        calm_score_improvement:
          intervention!.reroute_option!.alternative_route_calm_score -
          intervention!.reroute_option!.current_route_calm_score,
      })
      window.open(intervention!.reroute_option!.maps_url, "_blank")
      handleDismiss()
    } catch {
      // Failed to record reroute — still open maps
      window.open(intervention!.reroute_option!.maps_url, "_blank")
      handleDismiss()
    }
  }

  // Calming message from intervention or fallback
  const message = intervention?.message || "I'm here with you. Let's take a moment."

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
        className={`relative z-10 mx-auto w-full max-w-[425px] transform transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-card px-6 pb-[env(safe-area-inset-bottom,16px)] pt-6 shadow-2xl">
          {/* Drag handle */}
          <div className="mb-4 flex justify-center">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>

          {/* Calming message */}
          <p className="mb-6 text-center text-lg font-semibold leading-relaxed text-foreground">
            {message}
          </p>

          {/* Breathing exercise */}
          {hasBreathing && (
            <div className="mb-6 flex flex-col items-center gap-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {intervention!.breathing_content!.name}
              </p>
              <div className="relative flex h-[150px] w-[150px] items-center justify-center">
                <div
                  className={`absolute inset-0 rounded-full bg-primary/10 transition-transform duration-[4000ms] ease-in-out ${circleScale}`}
                />
                <div
                  className={`absolute inset-3 rounded-full bg-primary/15 transition-transform duration-[4000ms] ease-in-out ${circleScale}`}
                />
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
          )}

          {/* Grounding exercise */}
          {hasGrounding && !hasBreathing && (
            <div className="mb-6 rounded-2xl border border-border bg-secondary/50 p-4">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <Hand className="h-5 w-5 text-primary" strokeWidth={1.8} />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {intervention!.grounding_content!.name}
                </p>
              </div>
              <ol className="ml-1 flex flex-col gap-2">
                {intervention!.grounding_content!.instructions.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-foreground">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Pull-over guidance */}
          {hasPullOver && (
            <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10">
                  <AlertOctagon className="h-5 w-5 text-destructive" strokeWidth={1.8} />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Find a safe place to pull over
                </p>
              </div>
              <ul className="ml-1 flex flex-col gap-2">
                {intervention!.pull_over_guidance!.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-foreground">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-xs font-bold text-destructive">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Reroute suggestion card — only when available */}
          {hasReroute && (
            <div className="mb-5 rounded-2xl border border-border bg-secondary/50 p-4">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <Route className="h-5 w-5 text-primary" strokeWidth={1.8} />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  A calmer route is available
                </p>
              </div>

              <div className="mb-4 flex items-center gap-3 rounded-xl bg-card px-3.5 py-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
                <span className="text-sm font-medium text-foreground">
                  {intervention!.reroute_option!.alternative_route_name}
                </span>
                <span className="text-xs text-muted-foreground">{"/"}</span>
                <Clock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
                <span className="text-xs text-muted-foreground">
                  +{intervention!.reroute_option!.extra_time_minutes} min
                </span>
                <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Score {intervention!.reroute_option!.alternative_route_calm_score}
                </span>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleAcceptReroute}
                  disabled={acceptingReroute}
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
          )}

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
