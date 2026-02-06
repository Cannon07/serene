"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MapPin, Navigation, Clock, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StressIntervention } from "@/components/stress-intervention"

export function DriveContent() {
  const router = useRouter()
  const [elapsed, setElapsed] = useState(0)
  const [showIntervention, setShowIntervention] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Simulate stress detection after 10 seconds
  useEffect(() => {
    const trigger = setTimeout(() => {
      setShowIntervention(true)
    }, 10000)
    return () => clearTimeout(trigger)
  }, [])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const timeDisplay = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`

  return (
    <div className="flex min-h-dvh flex-col bg-[hsl(150,20%,6%)]">
      {/* Top safe area spacer */}
      <div className="pt-16" />

      {/* Status indicator - centered */}
      <div className="flex flex-col items-center gap-4 px-6">
        {/* Pulsing green dot */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          {/* Outer pulse ring */}
          <div className="absolute inset-0 animate-ping rounded-full bg-[hsl(152,55%,42%)]/20" style={{ animationDuration: "2s" }} />
          {/* Middle glow */}
          <div className="absolute inset-2 rounded-full bg-[hsl(152,55%,42%)]/10" />
          {/* Inner dot */}
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(152,55%,42%)] shadow-lg shadow-[hsl(152,55%,42%)]/40">
            <Shield className="h-5 w-5 text-white" strokeWidth={2.2} fill="currentColor" />
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
            <MapPin className="h-6 w-6 text-[hsl(152,55%,42%)]" strokeWidth={1.8} />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-white">
              Phoenix Mall
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[hsl(140,10%,60%)]" strokeWidth={2} />
              <span className="text-sm font-medium text-[hsl(140,10%,60%)]">
                ETA: 28 min
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Google Maps button */}
      <div className="mt-5 px-6">
        <Button
          className="h-16 w-full rounded-2xl bg-[hsl(152,55%,42%)] text-lg font-bold text-white shadow-xl shadow-[hsl(152,55%,42%)]/30 hover:bg-[hsl(152,55%,38%)] active:scale-[0.98] transition-all"
          size="lg"
        >
          <Navigation className="mr-3 h-6 w-6" strokeWidth={2} />
          Open in Google Maps
        </Button>
      </div>

      {/* End Drive link */}
      <div className="flex flex-col items-center gap-2 pb-[env(safe-area-inset-bottom,16px)] pt-8">
        <button
          type="button"
          onClick={() => router.push("/drive/summary")}
          className="rounded-xl px-6 py-3 text-sm font-medium text-[hsl(140,10%,50%)] transition-colors hover:text-white active:bg-white/5"
        >
          End Drive
        </button>
      </div>

      {/* Stress intervention overlay */}
      {showIntervention && (
        <StressIntervention onDismiss={() => setShowIntervention(false)} />
      )}
    </div>
  )
}
