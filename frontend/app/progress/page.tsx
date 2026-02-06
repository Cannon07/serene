import { ProgressContent } from "@/components/progress-content"
import { BottomNav } from "@/components/bottom-nav"

export default function ProgressPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[390px] bg-background">
      <ProgressContent />
      <BottomNav />
    </main>
  )
}
