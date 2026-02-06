"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
  Frown,
  Meh,
  Loader2,
  Car,
  MapPin,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useRequireUser } from "@/hooks/useRequireUser"
import { useUserStore } from "@/stores/userStore"
import { userService } from "@/services/userService"
import { driveService } from "@/services/driveService"
import type { UserStats } from "@/types/user"
import type { DriveListItem, ActiveDriveResponse } from "@/types/drive"

const RESOLUTION_GOAL_LABELS: Record<string, string> = {
  WORK_COMMUTE: "Master work commute",
  HIGHWAY_ANXIETY: "Overcome highway anxiety",
  LONGER_TRIPS: "Handle longer trips",
  NIGHT_DRIVING: "Conquer night driving",
  VISIT_FAMILY: "Drive to visit family",
  OTHER: "Achieve driving goals",
}

const QUICK_ACCESS = [
  { icon: Building2, label: "Work" },
  { icon: Home, label: "Home" },
  { icon: ShoppingCart, label: "Mall" },
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function getStressLabel(stress: number | null): string {
  if (stress === null) return "No data"
  if (stress <= 0.3) return "Low stress"
  if (stress <= 0.6) return "Moderate stress"
  return "High stress"
}

function getStressIcon(stress: number | null) {
  if (stress === null) return Meh
  if (stress <= 0.3) return Smile
  if (stress <= 0.6) return Meh
  return Frown
}

function getDriveDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return "In progress"
  const minutes = Math.round(
    (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60000
  )
  return `${minutes} min`
}

export function DashboardContent() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useRequireUser()
  const setStats = useUserStore((s) => s.setStats)

  const [stats, setLocalStats] = useState<UserStats | null>(null)
  const [recentDrives, setRecentDrives] = useState<DriveListItem[]>([])
  const [activeDrive, setActiveDrive] = useState<ActiveDriveResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const [statsRes, historyRes] = await Promise.all([
          userService.getStats(user.id),
          driveService.getHistory(user.id, 3),
        ])
        setLocalStats(statsRes)
        setStats(statsRes)
        setRecentDrives(historyRes.drives)

        // Backend returns { active_drive: <data> | null }
        try {
          const activeRes = await driveService.getActive(user.id)
          const unwrapped = (activeRes as unknown as { active_drive: ActiveDriveResponse | null }).active_drive
          setActiveDrive(unwrapped ?? null)
        } catch {
          setActiveDrive(null)
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, setStats])

  if (authLoading || loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const goalLabel = user
    ? RESOLUTION_GOAL_LABELS[user.resolution_goal] || "Achieve driving goals"
    : ""
  const deadline = user?.resolution_deadline
    ? new Date(user.resolution_deadline).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null
  const streak = stats?.current_streak ?? 0
  const progress =
    stats?.stress_improvement != null
      ? Math.max(0, Math.min(100, Math.round(stats.stress_improvement)))
      : 0

  return (
    <div className="flex min-h-dvh flex-col pb-24">
      {/* Header */}
      <div className="px-6 pt-14">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {getGreeting()}, {user?.name?.split(" ")[0] || "there"}
        </h1>
      </div>

      {/* Search bar — navigates to /plan */}
      <div className="mt-5 px-6">
        <button
          type="button"
          onClick={() => router.push("/plan")}
          className="relative w-full"
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <Search
              className="h-4.5 w-4.5 text-muted-foreground"
              strokeWidth={1.8}
            />
          </div>
          <div className="flex h-12 w-full items-center rounded-xl border-2 border-border bg-card pl-11 pr-4 text-left text-sm text-muted-foreground transition-colors hover:border-primary/30">
            Where are you heading?
          </div>
        </button>
      </div>

      {/* Quick access pills */}
      <div className="mt-5 px-6">
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          {QUICK_ACCESS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() =>
                router.push(`/plan?destination=${encodeURIComponent(item.label)}`)
              }
              className="flex shrink-0 items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-accent"
            >
              <item.icon className="h-4 w-4 text-primary" strokeWidth={1.8} />
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => router.push("/plan")}
            className="flex shrink-0 items-center gap-1.5 rounded-full border-2 border-dashed border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          >
            <Plus className="h-4 w-4" strokeWidth={1.8} />
            Add
          </button>
        </div>
      </div>

      {/* Active drive banner */}
      {activeDrive && (
        <div className="mt-6 px-6">
          <button
            type="button"
            onClick={() => router.push("/drive")}
            className="flex w-full items-center gap-4 rounded-2xl border-2 border-primary bg-primary/10 p-4 text-left transition-colors hover:bg-primary/15"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20">
              <Car className="h-5 w-5 text-primary" strokeWidth={1.8} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                Drive in progress
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                To {activeDrive.destination}
              </p>
            </div>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-primary"
              strokeWidth={1.8}
            />
          </button>
        </div>
      )}

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
                {goalLabel}
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
              <span className="text-xs font-bold text-primary">
                {progress}%
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Meta row */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {deadline && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" strokeWidth={1.8} />
                <span>Target: {deadline}</span>
              </div>
            )}
            {streak > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <Flame className="h-3.5 w-3.5" strokeWidth={2} />
                <span>{streak} day streak</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent drives */}
      <div className="mt-8 px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Recent Drives</h2>
          {recentDrives.length > 0 && (
            <button
              type="button"
              onClick={() => router.push("/progress")}
              className="text-xs font-semibold text-primary hover:underline"
            >
              See all
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-2.5">
          {recentDrives.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border py-10">
              <MapPin
                className="h-8 w-8 text-muted-foreground/50"
                strokeWidth={1.5}
              />
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  No drives yet
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground/70">
                  Plan your first trip to get started
                </p>
              </div>
            </div>
          ) : (
            recentDrives.map((drive) => {
              const stressVal =
                drive.post_drive_stress ?? drive.pre_drive_stress
              const StressIcon = getStressIcon(stressVal)
              const isLowStress = stressVal !== null && stressVal <= 0.3

              return (
                <button
                  key={drive.id}
                  type="button"
                  className="flex items-center gap-4 rounded-xl border-2 border-border bg-card p-4 text-left transition-colors hover:border-primary/20 hover:bg-accent/50"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      isLowStress ? "bg-primary/10" : "bg-accent"
                    }`}
                  >
                    <StressIcon
                      className={`h-5 w-5 ${
                        isLowStress
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                      strokeWidth={1.8}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {drive.destination}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(drive.started_at), {
                        addSuffix: true,
                      })}{" "}
                      &middot; {getStressLabel(stressVal)} &middot;{" "}
                      {getDriveDuration(drive.started_at, drive.completed_at)}
                    </p>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    strokeWidth={1.8}
                  />
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
