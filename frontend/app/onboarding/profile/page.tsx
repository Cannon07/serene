import type { Metadata } from "next"
import { ProfileSetup } from "@/components/profile-setup"

export const metadata: Metadata = {
  title: "Profile Setup - Serene",
  description: "Tell us about yourself to personalize your Serene experience.",
}

export default function ProfilePage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[390px] bg-background">
      <ProfileSetup />
    </main>
  )
}
