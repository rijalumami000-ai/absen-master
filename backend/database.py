import os
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "absensi_sholat")

DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Secondary connection to sekolah_info DB
SEKOLAH_DB_NAME = os.getenv("SEKOLAH_INFO_DB_NAME", "sekolah_info")
SEKOLAH_DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{SEKOLAH_DB_NAME}"
sekolah_engine = create_async_engine(SEKOLAH_DATABASE_URL, echo=False)
sekolah_session = async_sessionmaker(sekolah_engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    """Dependency injection for database sessions."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_sekolah_db():
    """Dependency injection for sekolah_info database sessions."""
    async with sekolah_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Create all tables on startup and apply dynamic migrations."""
    async with engine.begin() as conn:
        from . import models  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
        
        # Ensure new fields are added to existing database tables
        await conn.execute(text("ALTER TABLE santri ADD COLUMN IF NOT EXISTS sekolah_info_santri_id INTEGER"))
        await conn.execute(text("ALTER TABLE santri ADD COLUMN IF NOT EXISTS mother_name VARCHAR(150)"))
        await conn.execute(text("ALTER TABLE santri ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500)"))
        await conn.execute(text("ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS sekolah_info_year_id INTEGER"))
        
        # Add unique constraints separately
        try:
            await conn.execute(text("ALTER TABLE santri ADD CONSTRAINT unique_sekolah_info_santri_id UNIQUE (sekolah_info_santri_id)"))
        except Exception:
            pass
            
        try:
            await conn.execute(text("ALTER TABLE academic_years ADD CONSTRAINT unique_sekolah_info_year_id UNIQUE (sekolah_info_year_id)"))
        except Exception:
            pass
