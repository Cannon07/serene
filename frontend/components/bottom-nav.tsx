"use client"

import { usePathname, useRouter } from "next/navigation"
import { Home, Route, BarChart3, Settings } from "lucide-react"

const NAV_ITEMS = [
  { icon: Home, label: "Home", href: "/dashboard" },
  { icon: Route, label: "Plan Route", href: "/plan" },
  { icon: BarChart3, label: "Progress", href: "/progress" },
  { icon: Settings, label: "Settings", href: "/settings" },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav className="fixed bottom-0 left-1/2 w-full max-w-[425px] -translate-x-1/2 border-t border-border bg-card/95 backdrop-blur-sm">
      <div className="flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom,8px)] pt-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon
                className="h-5 w-5"
                strokeWidth={isActive ? 2.2 : 1.8}
                fill={isActive ? "currentColor" : "none"}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
