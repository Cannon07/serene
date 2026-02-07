"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Target,
  Calendar,
  Car,
  TrendingDown,
  TrendingUp,
  Flame,
  Smile,
  Meh,
  Frown,
  Star,
  Loader2,
  ChevronDown,
} from "lucide-react"
import { formatDistanceToNow, differenceInDays, format } from "date-fns"
import { Button } from "@/components/ui/button"
import { useRequireUser } from "@/hooks/useRequireUser"
import { userService } from "@/services/userService"
import { driveService } from "@/services/driveService"
import type { UserStats } from "@/types/user"
import type { DriveListItem } from "@/types/drive"

const RESOLUTION_GOAL_LABELS: Record<string, string> = {
  WORK_COMMUTE: "Master work commute",
  HIGHWAY_ANXIETY: "Overcome highway anxiety",
  LONGER_TRIPS: "Handle longer trips",
  NIGHT_DRIVING: "Conquer night driving",
  VISIT_FAMILY: "Drive to visit family",
  OTHER: "Achieve driving goals",
}

function getDriveDisplay(rating: number | null, stress: number | null): { label: string; color: string; bg: string; icon: typeof Smile; fill: boolean } {
  if (rating !== null) {
    if (rating >= 4) return { label: `${rating}/5 stars`, color: "text-primary", bg: "bg-primary/10", icon: Star, fill: true }
    if (rating >= 3) return { label: `${rating}/5 stars`, color: "text-[hsl(35,80%,50%)]", bg: "bg-[hsl(35,80%,50%)]/10", icon: Star, fill: true }
    return { label: `${rating}/5 stars`, color: "text-destructive", bg: "bg-destructive/10", icon: Star, fill: true }
  }
  if (stress === null) return { label: "No data", color: "text-muted-foreground", bg: "bg-secondary", icon: Meh, fill: false }
  if (stress <= 0.3) return { label: "Low stress", color: "text-primary", bg: "bg-primary/10", icon: Smile, fill: false }
  if (stress <= 0.6) return { label: "Moderate", color: "text-[hsl(35,80%,50%)]", bg: "bg-[hsl(35,80%,50%)]/10", icon: Meh, fill: false }
  return { label: "High stress", color: "text-destructive", bg: "bg-destructive/10", icon: Frown, fill: false }
}

function getDriveDate(startedAt: string): string {
  try {
    const ts = startedAt.endsWith("Z") ? startedAt : startedAt + "Z"
    return formatDistanceToNow(new Date(ts), { addSuffix: true })
  } catch {
    return "Unknown"
  }
}

