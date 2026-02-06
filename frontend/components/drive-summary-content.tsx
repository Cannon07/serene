"use client"

import { useRouter } from "next/navigation"
import {
  MapPin,
  Clock,
  Route,
  Sparkles,
  AlertTriangle,
  Navigation,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const STATS = [
  { label: "Interventions", value: "1" },
  { label: "Reroutes", value: "0" },
  { label: "Avg Calm", value: "76%" },
]

export function DriveSummaryContent() {
  const router = useRouter()

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-10">
      {/* Top safe area */}
      <div className="pt-14" />

      {/* Celebration header */}
      <div className="relative flex flex-col items-center gap-3 px-6">
        {/* Decorative sparkles */}
        <div className="absolute -top-2 left-16 text-primary/30">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="absolute right-20 top-0 text-primary/20">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="absolute left-24 top-16 text-primary/15">
          <Sparkles className="h-3 w-3" />
        </div>
        <div className="absolute right-16 top-20 text-primary/25">
          <Sparkles className="h-4 w-4" />
        </div>

        {/* Success badge */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
            <span className="text-4xl" role="img" aria-label="celebration">
              {"\uD83C\uDF89"}
            </span>
          </div>
        </div>

        <h1 className="text-balance text-center text-2xl font-bold tracking-tight text-foreground">
          {"You've Arrived!"}
        </h1>
        <p className="text-center text-sm font-medium text-muted-foreground">
          Great job completing this drive.
        </p>
      </div>

      {/* Drive summary card */}
      <div className="mt-8 px-6">
        <div className="rounded-2xl border-2 border-border bg-card p-5">
          {/* Trip details */}
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  Phoenix Mall, Viman Nagar
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Destination reached
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <Clock className="h-5 w-5 text-foreground" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">38 minutes</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Drive duration
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <Route className="h-5 w-5 text-foreground" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  Via Local Roads
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  14.2 km traveled
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-dashed border-border" />

          {/* Stats row */}
          <div className="flex items-center justify-between">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1">
                <span className="text-xl font-bold text-foreground">
                  {stat.value}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stress point resolved */}
      <div className="mt-5 px-6">
        <div className="flex items-center gap-3 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <AlertTriangle className="h-5 w-5 text-primary" strokeWidth={1.8} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">
              Stress point handled
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Breathing exercise helped at MG Road junction
            </p>
          </div>
        </div>
      </div>

      {/* Debrief prompt */}
      <div className="mt-8 px-6">
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-border bg-card p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Navigation className="h-6 w-6 text-primary" strokeWidth={1.8} />
          </div>
          <h2 className="text-base font-bold text-foreground">
            Would you like to do a quick debrief?
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            It helps Serene learn and support you better on future drives.
          </p>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom buttons */}
      <div className="mt-8 flex flex-col gap-3 px-6">
        <Button
          onClick={() => router.push("/debrief")}
          className="h-14 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
          size="lg"
        >
          {"Yes, Let's Debrief"}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard")}
          className="h-14 w-full rounded-2xl border-2 text-base font-semibold text-muted-foreground hover:border-border hover:text-foreground bg-transparent"
          size="lg"
        >
          Skip
        </Button>
      </div>
    </div>
  )
}
