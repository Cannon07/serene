"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  User,
  Video,
  Loader2,
  VideoOff,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRequireUser } from "@/hooks/useRequireUser"
import { useCamera } from "@/hooks/useCamera"
import { useDriveStore } from "@/stores/driveStore"
import { emotionService } from "@/services/emotionService"

export function CheckinContent() {
  const router = useRouter()
  const { isLoading: authLoading } = useRequireUser()
  const { stream, isRecording, requestAccess, startRecording, stopRecording, stopStream } =
    useCamera()
  const setCheckinResult = useDriveStore((s) => s.setCheckinResult)

  const videoRef = useRef<HTMLVideoElement>(null)
  const [seconds, setSeconds] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  // Bind stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      stopStream()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recording timer
  useEffect(() => {
    if (!isRecording) return
    const interval = setInterval(() => {
      setSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isRecording])

  const formatTime = useCallback((totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }, [])

  async function handleRequestCamera() {
    setCameraError(null)
    try {
      await requestAccess()
    } catch {
      setCameraError(
        "Camera access denied. Please allow camera and microphone access in your browser settings."
      )
    }
  }

  function handleStartRecording() {
    setApiError(null)
    startRecording()
    setSeconds(0)
  }

  async function handleStopAndAnalyze() {
    setAnalyzing(true)
    setApiError(null)
    try {
      const blob = await stopRecording()
      stopStream()
      const result = await emotionService.analyzeVideo(blob, "PRE_DRIVE")
      setCheckinResult(result)
      router.push("/checkin/results")
    } catch {
      setAnalyzing(false)
      setApiError("Analysis failed. Please try again.")
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
          onClick={() => {
            stopStream()
            router.push("/prepare")
          }}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors hover:bg-accent"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          How are you feeling?
        </h1>
      </div>

      {/* Camera preview area */}
      <div className="mt-6 px-6">
        <div className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-2xl bg-foreground/90">
          {stream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
          ) : (
            /* Camera not yet active — show placeholder */
            <div className="flex flex-col items-center gap-4">
              {cameraError ? (
                <>
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-destructive/20">
                    <VideoOff
                      className="h-14 w-14 text-destructive/60"
                      strokeWidth={1.4}
                    />
                  </div>
                  <p className="max-w-[240px] text-center text-sm text-destructive/70">
                    {cameraError}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted-foreground/20">
                    <User
                      className="h-14 w-14 text-muted-foreground/40"
                      strokeWidth={1.4}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestCamera}
                    className="rounded-xl bg-primary/90 px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary"
                  >
                    Enable Camera
                  </button>
                </>
              )}
            </div>
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-foreground/70 px-3 py-1.5 backdrop-blur-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
              </span>
              <span className="text-xs font-semibold text-primary-foreground">
                Recording... {formatTime(seconds)}
              </span>
            </div>
          )}

          {/* Analyzing overlay */}
          {analyzing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-foreground/80 backdrop-blur-sm">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-semibold text-primary-foreground">
                Analyzing your check-in...
              </p>
            </div>
          )}

          {/* Record button overlay */}
          {stream && !isRecording && !analyzing && (
            <button
              type="button"
              onClick={handleStartRecording}
              className="absolute bottom-6 flex h-16 w-16 items-center justify-center rounded-full border-4 border-primary-foreground/30 bg-destructive shadow-lg transition-transform hover:scale-105 active:scale-95"
              aria-label="Start recording"
            >
              <Video
                className="h-6 w-6 text-primary-foreground"
                strokeWidth={2}
              />
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {apiError && (
        <div className="mt-3 px-6">
          <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3">
            <AlertCircle
              className="h-4 w-4 shrink-0 text-destructive"
              strokeWidth={1.8}
            />
            <p className="text-sm text-destructive">{apiError}</p>
          </div>
        </div>
      )}

      {/* Instruction text */}
      <div className="mt-5 px-6">
        <p className="text-center text-sm leading-relaxed text-muted-foreground">
          {!stream
            ? "Enable your camera to begin the check-in."
            : isRecording
              ? "Tell me how you're feeling. Serene will analyze your expression and voice."
              : "Tap the record button when you're ready."}
        </p>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom buttons */}
      <div className="mt-8 flex flex-col gap-3 px-6 pb-10">
        {isRecording && !analyzing ? (
          <Button
            onClick={handleStopAndAnalyze}
            className="h-14 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
            size="lg"
          >
            Stop & Analyze
          </Button>
        ) : (
          <Button
            disabled
            className="h-14 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/25 transition-all disabled:opacity-40 disabled:shadow-none"
            size="lg"
          >
            Stop & Analyze
          </Button>
        )}
        <button
          type="button"
          onClick={() => {
            stopStream()
            router.push("/prepare")
          }}
          className="flex items-center justify-center gap-1 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip
          <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  )
}
