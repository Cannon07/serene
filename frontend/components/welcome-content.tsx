"use client"

import { useRouter } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SereneLogo } from "@/components/serene-logo"

export function WelcomeContent() {
  const router = useRouter()

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

        {/* Trust indicators */}
        <div className="mt-2 flex items-center gap-4">
          {[
            { value: "10k+", label: "Drivers" },
            { value: "4.8", label: "Rating" },
            { value: "Free", label: "To start" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-0.5">
              <span className="text-sm font-semibold text-foreground">
                {stat.value}
              </span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
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
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
