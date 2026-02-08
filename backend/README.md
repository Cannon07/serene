# Serene Backend

FastAPI async backend with **5 AI agents**, **RAG-powered interventions**, and **Opik observability** for the Serene driving anxiety companion.

---

## Setup

### Prerequisites

- Python 3.12+
- API keys: OpenAI, Google Maps, Hume AI

### Install

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your keys:

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API key (GPT-4o, Whisper, TTS, Embeddings) |
| `GOOGLE_MAPS_API_KEY` | Yes | Google Maps Platform key (Routes, Places, Geocoding) |
| `HUME_API_KEY` | Yes | Hume AI key (facial + vocal emotion detection) |
| `OPIK_API_KEY` | No | Opik cloud key (enables tracing & evaluation) |
| `OPIK_WORKSPACE` | No | Opik workspace name |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: `http://localhost:3000`) |
| `DATABASE_URL` | No | PostgreSQL URL (default: local SQLite) |
| `CHROMA_PERSIST_DIR` | No | ChromaDB persistence path (default: `./knowledge_base/embeddings`) |

### Run

```bash
uvicorn main:app --reload
```

The server starts at `http://localhost:8000`. The **RAG knowledge base initializes automatically** on first start (requires OpenAI key for embeddings).

Interactive API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

<p align="center">
  <img src="../docs/screenshots/fastapi-docs.png" alt="FastAPI Docs" width="700" />
</p>

---

## AI Agents

Serene uses 5 specialized agents, each responsible for a distinct phase of the driving experience:

### RouteAgent
Analyzes routes from Google Maps and calculates **calm scores** (0-100) based on stress triggers. Detects highways, heavy traffic, complex intersections, and construction zones. Applies penalties for user-specific triggers and bonuses for scenic/residential areas. Recommends the calmest route.

### EmotionAgent
Processes video (pre/post drive) and audio (during drive) through **Hume AI** to extract emotion data and stress scores. Determines when interventions are needed based on thresholds:
- `< 0.3` — No intervention
- `0.3 – 0.6` — Calming message
- `0.6 – 0.8` — Breathing exercise
- `≥ 0.8` — Pull over guidance

### CalmAgent
Generates **personalized calming interventions** using RAG retrieval from the knowledge base + LLM generation. Produces calming messages, guided breathing exercises, grounding exercises, or pull-over instructions. Uses GPT-4o-mini for low/medium stress (fast) and GPT-4o for high/critical stress (quality).

### RerouteAgent
Finds **calmer alternative routes** during a drive when stress is elevated. Requires a minimum 20-point calm score improvement to suggest a reroute. Generates Google Maps deep links with waypoints for one-tap navigation.

### DebriefAgent
Post-drive analysis that calculates the **emotional journey** (pre vs. post stress), extracts learnings from drive events, suggests profile updates (new triggers, preference adjustments), and generates personalized encouragement messages.

---

## API Endpoints

### Users — `/api/users`
| Method | Path | Description |
|---|---|---|
| POST | `/api/users` | Create user with onboarding data |
| GET | `/api/users/{user_id}` | Get user profile with triggers & preferences |
| PUT | `/api/users/{user_id}` | Update user profile |
| GET | `/api/users/{user_id}/stats` | Get driving statistics |

### Routes — `/api/routes`
| Method | Path | Description |
|---|---|---|
| POST | `/api/routes/plan` | Plan routes with calm scores |
| POST | `/api/routes/prepare` | Get preparation checklist & stress tips |
| POST | `/api/routes/reroute` | Find calmer alternative route |

### Emotion — `/api/emotion`
| Method | Path | Description |
|---|---|---|
| POST | `/api/emotion/video` | Analyze video for emotions (check-in) |
| POST | `/api/emotion/audio` | Analyze audio during drive |

### Drives — `/api/drives`
| Method | Path | Description |
|---|---|---|
| POST | `/api/drives/start` | Start a new drive |
| GET | `/api/drives/{drive_id}` | Get drive details with events |
| POST | `/api/drives/{drive_id}/end` | End a drive |
| POST | `/api/drives/{drive_id}/accept-reroute` | Record reroute acceptance |
| POST | `/api/drives/{drive_id}/rate` | Rate a completed drive (1-5) |
| GET | `/api/users/{user_id}/active-drive` | Get current active drive |
| GET | `/api/users/{user_id}/drives` | List drive history (paginated) |

### Intervention — `/api/intervention`
| Method | Path | Description |
|---|---|---|
| POST | `/api/intervention/decide` | Decide & generate appropriate intervention |
| POST | `/api/intervention/calming-message` | Get personalized calming message |
| POST | `/api/intervention/breathing-exercise` | Get guided breathing exercise |
| POST | `/api/intervention/grounding-exercise` | Get grounding exercise |

### Debrief — `/api/debrief`
| Method | Path | Description |
|---|---|---|
| POST | `/api/debrief/process` | Process post-drive debrief |

### Voice — `/api/voice`
| Method | Path | Description |
|---|---|---|
| POST | `/api/voice/transcribe` | Speech-to-text (OpenAI Whisper) |
| POST | `/api/voice/speak` | Text-to-speech (OpenAI TTS) |
| POST | `/api/voice/command` | Process voice command with intent recognition |

