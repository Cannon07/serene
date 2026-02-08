import { Suspense } from "react"
import { PlanTripContent } from "@/components/plan-trip-content"
import { BottomNav } from "@/components/bottom-nav"
import { Loader2 } from "lucide-react"

export default function PlanPage() {
  return (
    <main className="relative mx-auto min-h-dvh w-full max-w-[425px] bg-background">
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        }
      >
        <PlanTripContent />
      </Suspense>
      <BottomNav />
    </main>
  )
}
