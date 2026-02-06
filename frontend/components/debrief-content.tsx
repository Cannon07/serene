"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, User, Video, MessageCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRequireUser } from "@/hooks/useRequireUser"

const PROMPTS = [
  "What was hardest?",
  "What helped?",
  "How do you feel now?",
]

export function DebriefContent() {
  const router = useRouter()
  const { isLoading } = useRequireUser()
  const [isRecording, setIsRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [activePrompt, setActivePrompt] = useState<string | null>(null)

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

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-14">
        <button
          type="button"
          onClick={() => router.push("/drive/summary")}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors hover:bg-accent"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Post-Drive Debrief
        </h1>
      </div>

      {/* Prompt card */}
      <div className="mt-6 px-6">
        <div className="flex items-start gap-3 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <MessageCircle className="h-5 w-5 text-primary" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              How did the drive go?
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Share your thoughts — what went well, what was challenging?
            </p>
          </div>
        </div>
      </div>

      {/* Camera preview area */}
      <div className="mt-5 px-6">
        <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl bg-foreground/90">
          {/* User silhouette */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted-foreground/20">
              <User className="h-12 w-12 text-muted-foreground/40" strokeWidth={1.4} />
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
              className="absolute bottom-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-primary-foreground/30 bg-destructive shadow-lg transition-transform hover:scale-105 active:scale-95"
              aria-label="Start recording"
            >
              <Video className="h-5 w-5 text-primary-foreground" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Prompt suggestion chips */}
      <div className="mt-4 flex gap-2 overflow-x-auto px-6 pb-1">
        {PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => setActivePrompt(activePrompt === prompt ? null : prompt)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition-colors ${
              activePrompt === prompt
                ? "border-2 border-primary bg-primary/10 text-primary"
                : "border-2 border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
            }`}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom buttons */}
      <div className="mt-6 flex flex-col gap-3 px-6 pb-10">
        {isRecording ? (
          <Button
            onClick={() => router.push("/debrief/results")}
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
          onClick={() => router.push("/dashboard")}
          className="flex items-center justify-center gap-1 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip Debrief
          <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  )
}
