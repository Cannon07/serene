import { DashboardContent } from "@/components/dashboard-content"
import { BottomNav } from "@/components/bottom-nav"

export default function DashboardPage() {
  return (
    <main className="relative mx-auto min-h-dvh w-full max-w-[390px] bg-background">
      <DashboardContent />
      <BottomNav />
    </main>
  )
}