// Build chart from drive history (most recent drives, chronological order)
function StressTrendChart({ drives }: { drives: DriveListItem[] }) {
  // Use completed drives with stress data, in chronological order
  const chartDrives = drives
    .filter((d) => d.completed_at && (d.pre_drive_stress !== null || d.post_drive_stress !== null))
    .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
    .slice(-8) // Last 8 drives

  if (chartDrives.length < 2) {
    return (
      <div className="mt-4 overflow-hidden rounded-xl border-2 border-border bg-card p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Stress Trend
        </h3>
        <div className="mt-6 flex flex-col items-center gap-2 pb-4">
          <TrendingDown className="h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">
            Complete more drives to see your trend
          </p>
        </div>
      </div>
    )
  }

  const width = 310
  const height = 120
  const paddingX = 10
  const paddingY = 10
  const chartWidth = width - paddingX * 2
  const chartHeight = height - paddingY * 2

  // Use post_drive_stress if available, else pre_drive_stress (as percentage 0-100)
  const dataPoints = chartDrives.map((d) => {
    const stress = d.post_drive_stress ?? d.pre_drive_stress ?? 0
    return Math.round(stress * 100)
  })
  const maxY = Math.max(...dataPoints, 10) + 10

  const points = dataPoints.map((val, i) => ({
    cx: paddingX + (i / (dataPoints.length - 1)) * chartWidth,
    cy: paddingY + chartHeight - (val / maxY) * chartHeight,
  }))

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.cx} ${p.cy}`)
    .join(" ")

  const areaPath = `${linePath} L ${points[points.length - 1].cx} ${height} L ${points[0].cx} ${height} Z`

  // Labels: short date for each drive
  const labels = chartDrives.map((d) => {
    try {
      const ts = d.started_at.endsWith("Z") ? d.started_at : d.started_at + "Z"
      return format(new Date(ts), "MMM d")
    } catch {
      return ""
    }
  })

  const firstVal = dataPoints[0]
  const lastVal = dataPoints[dataPoints.length - 1]
  const improving = lastVal < firstVal

  return (
    <div className="mt-4 overflow-hidden rounded-xl border-2 border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Stress Trend
        </h3>
        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
          improving ? "bg-primary/10" : "bg-destructive/10"
        }`}>
          {improving ? (
            <TrendingDown className="h-3 w-3 text-primary" strokeWidth={2.2} />
          ) : (
            <TrendingUp className="h-3 w-3 text-destructive" strokeWidth={2.2} />
          )}
          <span className={`text-[10px] font-bold ${improving ? "text-primary" : "text-destructive"}`}>
            {improving ? "Improving" : "Needs work"}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-3 w-full"
        preserveAspectRatio="none"
        aria-label="Stress trend chart"
        role="img"
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(152 55% 42%)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="hsl(152 55% 42%)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 1, 2, 3].map((i) => {
          const y = paddingY + (i / 3) * chartHeight
          return (
            <line
              key={`grid-${i}`}
              x1={paddingX}
              y1={y}
              x2={width - paddingX}
              y2={y}
              stroke="hsl(140 15% 88%)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          )
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="hsl(152 55% 42%)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={`point-${i}`}
            cx={p.cx}
            cy={p.cy}
            r="4"
            fill="hsl(0 0% 100%)"
            stroke="hsl(152 55% 42%)"
            strokeWidth="2.5"
          />
        ))}
      </svg>

      {/* X-axis labels — show first, middle, last to avoid crowding */}
      <div className="mt-1 flex justify-between px-1">
        {labels.length <= 4
          ? labels.map((label, i) => (
              <span key={i} className="text-[10px] font-medium text-muted-foreground">
                {label}
              </span>
            ))
          : [0, Math.floor(labels.length / 2), labels.length - 1].map((idx) => (
              <span key={idx} className="text-[10px] font-medium text-muted-foreground">
                {labels[idx]}
              </span>
            ))
        }
      </div>
    </div>
  )
}

