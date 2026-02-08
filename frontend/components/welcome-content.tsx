"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, Loader2, X, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SereneLogo } from "@/components/serene-logo"
import { useUserStore } from "@/stores/userStore"
import { userService } from "@/services/userService"

export function WelcomeContent() {
  const router = useRouter()
  const { user, setUser } = useUserStore()
  const [isChecking, setIsChecking] = useState(true)
  const [showSignIn, setShowSignIn] = useState(false)
  const [sheetVisible, setSheetVisible] = useState(false)
  const [userId, setUserId] = useState("")
  const [signInError, setSignInError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)

  const openSignIn = useCallback(() => {
    setShowSignIn(true)
    setTimeout(() => setSheetVisible(true), 50)
  }, [])

  const closeSignIn = useCallback(() => {
    setSheetVisible(false)
    setTimeout(() => {
      setShowSignIn(false)
      setUserId("")
      setSignInError(null)
    }, 300)
  }, [])

  const handleSignIn = useCallback(async () => {
    const trimmed = userId.trim()
    if (!trimmed) return

    setIsSigningIn(true)
    setSignInError(null)

    try {
      const foundUser = await userService.get(trimmed)
      setUser(foundUser)
      router.replace("/dashboard")
    } catch {
      setSignInError("User not found. Please check your ID.")
    } finally {
      setIsSigningIn(false)
    }
  }, [userId, setUser, router])

  useEffect(() => {
    async function checkSession() {
      // Wait for Zustand to hydrate from localStorage
      if (!useUserStore.persist.hasHydrated()) {
        await new Promise<void>((resolve) => {
          const unsub = useUserStore.persist.onFinishHydration(() => {
            unsub()
            resolve()
          })
        })
      }

      const storedUser = useUserStore.getState().user
      if (!storedUser) {
        setIsChecking(false)
        return
      }

      try {
        await userService.get(storedUser.id)
        router.replace("/dashboard")
      } catch {
        setUser(null)
        setIsChecking(false)
      }
    }

    checkSession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (isChecking) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <SereneLogo />
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-between px-8 py-12">
      {/* Top spacer */}
      <div className="flex-1" />

      {/* Center content */}
      <div className="flex flex-col items-center gap-6">
        <SereneLogo />

        <div className="mt-4 flex flex-col items-center gap-3 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Serene
          </h1>
          <p className="max-w-[260px] text-base leading-relaxed text-muted-foreground text-balance">
            Your companion for stress-free driving
          </p>
        </div>

        {/* Trust indicators
        <div className="mt-2 flex items-center gap-4">
          {[
            { value: "5", label: "AI Agents" },
            { value: "Real-time", label: "Support" },
            { value: "Voice", label: "Enabled" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-0.5">
              <span className="text-sm font-semibold text-foreground">
                {stat.value}
              </span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div> */}
      </div>

      {/* Bottom spacer */}
      <div className="flex-1" />

      {/* Bottom actions */}
      <div className="flex w-full flex-col items-center gap-4">
        <Button
          onClick={() => router.push("/onboarding/goal")}
          className="h-14 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
          size="lg"
        >
          Get Started
          <ChevronRight className="ml-1 h-5 w-5" />
        </Button>

        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <button
            type="button"
            onClick={openSignIn}
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>

      {/* Sign-in bottom sheet */}
      {showSignIn && (
        <div
          className={`fixed inset-0 z-50 flex items-end justify-center transition-opacity duration-300 ${
            sheetVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeSignIn}
            onKeyDown={(e) => e.key === "Escape" && closeSignIn()}
            role="button"
            tabIndex={0}
            aria-label="Dismiss overlay"
          />

          {/* Modal card */}
          <div
            className={`relative z-10 mx-auto w-full max-w-[390px] transform transition-transform duration-300 ease-out ${
              sheetVisible ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="rounded-t-3xl bg-card px-6 pb-8 pt-6 shadow-2xl">
              {/* Drag handle */}
              <div className="mb-4 flex justify-center">
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>

              {/* Header */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                    <KeyRound className="h-4.5 w-4.5 text-primary" strokeWidth={1.8} />
                  </div>
                  <p className="text-base font-semibold text-foreground">
                    Welcome back
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeSignIn}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-4.5 w-4.5" strokeWidth={2} />
                </button>
              </div>

              {/* User ID input */}
              <div className="mb-4 flex flex-col gap-2">
                <label
                  htmlFor="user-id"
                  className="text-sm font-medium text-muted-foreground"
                >
                  Enter your User ID to reconnect
                </label>
                <input
                  id="user-id"
                  type="text"
                  placeholder="e.g. 3f2a7b1c-..."
                  value={userId}
                  onChange={(e) => {
                    setUserId(e.target.value)
                    setSignInError(null)
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                  className="h-13 w-full rounded-xl border-2 border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-primary focus:ring-0"
                  autoFocus
                />
              </div>

              {/* Error message */}
              {signInError && (
                <div className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {signInError}
                </div>
              )}

              {/* Actions */}
              <div className="mb-2 flex gap-3">
                <Button
                  disabled={!userId.trim() || isSigningIn}
                  onClick={handleSignIn}
                  className="h-12 flex-1 rounded-xl text-sm font-semibold"
                >
                  {isSigningIn ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={closeSignIn}
                  className="h-12 flex-1 rounded-xl border-2 text-sm font-semibold text-foreground bg-transparent"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
