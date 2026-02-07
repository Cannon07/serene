"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Building2,
  Home,
  ShoppingCart,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
  LocateFixed,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { useRequireUser } from "@/hooks/useRequireUser"
import { useDriveStore } from "@/stores/driveStore"
import { routeService } from "@/services/routeService"
import { driveService } from "@/services/driveService"

const FREQUENT_PLACES = [
  { icon: Building2, label: "Work" },
  { icon: Home, label: "Home" },
  { icon: ShoppingCart, label: "Mall" },
]

export function PlanTripContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading } = useRequireUser()
  const { setOrigin, setDestination, setRoutes } = useDriveStore()

  const [from, setFrom] = useState("Current Location")
  const [fromCoords, setFromCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [to, setTo] = useState("")
  const [isToFocused, setIsToFocused] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentDestinations, setRecentDestinations] = useState<
    { destination: string; startedAt: string }[]
  >([])
  const toInputRef = useRef<HTMLInputElement>(null)

  // Pre-fill destination from query param
  useEffect(() => {
    const dest = searchParams.get("destination")
    if (dest) setTo(dest)
  }, [searchParams])

  // Fetch recent destinations from drive history
  useEffect(() => {
    if (!user) return

    driveService.getHistory(user.id, 10).then((res) => {
      // Extract unique destinations, most recent first
      const seen = new Set<string>()
      const unique: { destination: string; startedAt: string }[] = []
      for (const drive of res.drives) {
        const key = drive.destination.toLowerCase()
        if (!seen.has(key)) {
          seen.add(key)
          unique.push({
            destination: drive.destination,
            startedAt: drive.started_at,
          })
        }
        if (unique.length >= 5) break
      }
      setRecentDestinations(unique)
    }).catch(() => {
      // Silently ignore — recent destinations are optional
    })
  }, [user])

  // Filter recent destinations as suggestions while typing
  const filteredSuggestions =
    to.length > 0
      ? recentDestinations.filter((d) =>
          d.destination.toLowerCase().includes(to.toLowerCase())
        )
      : []

  const showSuggestions =
    isToFocused && to.length > 0 && filteredSuggestions.length > 0
  const showFrequentPlaces = !showSuggestions

  function selectSuggestion(name: string) {
    setTo(name)
    setIsToFocused(false)
    toInputRef.current?.blur()
  }

  function selectFrequentPlace(label: string) {
    setTo(label)
  }

  function handleLocate() {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported by your browser.")
      return
    }

    setLocating(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setFromCoords({ lat: latitude, lng: longitude })
        setFrom("Current Location")
        setLocating(false)
      },
      (err) => {
        setLocating(false)
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location permission denied. Please type your starting point.")
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError("Unable to determine your location. Please type your starting point.")
        } else {
          setError("Location request timed out. Please try again or type your starting point.")
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  function handleFromChange(value: string) {
    setFrom(value)
    // If user edits the field manually, clear stored coordinates
    setFromCoords(null)
  }

  async function handleFindRoutes() {
    if (!user || !to.trim()) return

    setSubmitting(true)
    setError(null)

    // Use coordinates if available, otherwise use the text as-is
    const originValue = fromCoords
      ? `${fromCoords.lat},${fromCoords.lng}`
      : from

    try {
      const result = await routeService.plan({
        user_id: user.id,
        origin: originValue,
        destination: to.trim(),
      })

      setOrigin(originValue)
      setDestination(to.trim())
      setRoutes(result.routes)
      router.push("/routes")
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        (err as { response?: { status?: number } }).response?.status === 404
      ) {
        setError("No routes found. Please check your origin and destination.")
      } else {
        setError("Something went wrong. Please try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-14">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors hover:bg-accent"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Plan Your Trip
        </h1>
      </div>

      {/* Input fields */}
      <div className="mt-6 px-6">
        <div className="overflow-hidden rounded-2xl border-2 border-border bg-card">
          {/* From field */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Navigation className="h-4 w-4 text-primary" strokeWidth={2} />
            </div>
            <div className="flex flex-1 flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                From
              </span>
              <input
                type="text"
                value={from}
                onChange={(e) => handleFromChange(e.target.value)}
                className="mt-0.5 w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="Enter starting point"
              />
            </div>
            <button
              type="button"
              onClick={handleLocate}
              disabled={locating}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-accent disabled:opacity-50"
              aria-label="Use current location"
            >
              {locating ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <LocateFixed
                  className={`h-4 w-4 ${fromCoords ? "text-primary" : "text-muted-foreground"}`}
                  strokeWidth={2}
                />
              )}
            </button>
          </div>

          {/* Divider with dots */}
          <div className="relative mx-4">
            <div className="border-t border-dashed border-border" />
            <div className="absolute -top-1 left-3.5 flex flex-col gap-[3px]">
              <span className="block h-[3px] w-[3px] rounded-full bg-border" />
              <span className="block h-[3px] w-[3px] rounded-full bg-border" />
            </div>
          </div>

          {/* To field */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
              <MapPin className="h-4 w-4 text-destructive" strokeWidth={2} />
            </div>
            <div className="flex flex-1 flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                To
              </span>
              <input
                ref={toInputRef}
                type="text"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value)
                  setError(null)
                }}
                onFocus={() => setIsToFocused(true)}
                onBlur={() => {
                  setTimeout(() => setIsToFocused(false), 150)
                }}
                className="mt-0.5 w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="Enter destination"
              />
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" strokeWidth={1.8} />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>

      {/* Suggestions list */}
      {showSuggestions && (
        <div className="mt-5 flex-1 px-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Suggestions
          </h2>
          <div className="mt-3 flex flex-col gap-1">
            {filteredSuggestions.map((suggestion) => (
              <button
                key={suggestion.destination}
                type="button"
                onClick={() => selectSuggestion(suggestion.destination)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent/60"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <MapPin
                    className="h-4 w-4 text-muted-foreground"
                    strokeWidth={1.8}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {suggestion.destination}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Frequent places + recent destinations */}
      {showFrequentPlaces && (
        <div className="mt-6 px-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Frequent Places
          </h2>
          <div className="mt-3 flex gap-2.5">
            {FREQUENT_PLACES.map((place) => (
              <button
                key={place.label}
                type="button"
                onClick={() => selectFrequentPlace(place.label)}
                className="flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-accent"
              >
                <place.icon
                  className="h-4 w-4 text-primary"
                  strokeWidth={1.8}
                />
                {place.label}
              </button>
            ))}
          </div>

          {/* Recent destinations from drive history */}
          {recentDestinations.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recent Destinations
              </h2>
              <div className="mt-3 flex flex-col gap-1">
                {recentDestinations.map((item) => (
                  <button
                    key={item.destination + item.startedAt}
                    type="button"
                    onClick={() => setTo(item.destination)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent/60"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <Clock
                        className="h-4 w-4 text-muted-foreground"
                        strokeWidth={1.8}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {item.destination}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(item.startedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Find Routes button */}
      <div className="px-6 pb-20 pt-6">
        <Button
          disabled={!to.trim() || submitting}
          onClick={handleFindRoutes}
          className="h-14 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-40 disabled:shadow-none"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Finding Routes...
            </>
          ) : (
            <>
              Find Routes
              <ArrowRight className="ml-1.5 h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
