"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, User, Video } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CheckinContent() {
  const router = useRouter()
  const [isRecording, setIsRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)

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

  function handleStartRecording() {
    setIsRecording(true)
    setSeconds(0)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-14">
        <button
          type="button"
          onClick={() => router.push("/prepare")}
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
          {/* User silhouette */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted-foreground/20">
              <User className="h-14 w-14 text-muted-foreground/40" strokeWidth={1.4} />
            </div>
            {!isRecording && (
              <p className="text-sm text-muted-foreground/50">
                Tap record to begin
              </p>
            )}
          </div>

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

          {/* Record button overlay */}
          {!isRecording && (
            <button
              type="button"
              onClick={handleStartRecording}
              className="absolute bottom-6 flex h-16 w-16 items-center justify-center rounded-full border-4 border-primary-foreground/30 bg-destructive shadow-lg transition-transform hover:scale-105 active:scale-95"
              aria-label="Start recording"
            >
              <Video className="h-6 w-6 text-primary-foreground" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Instruction text */}
      <div className="mt-5 px-6">
        <p className="text-center text-sm leading-relaxed text-muted-foreground">
          Tell me how you{"'"}re feeling. Serene will analyze your expression
          and voice.
        </p>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom buttons */}
      <div className="mt-8 flex flex-col gap-3 px-6 pb-10">
        {isRecording ? (
          <Button
            onClick={() => router.push("/checkin/results")}
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
          onClick={() => router.push("/prepare")}
          className="flex items-center justify-center gap-1 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip
          <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  )
}
