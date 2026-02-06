"use client"

import { CalendarDays, ChevronDown } from "lucide-react"
import { useState, useRef, useEffect } from "react"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

interface TargetDatePickerProps {
  month: number
  year: number
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
}

export function TargetDatePicker({
  month,
  year,
  onMonthChange,
  onYearChange,
}: TargetDatePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const currentYear = 2026
  const years = Array.from({ length: 4 }, (_, i) => currentYear + i)

  return (
    <div className="flex flex-col gap-2" ref={ref}>
      <label className="text-sm font-medium text-foreground">Target date</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 py-3.5 transition-colors hover:border-primary/30"
      >
        <CalendarDays className="h-5 w-5 text-primary" strokeWidth={1.8} />
        <span className="flex-1 text-left text-sm font-medium text-foreground">
          {MONTHS[month]} {year}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-lg">
          {/* Year selector */}
          <div className="mb-3 flex gap-2">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => onYearChange(y)}
                className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${
                  y === year
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((m, i) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  onMonthChange(i)
                  setOpen(false)
                }}
                className={`rounded-xl py-2.5 text-xs font-medium transition-colors ${
                  i === month
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                {m.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
