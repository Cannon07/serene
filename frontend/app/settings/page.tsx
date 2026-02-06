import { SettingsContent } from "@/components/settings-content"
import { BottomNav } from "@/components/bottom-nav"

export default function SettingsPage() {
  return (
    <main className="relative mx-auto min-h-dvh w-full max-w-[390px] bg-background">
      <SettingsContent />
      <BottomNav />
    </main>
  )
}
