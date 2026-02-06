"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { X, Loader2 } from "lucide-react"
import { useRequireUser } from "@/hooks/useRequireUser"
import { useDriveStore } from "@/stores/driveStore"

type Phase = "inhale" | "hold" | "exhale"

const PHASES: { key: Phase; label: string; duration: number }[] = [
  { key: "inhale", label: "Breathe In", duration: 4 },
  { key: "hold", label: "Hold", duration: 7 },
  { key: "exhale", label: "Breathe Out", duration: 8 },
]

const TOTAL_ROUNDS = 4

export function BreathingExerciseContent() {
  const router = useRouter()
  const { isLoading } = useRequireUser()
  const exerciseName = useDriveStore((s) => s.prepareData?.breathing_exercise?.name) ?? "4-7-8 Breathing"
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [countdown, setCountdown] = useState(PHASES[0].duration)
  const [round, setRound] = useState(1)
  const [isComplete, setIsComplete] = useState(false)

  const currentPhase = PHASES[phaseIndex]

  const advancePhase = useCallback(() => {
    const nextIndex = phaseIndex + 1
    if (nextIndex >= PHASES.length) {
      // Completed one full round
      if (round >= TOTAL_ROUNDS) {
        setIsComplete(true)
        return
      }
      setRound((r) => r + 1)
      setPhaseIndex(0)
      setCountdown(PHASES[0].duration)
    } else {
      setPhaseIndex(nextIndex)
      setCountdown(PHASES[nextIndex].duration)
    }
  }, [phaseIndex, round])

  useEffect(() => {
    if (isComplete) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          advancePhase()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [phaseIndex, round, isComplete, advancePhase])

  // Circle scale based on phase
  const getScale = () => {
    if (currentPhase.key === "inhale") return "scale-100"
    if (currentPhase.key === "hold") return "scale-100"
    return "scale-[0.65]"
  }

  // Transition duration matches the phase duration
  const getTransitionDuration = () => {
    return `${currentPhase.duration * 1000}ms`
  }

  // Progress percentage across all rounds
  const completedCycles =
    (round - 1) * PHASES.reduce((a, p) => a + p.duration, 0) +
    PHASES.slice(0, phaseIndex).reduce((a, p) => a + p.duration, 0) +
    (currentPhase.duration - countdown)
  const totalCycles = TOTAL_ROUNDS * PHASES.reduce((a, p) => a + p.duration, 0)
  const progressPercent = isComplete ? 100 : (completedCycles / totalCycles) * 100

  function handleEnd() {
    router.back()
  }

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center bg-gradient-to-b from-[hsl(150,35%,95%)] via-[hsl(160,30%,93%)] to-[hsl(190,25%,92%)]">
      {/* Header */}
      <div className="w-full px-6 pt-14">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {exerciseName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Follow the circle
            </p>
          </div>
          <button
            type="button"
            onClick={handleEnd}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card/80 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Main breathing circle area */}
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
        {isComplete ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-[200px] w-[200px] items-center justify-center rounded-full bg-primary/10">
              <div className="flex h-[160px] w-[160px] items-center justify-center rounded-full bg-primary/15">
                <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-primary/20">
                  <span className="text-5xl" role="img" aria-label="relaxed">
                    {"\uD83D\uDE0C"}
                  </span>
                </div>
              </div>
            </div>
            <h2 className="mt-2 text-2xl font-bold text-foreground">
              Well Done
            </h2>
            <p className="max-w-[260px] text-center text-sm leading-relaxed text-muted-foreground">
              You completed 4 rounds of {exerciseName.toLowerCase()}. Take a moment to notice
              how calm you feel.
            </p>
          </div>
        ) : (
          <>
            {/* Animated circle */}
            <div className="relative flex h-[200px] w-[200px] items-center justify-center">
              {/* Outermost ring */}
              <div
                className={`absolute inset-0 rounded-full bg-primary/8 transition-transform ease-in-out ${getScale()}`}
                style={{
                  transitionDuration: getTransitionDuration(),
                }}
              />
              {/* Middle ring */}
              <div
                className={`absolute inset-5 rounded-full bg-primary/12 shadow-[0_0_40px_rgba(76,175,125,0.15)] transition-transform ease-in-out ${getScale()}`}
                style={{
                  transitionDuration: getTransitionDuration(),
                }}
              />
              {/* Inner ring */}
              <div
                className={`absolute inset-10 rounded-full bg-primary/18 shadow-[0_0_30px_rgba(76,175,125,0.2)] transition-transform ease-in-out ${getScale()}`}
                style={{
                  transitionDuration: getTransitionDuration(),
                }}
              />
              {/* Core circle */}
              <div
                className={`relative flex h-[100px] w-[100px] items-center justify-center rounded-full bg-primary/25 shadow-[0_0_20px_rgba(76,175,125,0.3)] transition-transform ease-in-out ${getScale()}`}
                style={{
                  transitionDuration: getTransitionDuration(),
                }}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-semibold text-primary">
                    {currentPhase.label}
                  </span>
                  <span className="font-mono text-3xl font-bold text-primary">
                    {countdown}
                  </span>
                </div>
              </div>
            </div>

            {/* Phase indicators */}
            <div className="flex items-center gap-3">
              {PHASES.map((p, i) => (
                <div key={p.key} className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                        i === phaseIndex
                          ? "scale-125 bg-primary shadow-[0_0_8px_rgba(76,175,125,0.5)]"
                          : i < phaseIndex
                            ? "bg-primary/40"
                            : "bg-border"
                      }`}
                    />
                    <span
                      className={`text-[10px] font-medium ${
                        i === phaseIndex
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      {p.label} ({p.duration}s)
                    </span>
                  </div>
                  {i < PHASES.length - 1 && (
                    <div
                      className={`mb-5 h-px w-6 ${
                        i < phaseIndex ? "bg-primary/40" : "bg-border"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom section */}
      <div className="w-full px-6 pb-[env(safe-area-inset-bottom,24px)]">
        {/* Round progress */}
        {!isComplete && (
          <div className="mb-6 flex flex-col items-center gap-2.5">
            <span className="text-sm font-medium text-muted-foreground">
              Round {round} of {TOTAL_ROUNDS}
            </span>
            <div className="h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* End / Done button */}
        <div className="flex justify-center pb-4">
          {isComplete ? (
            <button
              type="button"
              onClick={handleEnd}
              className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
            >
              {"I'm Feeling Calmer"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEnd}
              className="rounded-xl px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              End Exercise
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
