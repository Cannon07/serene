"use client"

import {
  Target,
  Calendar,
  Car,
  TrendingDown,
  Flame,
  Star,
  Smile,
  Meh,
} from "lucide-react"

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May"]
const CHART_POINTS = [
  { x: 0, y: 18 },
  { x: 1, y: 32 },
  { x: 2, y: 28 },
  { x: 3, y: 45 },
  { x: 4, y: 62 },
]

function StressTrendChart() {
  const width = 310
  const height = 120
  const paddingX = 10
  const paddingY = 10
  const chartWidth = width - paddingX * 2
  const chartHeight = height - paddingY * 2

  const maxY = 70

  const points = CHART_POINTS.map((p, i) => ({
    cx: paddingX + (i / (CHART_POINTS.length - 1)) * chartWidth,
    cy: paddingY + chartHeight - (p.y / maxY) * chartHeight,
  }))

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.cx} ${p.cy}`)
    .join(" ")

  const areaPath = `${linePath} L ${points[points.length - 1].cx} ${height} L ${points[0].cx} ${height} Z`

  return (
    <div className="mt-4 overflow-hidden rounded-xl border-2 border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Stress Trend
        </h3>
        <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1">
          <TrendingDown className="h-3 w-3 text-primary" strokeWidth={2.2} />
          <span className="text-[10px] font-bold text-primary">
            Improving
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-3 w-full"
        preserveAspectRatio="none"
        aria-label="Stress trend chart showing a downward trend from January to May"
        role="img"
      >
        <defs>
          <linearGradient
            id="areaGrad"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
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
          <g key={`point-${MONTH_LABELS[i]}`}>
            <circle
              cx={p.cx}
              cy={p.cy}
              r="4"
              fill="hsl(0 0% 100%)"
              stroke="hsl(152 55% 42%)"
              strokeWidth="2.5"
            />
          </g>
        ))}
      </svg>

      {/* X-axis labels */}
      <div className="mt-1 flex justify-between px-1">
        {MONTH_LABELS.map((label) => (
          <span
            key={label}
            className="text-[10px] font-medium text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i <= rating
              ? "fill-primary/80 text-primary/80"
              : "fill-none text-border"
          }`}
          strokeWidth={1.8}
        />
      ))}
    </div>
  )
}

const RECENT_DRIVES = [
  {
    destination: "Phoenix Mall",
    when: "Today",
    stress: "Low stress",
    stressIcon: Smile,
    stressColor: "text-primary",
    stressBg: "bg-primary/10",
    rating: 4,
  },
  {
    destination: "Office",
    when: "Yesterday",
    stress: "Medium stress",
    stressIcon: Meh,
    stressColor: "text-[hsl(35,80%,50%)]",
    stressBg: "bg-[hsl(35,80%,50%)]/10",
    rating: 3,
  },
]

export function ProgressContent() {
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
                Overcome highway anxiety
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                2026 Driving Resolution
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Overall progress
              </span>
              <span className="text-sm font-bold text-primary">45%</span>
            </div>
            <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-card">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: "45%" }}
              />
            </div>
          </div>

          {/* Days remaining */}
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" strokeWidth={1.8} />
            <span>137 days until June 1, 2026</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-5 grid grid-cols-3 gap-3 px-6">
        {/* Drives */}
        <div className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-border bg-card px-3 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
            <Car className="h-4.5 w-4.5 text-foreground" strokeWidth={1.8} />
          </div>
          <span className="text-xl font-bold text-foreground">12</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Drives
          </span>
        </div>

        {/* Stress reduction */}
        <div className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-primary/20 bg-primary/5 px-3 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
            <TrendingDown className="h-4.5 w-4.5 text-primary" strokeWidth={1.8} />
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-bold text-primary">30%</span>
            <TrendingDown className="h-3 w-3 text-primary" strokeWidth={2.5} />
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
            <span className="text-xl font-bold text-foreground">5</span>
            <Flame className="h-3.5 w-3.5 text-[hsl(25,90%,55%)]" strokeWidth={2.2} />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Streak
          </span>
        </div>
      </div>

      {/* Stress trend chart */}
      <div className="mt-6 px-6">
        <StressTrendChart />
      </div>

      {/* Recent drives */}
      <div className="mt-8 px-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Recent Drives
        </h2>

        <div className="mt-3 flex flex-col gap-3">
          {RECENT_DRIVES.map((drive, index) => (
            <div
              key={drive.destination}
              className="rounded-xl border-2 border-border bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${drive.stressBg}`}
                  >
                    <drive.stressIcon
                      className={`h-5 w-5 ${drive.stressColor}`}
                      strokeWidth={1.8}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {drive.when} &middot; {drive.destination}
                    </p>
                    <p className={`mt-0.5 text-xs font-medium ${drive.stressColor}`}>
                      {drive.stress}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-dashed border-border pt-3">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Your rating
                </span>
                <StarRating rating={drive.rating} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
