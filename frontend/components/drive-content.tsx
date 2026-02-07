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
  Mic,
  MicOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRequireUser } from "@/hooks/useRequireUser"
import { useDriveStore } from "@/stores/driveStore"
import { useInterventionStore } from "@/stores/interventionStore"
import { driveService } from "@/services/driveService"
import { emotionService } from "@/services/emotionService"
import { interventionService } from "@/services/interventionService"
import { voiceService } from "@/services/voiceService"
import { useWakeLock } from "@/hooks/useWakeLock"
import { useGeolocation } from "@/hooks/useGeolocation"
import { useMicrophone } from "@/hooks/useMicrophone"
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition"
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis"
import { StressIntervention } from "@/components/stress-intervention"
import type { InterventionResponse } from "@/types/intervention"

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

  const interventionVisible = useInterventionStore((s) => s.isVisible)
  const dismissIntervention = useInterventionStore((s) => s.dismiss)

  const [elapsed, setElapsed] = useState(0)
  const [starting, setStarting] = useState(false)
  const [ending, setEnding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startedRef = useRef(false)
  const analyzingRef = useRef(false)
  const voiceActiveRef = useRef(false)
  const processingVoiceRef = useRef(false)
  const handleEndDriveRef = useRef(() => {})

  // Voice recognition + TTS
  const voice = useVoiceRecognition()
  const tts = useSpeechSynthesis()

  // Keep screen on
  const wakeLock = useWakeLock()

  // Track location
  const geo = useGeolocation()

  // Audio monitoring
  const mic = useMicrophone()

  // Stable ref for mic methods so the interval doesn't reset on every render
  const micRef = useRef(mic)
  micRef.current = mic

  // Activate wake lock + geolocation + microphone on mount
  useEffect(() => {
    wakeLock.request()
    geo.startWatching()
    mic.requestAccess().catch(() => {
      // Mic permission denied — monitoring disabled, drive still works
    })

    return () => {
      wakeLock.release()
      geo.stopWatching()
      mic.stopStream()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Start recording once mic stream is ready
  useEffect(() => {
    if (mic.stream && !mic.isRecording) {
      mic.startRecording()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.stream])

  // Sync geolocation to store
  useEffect(() => {
    if (geo.position) {
      setCurrentLocation({
        latitude: geo.position.latitude,
        longitude: geo.position.longitude,
      })
    }
  }, [geo.position, setCurrentLocation])

  // Audio stress monitoring loop — every 10s grab a chunk + analyze
  useEffect(() => {
    if (!activeDrive || !mic.isRecording || !user) return

    const interval = setInterval(async () => {
      // Skip if already analyzing, intervention is showing, or voice command is active
      if (analyzingRef.current || voiceActiveRef.current || useInterventionStore.getState().isVisible) return
      analyzingRef.current = true

      try {
        const chunk = await micRef.current.getChunk()
        if (chunk.size === 0) return

        const audioResult = await emotionService.analyzeAudio(chunk, activeDrive.id)

        if (audioResult.trigger_intervention) {
          // Read latest values from stores at call time
          const { currentLocation, destination: dest, selectedRoute: route } = useDriveStore.getState()

          const intervention = await interventionService.decide({
            user_id: user.id,
            drive_id: activeDrive.id,
            stress_score: audioResult.stress_score,
            stress_level: audioResult.stress_level as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
            current_location: currentLocation ?? undefined,
            destination: activeDrive.destination || dest || undefined,
            current_route_calm_score: route?.calm_score,
          })

          useInterventionStore.getState().setActiveIntervention(intervention)
        }
      } catch {
        // Audio analysis failed — skip this cycle silently
      } finally {
        analyzingRef.current = false
      }
    }, 30_000) // 10s for testing — increase to 30s for production

    return () => clearInterval(interval)
    // Only re-create interval when these key booleans change
  }, [activeDrive, mic.isRecording, user])

  // Start drive or resume existing active drive on mount (once)
  useEffect(() => {
    if (!user || startedRef.current || activeDrive) return
    startedRef.current = true

    async function initDrive() {
      setStarting(true)
      setError(null)

      try {
        // First check if there's already an active drive in the backend
        const activeRes = await driveService.getActive(user!.id)
        const raw = activeRes as unknown as Record<string, unknown>

        if (!("active_drive" in raw && raw.active_drive === null) && raw.id) {
          // Resume existing active drive
          setActiveDrive({
            id: raw.id as string,
            user_id: raw.user_id as string,
            started_at: raw.started_at as string,
            origin: raw.origin as string,
            destination: raw.destination as string,
            selected_route_type: raw.selected_route_type as string,
            pre_drive_stress: raw.pre_drive_stress as number | null,
            maps_url: (raw.maps_url as string | null) ?? null,
            status: "IN_PROGRESS",
          })
          setStarting(false)
          return
        }
      } catch {
        // No active drive or endpoint error — proceed to start a new one
      }

      // No active drive — start a new one
      try {
        const routeType =
          selectedRoute?.is_recommended ? "CALMEST" : "FASTEST"

        const result = await driveService.start({
          user_id: user!.id,
          origin: origin || "Current Location",
          destination: destination || "Unknown",
          selected_route_type: routeType as "FASTEST" | "CALMEST",
          pre_drive_stress: checkinResult?.stress_score,
          maps_url: selectedRoute?.maps_url,
        })

        setActiveDrive(result)
      } catch {
        setError("Failed to start drive. Please try again.")
        startedRef.current = false
      } finally {
        setStarting(false)
      }
    }

    initDrive()
  }, [user, activeDrive, origin, destination, selectedRoute, checkinResult, setActiveDrive])

  // Timer based on activeDrive.started_at
  useEffect(() => {
    if (!activeDrive) return

    // Backend returns UTC timestamps without Z suffix — append it so JS parses as UTC
    const ts = activeDrive.started_at.endsWith("Z")
      ? activeDrive.started_at
      : activeDrive.started_at + "Z"
    const startTime = new Date(ts).getTime()

    function tick() {
      const now = Date.now()
      setElapsed(Math.floor((now - startTime) / 1000))
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [activeDrive])

  // Toggle voice recognition
  const handleVoiceToggle = useCallback(() => {
    if (voice.isListening) {
      voice.stopListening()
    } else {
      voiceActiveRef.current = true
      voice.startListening()
    }
  }, [voice.isListening, voice.startListening, voice.stopListening])

  // Process voice transcript → send command → handle response
  useEffect(() => {
    if (!voice.transcript || !activeDrive || !user || processingVoiceRef.current) return
    processingVoiceRef.current = true

    async function processCommand() {
      try {
        const { currentLocation, destination: dest, selectedRoute: route } = useDriveStore.getState()

        const response = await voiceService.sendCommand({
          user_id: user!.id,
          drive_id: activeDrive!.id,
          transcribed_text: voice.transcript,
          context: "DURING_DRIVE",
          current_location: currentLocation ?? undefined,
          destination: activeDrive!.destination || dest || undefined,
          current_route_calm_score: route?.calm_score,
        })

        // Determine if an intervention overlay will handle TTS
        const willShowIntervention =
          (response.action === "TRIGGER_INTERVENTION" && response.intervention) ||
          (response.action === "FIND_SAFE_SPOT" && response.intervention)

        // Only speak here if no intervention overlay will speak it
        if (response.speech_response && !willShowIntervention) {
          tts.speak(response.speech_response)
        }

        // Handle actions
        if (response.action === "TRIGGER_INTERVENTION" && response.intervention) {
          const mapped: InterventionResponse = {
            intervention_type: response.intervention.intervention_type as string ?? "BREATHING",
            stress_level: response.intervention.stress_level as string ?? "HIGH",
            stress_score: (response.intervention.stress_score as number) ?? 0.7,
            message: response.speech_response,
            breathing_content: response.intervention.breathing_content as InterventionResponse["breathing_content"],
            grounding_content: response.intervention.grounding_content as InterventionResponse["grounding_content"],
            pull_over_guidance: response.intervention.pull_over_guidance as string[],
            reroute_available: false,
            sources: (response.intervention.sources as string[]) ?? [],
          }
          useInterventionStore.getState().setActiveIntervention(mapped)
        } else if (response.action === "FIND_ROUTE" && response.reroute) {
          const reroute = response.reroute
          if (reroute.suggested_route) {
            useDriveStore.getState().setRerouteOption(reroute.suggested_route as never)
          }
        } else if (response.action === "FIND_SAFE_SPOT" && response.intervention) {
          const mapped: InterventionResponse = {
            intervention_type: "PULL_OVER",
            stress_level: "CRITICAL",
            stress_score: 0.85,
            message: response.speech_response,
            pull_over_guidance: response.intervention.pull_over_guidance as string[] ?? [
              "Signal right and slow down gradually",
              "Look for a safe parking lot or wide shoulder",
              "Turn on your hazard lights",
              "Take deep breaths once stopped",
            ],
            reroute_available: false,
            sources: [],
          }
          useInterventionStore.getState().setActiveIntervention(mapped)
        } else if (response.action === "START_DEBRIEF") {
          // Reuse the same end-drive flow as the button
          handleEndDriveRef.current()
        }
      } catch {
        // Voice command failed — silently ignore
      } finally {
        voiceActiveRef.current = false
        processingVoiceRef.current = false
      }
    }

    processCommand()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.transcript])

  const handleEndDrive = useCallback(async () => {
    if (!activeDrive || ending) return

    setEnding(true)
    setError(null)

    // Stop audio monitoring, voice, and TTS
    mic.stopStream()
    voice.stopListening()
    tts.stop()
    dismissIntervention()

    try {
      const result = await driveService.end(activeDrive.id)
      setDriveEndResponse(result)
      setActiveDrive(null) // Clear so next visit to /drive starts fresh
      router.push("/drive/summary")
    } catch {
      setError("Failed to end drive. Please try again.")
      setEnding(false)
    }
  }, [activeDrive, ending, setDriveEndResponse, router, mic, dismissIntervention, setActiveDrive])
  handleEndDriveRef.current = handleEndDrive

  // Build Maps URL: prefer selectedRoute, then activeDrive.maps_url, then generic directions
  const mapsUrl = selectedRoute?.maps_url
    || activeDrive?.maps_url
    || (activeDrive
      ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(activeDrive.origin)}&destination=${encodeURIComponent(activeDrive.destination)}`
      : null)

  const handleOpenMaps = useCallback(() => {
    if (mapsUrl) {
      window.open(mapsUrl, "_blank")
    }
  }, [mapsUrl])

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

      {/* Voice command button */}
      <div className="flex flex-col items-center gap-2 px-6 pb-6">
        <button
          type="button"
          onClick={handleVoiceToggle}
          disabled={processingVoiceRef.current}
          className={`flex h-16 w-16 items-center justify-center rounded-full transition-all ${
            voice.isListening
              ? "bg-red-500 shadow-lg shadow-red-500/40 animate-pulse"
              : "bg-white/10 border border-white/20 hover:bg-white/15"
          }`}
          aria-label={voice.isListening ? "Stop listening" : "Voice command"}
        >
          {voice.isListening ? (
            <Mic className="h-6 w-6 text-white" strokeWidth={2} />
          ) : (
            <MicOff className="h-6 w-6 text-[hsl(140,10%,60%)]" strokeWidth={2} />
          )}
        </button>
        <p className="text-xs font-medium text-[hsl(140,10%,50%)]">
          {voice.isListening
            ? "Listening..."
            : "Tap to speak"}
        </p>
      </div>

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
              {activeDrive?.destination || destination || "Destination"}
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
          disabled={!mapsUrl}
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

      {/* Stress intervention overlay */}
      {interventionVisible && (
        <StressIntervention onDismiss={dismissIntervention} />
      )}
    </div>
  )
}
