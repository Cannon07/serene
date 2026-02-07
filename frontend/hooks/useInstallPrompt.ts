import { useState, useEffect, useCallback } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function useInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }

    const installedHandler = () => {
      setIsInstalled(true)
      setPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handler)
    window.addEventListener("appinstalled", installedHandler)

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
      window.removeEventListener("appinstalled", installedHandler)
    }
  }, [])

  const install = useCallback(async () => {
    if (!prompt) return false
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === "accepted") {
      setIsInstalled(true)
      setPrompt(null)
    }
    return outcome === "accepted"
  }, [prompt])

  return { canInstall: !!prompt && !isInstalled, isInstalled, install }
}
