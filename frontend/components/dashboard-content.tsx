"use client"

import {
  Search,
  Building2,
  Home,
  ShoppingCart,
  Plus,
  Target,
  Calendar,
  Flame,
  ChevronRight,
  Smile,
  Loader2,
} from "lucide-react"
import { useRequireUser } from "@/hooks/useRequireUser"

const QUICK_ACCESS = [
  { icon: Building2, label: "Work" },
  { icon: Home, label: "Home" },
  { icon: ShoppingCart, label: "Mall" },
]

export function DashboardContent() {
  const { isLoading } = useRequireUser()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col pb-24">
      {/* Header */}
      <div className="px-6 pt-14">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Good morning, Jay
        </h1>
      </div>

      {/* Search bar */}
      <div className="mt-5 px-6">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <Search
              className="h-4.5 w-4.5 text-muted-foreground"
              strokeWidth={1.8}
            />
          </div>
          <input
            type="text"
            placeholder="Where are you heading?"
            className="h-12 w-full rounded-xl border-2 border-border bg-card pl-11 pr-4 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-primary"
          />
        </div>
      </div>

      {/* Quick access pills */}
      <div className="mt-5 px-6">
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          {QUICK_ACCESS.map((item) => (
            <button
              key={item.label}
              type="button"
              className="flex shrink-0 items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-accent"
            >
              <item.icon className="h-4 w-4 text-primary" strokeWidth={1.8} />
              {item.label}
            </button>
          ))}
          <button
            type="button"
            className="flex shrink-0 items-center gap-1.5 rounded-full border-2 border-dashed border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          >
            <Plus className="h-4 w-4" strokeWidth={1.8} />
            Add
          </button>
        </div>
      </div>

      {/* Resolution card */}
      <div className="mt-6 px-6">
        <div className="rounded-2xl border-2 border-border bg-card p-5">
          {/* Goal header */}
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Target className="h-5 w-5 text-primary" strokeWidth={1.8} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                Overcome highway anxiety
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Your 2026 driving resolution
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Progress
              </span>
              <span className="text-xs font-bold text-primary">45%</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: "45%" }}
              />
            </div>
          </div>

          {/* Meta row */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" strokeWidth={1.8} />
              <span>Target: June 1, 2026</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <Flame className="h-3.5 w-3.5" strokeWidth={2} />
              <span>5 day streak</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent drives */}
      <div className="mt-8 px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Recent Drives</h2>
          <button
            type="button"
            className="text-xs font-semibold text-primary hover:underline"
          >
            See all
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2.5">
          {/* Drive card 1 */}
          <button
            type="button"
            className="flex items-center gap-4 rounded-xl border-2 border-border bg-card p-4 text-left transition-colors hover:border-primary/20 hover:bg-accent/50"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Smile className="h-5 w-5 text-primary" strokeWidth={1.8} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                Phoenix Mall
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Yesterday &middot; Low stress &middot; 35 min
              </p>
            </div>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-muted-foreground"
              strokeWidth={1.8}
            />
          </button>

          {/* Drive card 2 */}
          <button
            type="button"
            className="flex items-center gap-4 rounded-xl border-2 border-border bg-card p-4 text-left transition-colors hover:border-primary/20 hover:bg-accent/50"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent">
              <Building2 className="h-5 w-5 text-muted-foreground" strokeWidth={1.8} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                Office commute
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                2 days ago &middot; Moderate stress &middot; 28 min
              </p>
            </div>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-muted-foreground"
              strokeWidth={1.8}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
