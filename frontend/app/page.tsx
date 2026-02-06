import { WelcomeContent } from "@/components/welcome-content"

export default function WelcomePage() {
  return (
    <main className="relative mx-auto min-h-dvh w-full max-w-[390px] overflow-hidden bg-background">
      {/* Decorative background elements */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        {/* Top-right soft circle */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5" />
        {/* Bottom-left soft circle */}
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/60" />
        {/* Center-right subtle shape */}
        <div className="absolute right-0 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-primary/[0.03]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <WelcomeContent />
      </div>
    </main>
  )
}
