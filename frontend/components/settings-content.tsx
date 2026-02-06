"use client"

import React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronRight,
  Zap,
  Heart,
  Target,
  Bell,
  Mic,
  Smartphone,
  HelpCircle,
  Shield,
  FileText,
  Info,
  LogOut,
  Settings,
} from "lucide-react"

interface SettingsItemProps {
  icon: React.ElementType
  label: string
  iconBg?: string
  iconColor?: string
  trailing?: "chevron" | "toggle" | "text"
  trailingText?: string
  toggled?: boolean
  onToggle?: () => void
  onClick?: () => void
}

function SettingsItem({
  icon: Icon,
  label,
  iconBg = "bg-secondary",
  iconColor = "text-foreground",
  trailing = "chevron",
  trailingText,
  toggled,
  onToggle,
  onClick,
}: SettingsItemProps) {
  return (
    <button
      type="button"
      onClick={trailing === "toggle" ? onToggle : onClick}
      className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-accent/50 active:bg-accent"
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
      >
        <Icon className={`h-4.5 w-4.5 ${iconColor}`} strokeWidth={1.8} />
      </div>
      <span className="flex-1 text-sm font-medium text-foreground">
        {label}
      </span>
      {trailing === "chevron" && (
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground"
          strokeWidth={1.8}
        />
      )}
      {trailing === "toggle" && (
        <div
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            toggled ? "bg-primary" : "bg-border"
          }`}
        >
          <div
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
              toggled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </div>
      )}
      {trailing === "text" && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {trailingText}
        </span>
      )}
    </button>
  )
}

function SettingsGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h2 className="mb-1.5 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="mx-4 overflow-hidden rounded-2xl border-2 border-border bg-card">
        {children}
      </div>
    </div>
  )
}

function Divider() {
  return <div className="mx-4 border-t border-border" />
}

export function SettingsContent() {
  const router = useRouter()
  const [notifications, setNotifications] = useState(true)
  const [voiceCommands, setVoiceCommands] = useState(true)
  const [screenOn, setScreenOn] = useState(true)

  return (
    <div className="flex min-h-dvh flex-col pb-24">
      {/* Header */}
      <div className="px-6 pt-14">
        <div className="flex items-center gap-2.5">
          <Settings className="h-6 w-6 text-foreground" strokeWidth={1.8} />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
        </div>
      </div>

      {/* Profile section */}
      <div className="mt-6 px-6">
        <div className="flex items-center gap-4 rounded-2xl border-2 border-border bg-card p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <span className="text-lg font-bold text-primary">JS</span>
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-foreground">Jay Shitre</p>
            <button
              type="button"
              className="mt-0.5 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Edit Profile
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* My Preferences */}
      <div className="mt-8">
        <SettingsGroup title="My Preferences">
          <SettingsItem
            icon={Zap}
            label="Stress Triggers"
            iconBg="bg-[hsl(35,80%,50%)]/10"
            iconColor="text-[hsl(35,80%,50%)]"
            onClick={() => router.push("/onboarding/triggers")}
          />
          <Divider />
          <SettingsItem
            icon={Heart}
            label="Calming Preferences"
            iconBg="bg-primary/10"
            iconColor="text-primary"
            onClick={() => router.push("/onboarding/calming")}
          />
          <Divider />
          <SettingsItem
            icon={Target}
            label="Resolution Goal"
            iconBg="bg-[hsl(200,70%,50%)]/10"
            iconColor="text-[hsl(200,70%,50%)]"
            onClick={() => router.push("/onboarding/goal")}
          />
        </SettingsGroup>
      </div>

      {/* App Settings */}
      <div className="mt-6">
        <SettingsGroup title="App Settings">
          <SettingsItem
            icon={Bell}
            label="Notifications"
            iconBg="bg-destructive/10"
            iconColor="text-destructive"
            trailing="toggle"
            toggled={notifications}
            onToggle={() => setNotifications(!notifications)}
          />
          <Divider />
          <SettingsItem
            icon={Mic}
            label="Voice Commands"
            iconBg="bg-[hsl(270,60%,55%)]/10"
            iconColor="text-[hsl(270,60%,55%)]"
            trailing="toggle"
            toggled={voiceCommands}
            onToggle={() => setVoiceCommands(!voiceCommands)}
          />
          <Divider />
          <SettingsItem
            icon={Smartphone}
            label="Keep Screen On During Drive"
            iconBg="bg-secondary"
            iconColor="text-foreground"
            trailing="toggle"
            toggled={screenOn}
            onToggle={() => setScreenOn(!screenOn)}
          />
        </SettingsGroup>
      </div>

      {/* About */}
      <div className="mt-6">
        <SettingsGroup title="About">
          <SettingsItem
            icon={HelpCircle}
            label="Help & Support"
            iconBg="bg-primary/10"
            iconColor="text-primary"
          />
          <Divider />
          <SettingsItem
            icon={Shield}
            label="Privacy Policy"
            iconBg="bg-secondary"
            iconColor="text-muted-foreground"
          />
          <Divider />
          <SettingsItem
            icon={FileText}
            label="Terms of Service"
            iconBg="bg-secondary"
            iconColor="text-muted-foreground"
          />
          <Divider />
          <SettingsItem
            icon={Info}
            label="App Version"
            iconBg="bg-secondary"
            iconColor="text-muted-foreground"
            trailing="text"
            trailingText="1.0.0"
          />
        </SettingsGroup>
      </div>

      {/* Sign Out */}
      <div className="mt-8 flex justify-center px-6 pb-4">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 active:bg-destructive/15"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.8} />
          Sign Out
        </button>
      </div>
    </div>
  )
}
