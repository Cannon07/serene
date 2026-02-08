import { CalmingSelection } from "@/components/calming-selection"

export default function CalmingPage() {
  return (
    <main className="relative mx-auto min-h-dvh w-full max-w-[425px] overflow-hidden bg-background">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/5" />
        <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-accent/60" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <CalmingSelection />
      </div>
    </main>
  )
}
