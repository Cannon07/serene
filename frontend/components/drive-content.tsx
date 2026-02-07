"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  MapPin,
  Navigation,
  Clock,
  Shield,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRequireUser } from "@/hooks/useRequireUser"
import { useDriveStore } from "@/stores/driveStore"
import { driveService } from "@/services/driveService"
import { useWakeLock } from "@/hooks/useWakeLock"
import { useGeolocation } from "@/hooks/useGeolocation"

export function DriveContent() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useRequireUser()

  const destination = useDriveStore((s) => s.destination)
  const origin = useDriveStore((s) => s.origin)
  const selectedRoute = useDriveStore((s) => s.selectedRoute)
  const checkinResult = useDriveStore((s) => s.checkinResult)
  const activeDrive = useDriveStore((s) => s.activeDrive)
  const setActiveDrive = useDriveStore((s) => s.setActiveDrive)
  const setDriveEndResponse = useDriveStore((s) => s.setDriveEndResponse)
  const setCurrentLocation = useDriveStore((s) => s.setCurrentLocation)

  const [elapsed, setElapsed] = useState(0)
  const [starting, setStarting] = useState(false)
  const [ending, setEnding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startedRef = useRef(false)

  // Keep screen on
  const wakeLock = useWakeLock()

  // Track location
  const geo = useGeolocation()

  // Activate wake lock + geolocation on mount
  useEffect(() => {
    wakeLock.request()
    geo.startWatching()

    return () => {
      wakeLock.release()
      geo.stopWatching()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync geolocation to store
  useEffect(() => {
    if (geo.position) {
      setCurrentLocation({
        latitude: geo.position.latitude,
        longitude: geo.position.longitude,
      })
    }
  }, [geo.position, setCurrentLocation])

  // Start drive on mount (once)
  useEffect(() => {
    if (!user || startedRef.current || activeDrive) return
    startedRef.current = true

    async function startDrive() {
      setStarting(true)
      setError(null)

      try {
        const routeType =
          selectedRoute?.is_recommended ? "CALMEST" : "FASTEST"

        const result = await driveService.start({
          user_id: user!.id,
          origin: origin || "Current Location",
          destination: destination || "Unknown",
          selected_route_type: routeType as "FASTEST" | "CALMEST",
          pre_drive_stress: checkinResult?.stress_score,
        })

        setActiveDrive(result)
      } catch {
        setError("Failed to start drive. Please try again.")
        startedRef.current = false
      } finally {
        setStarting(false)
      }
    }

    startDrive()
  }, [user, activeDrive, origin, destination, selectedRoute, checkinResult, setActiveDrive])

  // Timer based on activeDrive.started_at
  useEffect(() => {
    if (!activeDrive) return

    const startTime = new Date(activeDrive.started_at).getTime()

    function tick() {
      const now = Date.now()
      setElapsed(Math.floor((now - startTime) / 1000))
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [activeDrive])

  const handleEndDrive = useCallback(async () => {
    if (!activeDrive || ending) return

    setEnding(true)
    setError(null)

    try {
      const result = await driveService.end(activeDrive.id)
      setDriveEndResponse(result)
      router.push("/drive/summary")
    } catch {
      setError("Failed to end drive. Please try again.")
      setEnding(false)
    }
  }, [activeDrive, ending, setDriveEndResponse, router])

  const handleOpenMaps = useCallback(() => {
    if (selectedRoute?.maps_url) {
      window.open(selectedRoute.maps_url, "_blank")
    }
  }, [selectedRoute])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const timeDisplay = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  // Starting state
  if (starting || (!activeDrive && !error)) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[hsl(150,20%,6%)]">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(152,55%,42%)]" />
        <p className="text-sm font-medium text-[hsl(140,10%,60%)]">
          Starting your drive...
        </p>
      </div>
    )
  }

  // Error with no active drive — allow retry or go back
  if (error && !activeDrive) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[hsl(150,20%,6%)] px-6">
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" strokeWidth={1.8} />
          <p className="text-sm text-destructive">{error}</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border-white/20 text-white bg-transparent hover:bg-white/10"
          >
            Go Back
          </Button>
          <Button
            onClick={() => {
              startedRef.current = false
              setError(null)
            }}
            className="rounded-xl bg-[hsl(152,55%,42%)] text-white hover:bg-[hsl(152,55%,38%)]"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[hsl(150,20%,6%)]">
      {/* Top safe area spacer */}
      <div className="pt-16" />

      {/* Status indicator - centered */}
      <div className="flex flex-col items-center gap-4 px-6">
        {/* Pulsing green dot */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div
            className="absolute inset-0 animate-ping rounded-full bg-[hsl(152,55%,42%)]/20"
            style={{ animationDuration: "2s" }}
          />
          <div className="absolute inset-2 rounded-full bg-[hsl(152,55%,42%)]/10" />
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(152,55%,42%)] shadow-lg shadow-[hsl(152,55%,42%)]/40">
            <Shield
              className="h-5 w-5 text-white"
              strokeWidth={2.2}
              fill="currentColor"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Serene Active
          </h1>
          <p className="text-sm font-medium text-[hsl(140,10%,60%)]">
            Listening...
          </p>
        </div>

        {/* Timer */}
        <div className="mt-2 rounded-xl bg-white/5 px-5 py-2">
          <p className="font-mono text-lg font-semibold tracking-widest text-[hsl(140,10%,60%)]">
            {timeDisplay}
          </p>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Destination card */}
      <div className="px-6">
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[hsl(152,55%,42%)]/15">
            <MapPin
              className="h-6 w-6 text-[hsl(152,55%,42%)]"
              strokeWidth={1.8}
            />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-white">
              {destination || "Destination"}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <Clock
                className="h-3.5 w-3.5 text-[hsl(140,10%,60%)]"
                strokeWidth={2}
              />
              <span className="text-sm font-medium text-[hsl(140,10%,60%)]">
                {selectedRoute
                  ? `${selectedRoute.name} · ${selectedRoute.distance_km} km`
                  : "Driving..."}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Google Maps button */}
      <div className="mt-5 px-6">
        <Button
          onClick={handleOpenMaps}
          disabled={!selectedRoute?.maps_url}
          className="h-16 w-full rounded-2xl bg-[hsl(152,55%,42%)] text-lg font-bold text-white shadow-xl shadow-[hsl(152,55%,42%)]/30 hover:bg-[hsl(152,55%,38%)] active:scale-[0.98] transition-all disabled:opacity-40"
          size="lg"
        >
          <Navigation className="mr-3 h-6 w-6" strokeWidth={2} />
          Open in Google Maps
        </Button>
      </div>

      {/* Error banner (for end-drive errors) */}
      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" strokeWidth={1.8} />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* End Drive link */}
      <div className="flex flex-col items-center gap-2 pb-[env(safe-area-inset-bottom,16px)] pt-8">
        <button
          type="button"
          onClick={handleEndDrive}
          disabled={ending}
          className="rounded-xl px-6 py-3 text-sm font-medium text-[hsl(140,10%,50%)] transition-colors hover:text-white active:bg-white/5 disabled:opacity-50"
        >
          {ending ? "Ending Drive..." : "End Drive"}
        </button>
      </div>
    </div>
  )
}
