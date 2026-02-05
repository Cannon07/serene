import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy import text

from database.config import init_db, engine
from api.users import router as users_router
from api.routes import router as routes_router
from api.emotion import router as emotion_router
from api.intervention import router as intervention_router
from api.voice import router as voice_router
from api.debrief import router as debrief_router
from api.drives import router as drives_router, user_drives_router
from config.opik_config import init_opik
from services.rag_service import RAGService

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize Opik, database, and RAG service on startup."""
    init_opik()
    await init_db()
    # Initialize RAG service (loads knowledge base) - non-blocking
    try:
        rag_service = RAGService.get_instance()
        await rag_service.initialize()
    except Exception as e:
        print(f"Warning: RAG service initialization failed: {e}")
        print("Calm Agent features will be limited until OpenAI API is configured.")
    yield


app = FastAPI(
    title="Serene",
    description="AI-powered driving companion for anxiety support",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(users_router)
app.include_router(routes_router)
app.include_router(emotion_router)
app.include_router(intervention_router)
app.include_router(voice_router)
app.include_router(debrief_router)
app.include_router(drives_router)
app.include_router(user_drives_router)


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/api/debug/tables")
async def list_tables():
    """List all database tables (dev only)."""
    async with engine.connect() as conn:
        result = await conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        )
        tables = [row[0] for row in result.fetchall()]
    return {"tables": tables}
