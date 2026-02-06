"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  MapPin,
  Clock,
  Route,
  Smile,
  Meh,
  Frown,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Lightbulb,
  Wind,
  ArrowRight,
  ClipboardCheck,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRequireUser } from "@/hooks/useRequireUser"
import { useDriveStore } from "@/stores/driveStore"

const STRESS_TYPE_LABELS: Record<string, string> = {
  HIGHWAYS: "Highway",
  HEAVY_TRAFFIC: "Heavy Traffic",
  COMPLEX_INTERSECTIONS: "Complex Intersection",
  CONSTRUCTION: "Construction",
  PEDESTRIAN_AREAS: "Pedestrian Area",
  HONKING: "Honking Zone",
  NIGHT_DRIVING: "Night Driving",
}

function getStressIcon(stressLevel: string) {
  switch (stressLevel) {
    case "LOW":
      return Smile
    case "MEDIUM":
      return Meh
    default:
      return Frown
  }
}

export function PreDriveContent() {
  const router = useRouter()
  const { isLoading: authLoading } = useRequireUser()
  const { selectedRoute, prepareData, destination } = useDriveStore()

  const checklist = prepareData?.checklist ?? []
  const stressPoints = prepareData?.stress_points_with_tips ?? []
  const breathingExercise = prepareData?.breathing_exercise

  const [checked, setChecked] = useState<Set<number>>(new Set())

  // Auto-check the first item ("Review stress points below")
  useEffect(() => {
    if (checklist.length > 0) {
      setChecked(new Set([0]))
    }
  }, [checklist.length])

  // Redirect if no selected route
  useEffect(() => {
    if (!authLoading && !selectedRoute) {
      router.replace("/plan")
    }
  }, [authLoading, selectedRoute, router])

  function toggleItem(index: number) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const allChecked = checklist.length > 0 && checked.size === checklist.length

  if (authLoading || !selectedRoute) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const StressLevelIcon = getStressIcon(selectedRoute.stress_level)

  return (
    <div className="flex min-h-dvh flex-col pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-14">
        <button
          type="button"
          onClick={() => router.push("/routes")}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors hover:bg-accent"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Prepare for Your Drive
        </h1>
      </div>

      {/* Route summary card */}
      <div className="mt-6 px-6">
        <div className="flex items-center gap-4 rounded-2xl border-2 border-border bg-card p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <MapPin className="h-5 w-5 text-primary" strokeWidth={1.8} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              {destination} via {selectedRoute.name}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" strokeWidth={2} />
                {selectedRoute.duration_minutes} min
              </span>
              <span className="text-border">&bull;</span>
              <span className="flex items-center gap-1">
                <Route className="h-3 w-3" strokeWidth={2} />
                {selectedRoute.distance_km} km
              </span>
              <span className="text-border">&bull;</span>
              <span className="flex items-center gap-1">
                <StressLevelIcon
                  className="h-3 w-3 text-primary"
                  strokeWidth={2}
                />
                <span className="font-medium text-primary">
                  Calm: {selectedRoute.calm_score}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Checklist section */}
      {checklist.length > 0 && (
        <div className="mt-8 px-6">
          <div className="flex items-center gap-2">
            <ClipboardCheck
              className="h-4 w-4 text-muted-foreground"
              strokeWidth={2}
            />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Checklist
            </h2>
            <span className="ml-auto text-[11px] font-medium text-muted-foreground">
              {checked.size}/{checklist.length}
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {checklist.map((item, index) => {
              const isChecked = checked.has(index)
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleItem(index)}
                  className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all ${
                    isChecked
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-card hover:border-primary/20"
                  }`}
                >
                  {isChecked ? (
                    <CheckCircle2
                      className="h-5 w-5 shrink-0 text-primary"
                      strokeWidth={2}
                    />
                  ) : (
                    <Circle
                      className="h-5 w-5 shrink-0 text-muted-foreground/50"
                      strokeWidth={1.8}
                    />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      isChecked ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {item}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Stress points section */}
      {stressPoints.length > 0 && (
        <div className="mt-8 px-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-chart-4" strokeWidth={2} />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Stress Points on Your Route
            </h2>
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {stressPoints.map((point, index) => (
              <div
                key={index}
                className="rounded-2xl border-2 border-chart-4/30 bg-chart-4/5 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-chart-4/15">
                    <AlertTriangle
                      className="h-4.5 w-4.5 text-chart-4"
                      strokeWidth={2}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {point.location}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {STRESS_TYPE_LABELS[point.type] || point.type}
                      </span>
                      <span className="rounded-md bg-chart-4/15 px-2 py-0.5 text-[11px] font-bold text-chart-4">
                        {point.severity}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tip */}
                {point.tip && (
                  <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-card/80 p-3">
                    <Lightbulb
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      strokeWidth={2}
                    />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        Tip:
                      </span>{" "}
                      {point.tip}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Breathing exercise card */}
      {breathingExercise && (
        <div className="mt-6 px-6">
          <div className="flex items-center gap-4 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Wind className="h-6 w-6 text-primary" strokeWidth={1.8} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">
                {breathingExercise.name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {Math.round(breathingExercise.duration_seconds / 60)} minutes to
                calm your nerves
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/breathing")}
              className="shrink-0 rounded-lg border-2 border-primary/30 bg-transparent text-xs font-semibold text-primary hover:bg-primary/10 hover:text-primary"
            >
              Start
            </Button>
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom buttons */}
      <div className="mt-8 flex flex-col gap-3 px-6">
        <Button
          variant="outline"
          onClick={() => router.push("/checkin")}
          className="h-14 w-full rounded-2xl border-2 bg-transparent text-base font-semibold text-foreground hover:border-primary/30 hover:text-primary"
          size="lg"
        >
          <ClipboardCheck className="mr-2 h-5 w-5" />
          Do a Quick Check-in First
        </Button>
        <Button
          disabled={!allChecked}
          onClick={() => router.push("/drive")}
          className="h-14 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-40 disabled:shadow-none"
          size="lg"
        >
          {"I'm Ready - Start Drive"}
          <ArrowRight className="ml-1.5 h-5 w-5" />
        </Button>
        {!allChecked && (
          <p className="text-center text-xs text-muted-foreground">
            Complete all checklist items to start driving
          </p>
        )}
      </div>
    </div>
  )
}
