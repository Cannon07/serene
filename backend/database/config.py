import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

_raw_url = os.getenv("DATABASE_URL", "")

if _raw_url:
    # Render provides postgres:// — SQLAlchemy needs postgresql+asyncpg://
    if _raw_url.startswith("postgres://"):
        DATABASE_URL = _raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif _raw_url.startswith("postgresql://"):
        DATABASE_URL = _raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    else:
        DATABASE_URL = _raw_url
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
    )
else:
    # Local dev: SQLite
    DATABASE_URL = "sqlite+aiosqlite:///./serene.db"
    engine = create_async_engine(DATABASE_URL, echo=False)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    """Dependency for getting async database sessions."""
    async with async_session() as session:
        yield session


async def init_db():
    """Create all tables."""
    from models.database import User, UserStressTrigger, UserCalmingPreference, Drive, DriveEvent
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
