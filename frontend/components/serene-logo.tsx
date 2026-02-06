import { Car, Leaf } from "lucide-react"

export function SereneLogo() {
  return (
    <div className="relative flex items-center justify-center" aria-hidden="true">
      {/* Outer glow ring */}
      <div className="absolute h-32 w-32 rounded-full bg-primary/10 animate-pulse" />

      {/* Middle ring */}
      <div className="absolute h-24 w-24 rounded-full bg-primary/15" />

      {/* Icon container */}
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary">
        <Car className="h-9 w-9 text-primary-foreground" strokeWidth={1.8} />
        {/* Leaf accent */}
        <div className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent">
          <Leaf className="h-4 w-4 text-primary" strokeWidth={2} />
        </div>
      </div>
    </div>
  )
}
