"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Building2,
  Home,
  ShoppingCart,
  Clock,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const FREQUENT_PLACES = [
  { icon: Building2, label: "Work" },
  { icon: Home, label: "Home" },
  { icon: ShoppingCart, label: "Mall" },
]

const SUGGESTIONS = [
  { name: "Phoenix Mall", address: "Whitefield, Bangalore" },
  { name: "Phoenix Marketcity", address: "Mahadevapura, Bangalore" },
  { name: "Phoenix Arena", address: "Koramangala, Bangalore" },
  { name: "Phoenix Tower", address: "MG Road, Bangalore" },
]

export function PlanTripContent() {
  const router = useRouter()
  const [from, setFrom] = useState("Current Location")
  const [to, setTo] = useState("")
  const [isToFocused, setIsToFocused] = useState(false)
  const toInputRef = useRef<HTMLInputElement>(null)

  const filteredSuggestions = to.length > 0
    ? SUGGESTIONS.filter(
        (s) =>
          s.name.toLowerCase().includes(to.toLowerCase()) ||
          s.address.toLowerCase().includes(to.toLowerCase())
      )
    : []

  const showSuggestions = isToFocused && to.length > 0 && filteredSuggestions.length > 0
  const showFrequentPlaces = !showSuggestions

  function selectSuggestion(name: string) {
    setTo(name)
    setIsToFocused(false)
    toInputRef.current?.blur()
  }

  function selectFrequentPlace(label: string) {
    setTo(label)
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
                onChange={(e) => setFrom(e.target.value)}
                className="mt-0.5 w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="Enter starting point"
              />
            </div>
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
                onChange={(e) => setTo(e.target.value)}
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
                key={suggestion.name}
                type="button"
                onClick={() => selectSuggestion(suggestion.name)}
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
                    {suggestion.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {suggestion.address}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Frequent places */}
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

          {/* Recent destinations */}
          <div className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Destinations
            </h2>
            <div className="mt-3 flex flex-col gap-1">
              {[
                { name: "Phoenix Mall", address: "Whitefield, Bangalore", time: "Yesterday" },
                { name: "Office", address: "Koramangala, Bangalore", time: "2 days ago" },
              ].map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setTo(item.name)}
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
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.address}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {item.time}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Find Routes button */}
      <div className="px-6 pb-10 pt-6">
        <Button
          disabled={!to.trim()}
          onClick={() => router.push("/routes")}
          className="h-14 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-40 disabled:shadow-none"
          size="lg"
        >
          Find Routes
          <ArrowRight className="ml-1.5 h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
