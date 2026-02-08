# Serene Frontend

Next.js 16 Progressive Web App with React 19, TypeScript, and mobile-first design for the Serene driving anxiety companion.

---

## Setup

### Prerequisites

- Node.js 18+
- pnpm

### Install

```bash
cd frontend
pnpm install
```

### Environment

```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

### Run

```bash
pnpm dev
```

Frontend runs at `http://localhost:3000`.

### Build

```bash
pnpm build
pnpm start
```

---

## App Flow

```
Welcome → Onboarding (4 steps) → Dashboard
                                     │
                          ┌──────────┴──────────┐
                          │                     │
                      Plan Trip            Progress
                          │
                   Route Comparison
                          │
                    Pre-drive Prep
                      │        │
                 Breathing   Check-in
                             │
                        Check-in Results
                             │
                        Active Drive ←── Stress Intervention
                             │               (overlay)
                       Drive Summary
                             │
                         Debrief
                             │
                      Debrief Results
                             │
                         Dashboard
```

<p align="center">
  <img src="../docs/screenshots/onboarding-flow.png" alt="Onboarding Flow" width="700" />
</p>

---

## Key Features

### PWA — Installable & Offline-Capable
Progressive Web App with service worker, manifest, and install prompt. Works on iOS and Android home screens.

<p align="center">
  <img src="../docs/screenshots/pwa-install.png" alt="PWA Install" width="300" />
</p>

### Real-Time Audio Stress Monitoring
Continuous microphone recording during drives with 30-second audio chunks sent to the backend for emotion analysis via Hume AI.

### Voice Commands
Hands-free control using OpenAI Whisper (speech-to-text) and OpenAI TTS (text-to-speech). Supports commands like "I'm feeling anxious", "Find a calmer route", "Start debrief".

### Video Emotion Check-in
Camera-based facial emotion analysis before and after drives to measure baseline stress and track improvement.

### Geolocation Tracking
Real-time position tracking during drives for stress event mapping and dynamic rerouting.

<p align="center">
  <img src="../docs/screenshots/plan-trip.png" alt="Plan Trip" width="300" />
</p>

### Dynamic Rerouting
When stress spikes, the app suggests calmer alternative routes with one-tap Google Maps deep links for navigation.

### Progress Dashboard
Visualize stress trends, drive history, and intervention effectiveness over time with interactive charts.

<p align="center">
  <img src="../docs/screenshots/progress.png" alt="Progress Dashboard" width="300" />
</p>

---

## Architecture

### Pages — 18 Routes (App Router)

| Route | Page |
|---|---|
| `/` | Welcome |
| `/onboarding/goal` | Goal selection |
| `/onboarding/profile` | Profile setup |
| `/onboarding/triggers` | Stress trigger selection |
| `/onboarding/calming` | Calming preference selection |
| `/dashboard` | Home dashboard |
| `/plan` | Plan a trip |
| `/routes` | Route comparison |
| `/prepare` | Pre-drive preparation |
| `/breathing` | Breathing exercise |
| `/checkin` | Video check-in |
| `/checkin/results` | Check-in results |
| `/drive` | Active drive |
| `/drive/summary` | Drive summary |
| `/debrief` | Debrief recording |
| `/debrief/results` | Debrief results |
| `/progress` | Progress dashboard |
| `/settings` | User settings |

### Components — 29 Feature + 49 shadcn/ui

**Feature components** (in `components/`):
`DashboardContent`, `PlanTripContent`, `RouteComparisonContent`, `RouteCard`, `PreDriveContent`, `BreathingExerciseContent`, `CheckinContent`, `CheckinResultsContent`, `DriveContent`, `DriveSummaryContent`, `StressIntervention`, `DebriefContent`, `DebriefResultsContent`, `ProgressContent`, `SettingsContent`, `WelcomeContent`, `ProfileSetup`, `GoalSelection`, `GoalCard`, `TriggerSelection`, `TriggerChip`, `CalmingSelection`, `CalmingCard`, `OnboardingProgress`, `RadioCard`, `TargetDatePicker`, `BottomNav`, `SereneLogo`, `ThemeProvider`

**shadcn/ui components** (in `components/ui/`):
49 Radix UI primitives including Button, Card, Dialog, Sheet, Tabs, Toast, Form, Select, Slider, Progress, and more.

### Custom Hooks

| Hook | Description |
|---|---|
| `useCamera` | Video recording for emotion check-in (MediaRecorder API) |
| `useMicrophone` | Audio recording for stress monitoring (30s chunks) |
| `useGeolocation` | Real-time position tracking (Geolocation API) |
| `useWakeLock` | Keeps screen on during drives (Screen Wake Lock API) |
| `useVoiceRecognition` | Speech-to-text via OpenAI Whisper (Web Speech API fallback) |
| `useSpeechSynthesis` | Text-to-speech via OpenAI TTS (SpeechSynthesis API fallback) |
| `useRequireUser` | Route protection — redirects to welcome if no user session |
| `useInstallPrompt` | PWA install prompt (beforeinstallprompt event) |

### Services — 9 API Modules

| Service | Key Methods |
|---|---|
| `api.ts` | Axios base config with `NEXT_PUBLIC_API_URL` |
| `userService` | `create`, `get`, `update`, `getStats` |
| `routeService` | `plan`, `prepare`, `reroute` |
| `emotionService` | `analyzeVideo`, `analyzeAudio` |
| `driveService` | `start`, `get`, `end`, `acceptReroute`, `rate`, `getActiveDrive`, `getDrives` |
| `interventionService` | `decide`, `calmingMessage`, `breathingExercise`, `groundingExercise` |
| `voiceService` | `transcribe`, `speak`, `sendCommand` |
| `debriefService` | `process` |
| `metricsService` | `dashboard`, `user`, `eventsSummary`, `evaluationsSummary` |

### Stores — 4 Zustand Stores

| Store | State Managed |
|---|---|
| `userStore` | Current user session, user ID, profile data |
| `driveStore` | Active drive, selected route, current location, drive end response |
| `onboardingStore` | Onboarding form state (name, goal, triggers, preferences) |
| `interventionStore` | Active intervention overlay, visibility state |

### Types — 9 Definition Files

`user.ts`, `route.ts`, `drive.ts`, `emotion.ts`, `intervention.ts`, `voice.ts`, `debrief.ts`, `reroute.ts`, `metrics.ts`

---

## PWA Configuration

- **Manifest**: `public/manifest.json` — standalone display, portrait orientation, green theme
- **Icons**: `public/icons/icon-192.png`, `public/icons/icon-512.png`
- **Service Worker**: Auto-generated by `@ducanh2912/next-pwa`
- **Install Prompt**: Custom `useInstallPrompt` hook with banner on dashboard
- **Offline**: Service worker caches app shell for offline access