export function ProgressContent() {
  const { user, isLoading: authLoading } = useRequireUser()

  const [stats, setStats] = useState<UserStats | null>(null)
  const [drives, setDrives] = useState<DriveListItem[]>([])
  const [totalDrives, setTotalDrives] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const [statsRes, historyRes] = await Promise.all([
          userService.getStats(user.id),
          driveService.getHistory(user.id, 5),
        ])
        setStats(statsRes)
        setDrives(historyRes.drives)
        setTotalDrives(historyRes.total)
      } catch (err) {
        console.error("Failed to fetch progress data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const handleLoadMore = useCallback(async () => {
    if (!user || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await driveService.getHistory(user.id, 5, drives.length)
      setDrives((prev) => [...prev, ...res.drives])
    } catch {
      // Silently fail
    } finally {
      setLoadingMore(false)
    }
  }, [user, loadingMore, drives.length])

  if (authLoading || loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  // Resolution goal
  const goalLabel = user
    ? RESOLUTION_GOAL_LABELS[user.resolution_goal] ?? "Achieve driving goals"
    : "Achieve driving goals"

  // Days remaining until deadline
  let deadlineText: string | null = null
  if (user?.resolution_deadline) {
    const deadline = new Date(user.resolution_deadline)
    const daysLeft = differenceInDays(deadline, new Date())
    if (daysLeft > 0) {
      deadlineText = `${daysLeft} days until ${format(deadline, "MMM d, yyyy")}`
    } else if (daysLeft === 0) {
      deadlineText = "Deadline is today!"
    } else {
      deadlineText = `${Math.abs(daysLeft)} days past deadline`
    }
  }

  // Progress percentage — based on stress improvement or drive count
  const progressPercent = stats?.stress_improvement != null
    ? Math.min(Math.round(Math.abs(stats.stress_improvement * 100)), 100)
    : stats?.completed_drives
      ? Math.min(Math.round((stats.completed_drives / 20) * 100), 100)
      : 0

  // Stats
  const completedDrives = stats?.completed_drives ?? 0
  const stressImprovement = stats?.stress_improvement != null
    ? Math.round(Math.abs(stats.stress_improvement * 100))
    : null
  const stressImproved = stats?.stress_improvement != null && stats.stress_improvement > 0
  const streak = stats?.current_streak ?? 0

  // Completed drives for list
  const completedDrivesList = drives.filter((d) => d.completed_at !== null)
  const hasMore = drives.length < totalDrives

  return (
    <div className="flex min-h-dvh flex-col pb-24">
      {/* Header */}
      <div className="px-6 pt-14">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Your Progress
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your journey to stress-free driving
        </p>
      </div>

      {/* Resolution card */}
      <div className="mt-6 px-6">
        <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Target className="h-5 w-5 text-primary" strokeWidth={1.8} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">
                {goalLabel}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {new Date().getFullYear()} Driving Resolution
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Overall progress
              </span>
              <span className="text-sm font-bold text-primary">{progressPercent}%</span>
            </div>
            <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-card">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Days remaining */}
          {deadlineText && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" strokeWidth={1.8} />
              <span>{deadlineText}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-5 grid grid-cols-3 gap-3 px-6">
        {/* Drives */}
        <div className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-border bg-card px-3 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
            <Car className="h-4.5 w-4.5 text-foreground" strokeWidth={1.8} />
          </div>
          <span className="text-xl font-bold text-foreground">{completedDrives}</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Drives
          </span>
        </div>

        {/* Stress reduction */}
        <div className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-3 py-4 ${
          stressImprovement !== null
            ? "border-primary/20 bg-primary/5"
            : "border-border bg-card"
        }`}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
            {stressImproved ? (
              <TrendingDown className="h-4.5 w-4.5 text-primary" strokeWidth={1.8} />
            ) : (
              <TrendingUp className="h-4.5 w-4.5 text-muted-foreground" strokeWidth={1.8} />
            )}
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className={`text-xl font-bold ${stressImprovement !== null ? "text-primary" : "text-muted-foreground"}`}>
              {stressImprovement !== null ? `${stressImprovement}%` : "—"}
            </span>
            {stressImproved && (
              <TrendingDown className="h-3 w-3 text-primary" strokeWidth={2.5} />
            )}
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Stress
          </span>
        </div>

        {/* Streak */}
        <div className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-border bg-card px-3 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(25,90%,55%)]/10">
            <Flame className="h-4.5 w-4.5 text-[hsl(25,90%,55%)]" strokeWidth={1.8} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-foreground">{streak}</span>
            {streak > 0 && (
              <Flame className="h-3.5 w-3.5 text-[hsl(25,90%,55%)]" strokeWidth={2.2} />
            )}
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Streak
          </span>
        </div>
      </div>

      {/* Stress trend chart */}
      <div className="mt-6 px-6">
        <StressTrendChart drives={drives} />
      </div>

      {/* Recent drives */}
      <div className="mt-8 px-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Recent Drives
        </h2>

        {completedDrivesList.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border py-8">
            <Car className="h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">No completed drives yet</p>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {completedDrivesList.map((drive) => {
              const stressVal = drive.post_drive_stress ?? drive.pre_drive_stress
              const { label, color, bg, icon: DriveIcon, fill } = getDriveDisplay(drive.rating, stressVal)

              return (
                <div
                  key={drive.id}
                  className="rounded-xl border-2 border-border bg-card p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}
                    >
                      <DriveIcon
                        className={`h-5 w-5 ${color}${fill ? " fill-current" : ""}`}
                        strokeWidth={1.8}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {getDriveDate(drive.started_at)} &middot; {drive.destination}
                      </p>
                      <p className={`mt-0.5 text-xs font-medium ${color}`}>
                        {label}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="rounded-xl border-2 text-sm font-medium"
            >
              {loadingMore ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ChevronDown className="mr-2 h-4 w-4" />
              )}
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
