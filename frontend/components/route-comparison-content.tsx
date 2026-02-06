"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, MapPin, Navigation, Loader2 } from "lucide-react"
import { RouteCard } from "@/components/route-card"
import { useRequireUser } from "@/hooks/useRequireUser"

export function RouteComparisonContent() {
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
          onClick={() => router.push("/plan")}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors hover:bg-accent"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Choose Your Route
        </h1>
      </div>

      {/* Map placeholder */}
      <div className="mt-6 px-6">
        <div className="relative flex h-[180px] items-center justify-center overflow-hidden rounded-2xl border-2 border-border bg-secondary">
          {/* Decorative route lines */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 358 180"
            fill="none"
            aria-hidden="true"
          >
            {/* Route 1 - curved local roads (green) */}
            <path
              d="M40,140 Q80,120 120,100 Q160,80 200,90 Q240,100 280,70 Q300,55 320,50"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeDasharray="8 4"
              strokeLinecap="round"
              fill="none"
              opacity="0.7"
            />
            {/* Route 2 - more direct highway (muted) */}
            <path
              d="M40,140 Q100,130 160,100 Q220,70 280,60 Q300,55 320,50"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="2.5"
              strokeDasharray="6 6"
              strokeLinecap="round"
              fill="none"
              opacity="0.4"
            />
          </svg>

          {/* Start pin */}
          <div className="absolute bottom-8 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow-md shadow-primary/30">
            <Navigation className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={2.5} />
          </div>

          {/* End pin */}
          <div className="absolute right-8 top-8 flex h-8 w-8 items-center justify-center rounded-full bg-destructive shadow-md shadow-destructive/30">
            <MapPin className="h-3.5 w-3.5 text-destructive-foreground" strokeWidth={2.5} />
          </div>

          {/* Label */}
          <span className="z-10 rounded-lg bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            Map showing routes
          </span>
        </div>
      </div>

      {/* Route cards */}
      <div className="mt-6 flex flex-col gap-4 px-6">
        <RouteCard
          name="Via Local Roads"
          duration="35 min"
          distance="14.0 km"
          calmScore={78}
          calmEmoji="&#128522;"
          stressLevel="Low Stress"
          stressColor="green"
          stressPoints={1}
          recommended
          onSelect={() => router.push("/prepare")}
        />

        <RouteCard
          name="Via Highway"
          duration="25 min"
          distance="12.5 km"
          calmScore={45}
          calmEmoji="&#128560;"
          stressLevel="High Stress"
          stressColor="red"
          stressPoints={3}
          onSelect={() => router.push("/prepare")}
        />
      </div>
    </div>
  )
}