### Metrics — `/api/metrics`
| Method | Path | Description |
|---|---|---|
| GET | `/api/metrics/dashboard` | Aggregated dashboard metrics |
| GET | `/api/metrics/user/{user_id}` | User-specific metrics |
| GET | `/api/metrics/events/summary` | Event type counts |
| GET | `/api/metrics/evaluations/summary` | Opik evaluation health summary |

---

## RAG System

Serene uses a **Retrieval-Augmented Generation** pipeline to ground calming interventions in evidence-based techniques:

- **Vector Store**: ChromaDB with OpenAI `text-embedding-3-small` embeddings
- **Retrieval**: MMR (Maximal Marginal Relevance) search for diverse results
- **13 Knowledge Base Documents**:

| Category | Documents |
|---|---|
| **Breathing** (4) | 4-7-8 Breathing, Box Breathing, Belly Breathing, Quick Calm |
| **Grounding** (3) | 5-4-3-2-1 Technique, Body Scan, Steering Wheel Grip |
| **Cognitive** (2) | Positive Affirmations, Challenging Thoughts |
| **Coping** (3) | Before Drive, During Drive, After Drive |
| **Facts** (1) | Driving Anxiety Facts & Statistics |

Each document is tagged with metadata for filtered retrieval based on intervention type and stress context.

---

## Opik Evaluation & Observability

### Tracing

23 functions are traced with `@track` decorators across all agents and services. Every trace captures inputs, outputs, latency, and errors — providing full visibility into the AI decision pipeline.

<p align="center">
  <img src="../docs/screenshots/opik-traces-detail.png" alt="Opik Trace Detail" width="700" />
</p>

**Traced by agent:**
- **RouteAgent** (2): `analyze_routes`, `calculate_calm_score`
- **EmotionAgent** (3): `process_video_checkin`, `process_audio_during_drive`, `should_trigger_intervention`
- **CalmAgent** (4): `generate_calming_message`, `get_breathing_exercise`, `get_grounding_exercise`, `generate_intervention`
- **RerouteAgent** (2): `find_calmer_route`, `should_suggest_reroute`
- **DebriefAgent** (5): `calculate_emotional_journey`, `extract_learnings`, `suggest_profile_updates`, `generate_encouragement`, `process_debrief`
- **HumeService** (3): `analyze_video`, `analyze_audio`, `extract_stress_score`
- **MapsService** (2): `get_routes`, `get_place_autocomplete`
- **RAGService** (2): `retrieve`, `similarity_search`

### Custom Metrics

| Metric | Type | Description |
|---|---|---|
| **StressResponseMatch** | Deterministic | Validates intervention type against stress thresholds. 1.0 = exact match, 0.5 = adjacent level, 0.0 = mismatch |
| **Safety** | Keyword + LLM Judge | Stage 1: Scans 17 banned phrases (instant 0.0 fail). Stage 2: LLM rates medical safety, dismissive language, pull-over recommendations |
| **InterventionQuality** | LLM Judge | Weighted evaluation — appropriateness (0.3), personalization (0.25), actionability (0.25), brevity (0.2) |
| **RAGGroundedness** | LLM-based | Measures how well interventions are grounded in retrieved knowledge base documents (inverted hallucination score) |
| **ToneEmpathy** | LLM Judge | Evaluates acknowledgment of feelings, warm tone, non-patronizing language, validation, gentle encouragement |

### Datasets

<p align="center">
  <img src="../docs/screenshots/opik-datasets.png" alt="Opik Datasets" width="700" />
</p>

| Dataset | Items | Description |
|---|---|---|
| `serene-intervention-scenarios` | 20 | Stress levels LOW→CRITICAL, user preferences, boundary values |
| `serene-safety-edge-cases` | 10 | Adversarial: medication requests, dismissive language, panic, medical emergencies, child safety |
| `serene-debrief-scenarios` | 10 | Post-drive: stress reduction, no improvement, stress increase, multiple interventions, reroute patterns |

### Online Scoring

Every intervention generated during a live drive is scored asynchronously with deterministic metrics (StressResponseMatch, SafetyKeywordCheck) — zero latency impact. Results available at `GET /api/metrics/evaluations/summary`.

---

## Database Schema

| Table | Description |
|---|---|
| `users` | User profile: name, resolution goal, deadline, driving experience, frequency |
| `user_stress_triggers` | Per-user stress triggers (highways, traffic, etc.) with severity ratings |
| `user_calming_preferences` | Per-user calming preferences (breathing, music, etc.) with effectiveness ratings |
| `drives` | Drive records: origin, destination, route, stress scores, intervention/reroute counts, rating |
| `drive_events` | Timestamped events: stress detected, intervention, reroute offered/accepted, voice commands |

---

## Running Evaluations

### Upload Datasets

```python
from evaluations.experiments.datasets import upload_all_datasets
import asyncio
asyncio.run(upload_all_datasets())
```

### Run Experiments

```python
# Intervention quality across all stress scenarios
from evaluations.experiments.intervention_experiment import run_intervention_experiment
asyncio.run(run_intervention_experiment())

# Model comparison: GPT-4o vs GPT-4o-mini
from evaluations.experiments.model_comparison_experiment import run_model_comparison
asyncio.run(run_model_comparison())

# Debrief encouragement quality
from evaluations.experiments.debrief_experiment import run_debrief_experiment
asyncio.run(run_debrief_experiment())
```

Results appear in your [Opik dashboard](https://www.comet.com/opik) under the configured workspace.
