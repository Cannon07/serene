import { PlanTripContent } from "@/components/plan-trip-content"
import { BottomNav } from "@/components/bottom-nav"

export default function PlanPage() {
  return (
    <main className="relative mx-auto min-h-dvh w-full max-w-[390px] bg-background">
      <PlanTripContent />
      <BottomNav />
    </main>
  )
}
