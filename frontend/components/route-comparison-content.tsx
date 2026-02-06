"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, MapPin, Navigation, Loader2 } from "lucide-react"
import { RouteCard } from "@/components/route-card"
import { useRequireUser } from "@/hooks/useRequireUser"
import { useDriveStore } from "@/stores/driveStore"
import { routeService } from "@/services/routeService"
import type { Route } from "@/types/route"

function getStressColor(calmScore: number): "green" | "yellow" | "red" {
  if (calmScore >= 60) return "green"
  if (calmScore >= 40) return "yellow"
  return "red"
}

function getStressLabel(stressLevel: string): string {
  switch (stressLevel) {
    case "LOW":
      return "Low Stress"
    case "MEDIUM":
      return "Moderate"
    case "HIGH":
      return "High Stress"
    case "CRITICAL":
      return "Critical"
    default:
      return stressLevel
  }
}

function getCalmEmoji(calmScore: number): string {
  if (calmScore >= 60) return "\u{1F60A}" // 😊
  if (calmScore >= 40) return "\u{1F610}" // 😐
  return "\u{1F630}" // 😰
}

export function RouteComparisonContent() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useRequireUser()
  const { routes, origin, destination, setSelectedRoute, setPrepareData } =
    useDriveStore()

  const [loadingRouteId, setLoadingRouteId] = useState<string | null>(null)

  // Redirect to /plan if no routes are available
  useEffect(() => {
    if (!authLoading && routes.length === 0) {
      router.replace("/plan")
    }
  }, [authLoading, routes, router])

  async function handleSelectRoute(route: Route) {
    if (!user) return

    setLoadingRouteId(route.id)
    try {
      const prepareRes = await routeService.prepare({
        user_id: user.id,
        route_id: route.id,
      })
      setSelectedRoute(route)
      setPrepareData(prepareRes)
      router.push("/prepare")
    } catch (err) {
      console.error("Failed to prepare route:", err)
      // Still navigate — prepare page can show a fallback
      setSelectedRoute(route)
      setPrepareData(null)
      router.push("/prepare")
    } finally {
      setLoadingRouteId(null)
    }
  }

  if (authLoading || routes.length === 0) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  // Sort: recommended first, then by calm_score descending
  const sortedRoutes = [...routes].sort((a, b) => {
    if (a.is_recommended && !b.is_recommended) return -1
    if (!a.is_recommended && b.is_recommended) return 1
    return b.calm_score - a.calm_score
  })

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

      {/* Trip summary */}
      <div className="mt-6 px-6">
        <div className="relative flex h-[180px] items-center justify-center overflow-hidden rounded-2xl border-2 border-border bg-secondary">
          {/* Decorative route lines */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 358 180"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M40,140 Q80,120 120,100 Q160,80 200,90 Q240,100 280,70 Q300,55 320,50"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeDasharray="8 4"
              strokeLinecap="round"
              fill="none"
              opacity="0.7"
            />
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
            <Navigation
              className="h-3.5 w-3.5 text-primary-foreground"
              strokeWidth={2.5}
            />
          </div>

          {/* End pin */}
          <div className="absolute right-8 top-8 flex h-8 w-8 items-center justify-center rounded-full bg-destructive shadow-md shadow-destructive/30">
            <MapPin
              className="h-3.5 w-3.5 text-destructive-foreground"
              strokeWidth={2.5}
            />
          </div>

          {/* Origin → Destination label */}
          <div className="z-10 flex flex-col items-center gap-1 rounded-lg bg-card/80 px-4 py-2 backdrop-blur-sm">
            <span className="text-xs font-medium text-muted-foreground">
              {origin}
            </span>
            <span className="text-[10px] text-muted-foreground/60">to</span>
            <span className="text-xs font-semibold text-foreground">
              {destination}
            </span>
          </div>
        </div>
      </div>

      {/* Route count */}
      <div className="mt-6 px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {sortedRoutes.length} {sortedRoutes.length === 1 ? "route" : "routes"}{" "}
          found
        </p>
      </div>

      {/* Route cards */}
      <div className="mt-3 flex flex-col gap-4 px-6">
        {sortedRoutes.map((route) => (
          <RouteCard
            key={route.id}
            name={route.name}
            duration={`${route.duration_minutes} min`}
            distance={`${route.distance_km} km`}
            calmScore={route.calm_score}
            calmEmoji={getCalmEmoji(route.calm_score)}
            stressLevel={getStressLabel(route.stress_level)}
            stressColor={getStressColor(route.calm_score)}
            stressPoints={route.stress_points.length}
            recommended={route.is_recommended}
            mapsUrl={route.maps_url}
            loading={loadingRouteId === route.id}
            onSelect={() => handleSelectRoute(route)}
          />
        ))}
      </div>
    </div>
  )
}
