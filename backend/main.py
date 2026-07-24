from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from .database import init_db
from .routers import academic_years, santri, fingerprint, attendance, rekap, whatsapp, settings
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inisialisasi database relasional PostgreSQL (membuat tabel jika belum ada)
    await init_db()
    
    # Auto-cleanup test santri accounts (Rijal Umami, Indra Pratama, Marwan, Bejir)
    try:
        from .database import async_session
        from .models import Santri, Attendance, FingerprintLog
        from sqlalchemy import select, delete
        async with async_session() as session:
            test_names = ["Rijal Umami", "Indra Pratama", "Marwan", "Bejir"]
            res = await session.execute(select(Santri).where(Santri.name.in_(test_names)))
            test_santri = res.scalars().all()
            ids = [s.id for s in test_santri]
            fp_ids = [s.fingerprint_id for s in test_santri if s.fingerprint_id]
            if ids:
                await session.execute(delete(Attendance).where(Attendance.santri_id.in_(ids)))
                if fp_ids:
                    await session.execute(delete(FingerprintLog).where(FingerprintLog.fingerprint_id.in_(fp_ids)))
                await session.execute(delete(Santri).where(Santri.id.in_(ids)))
                await session.commit()
                print(f"Cleaned up {len(ids)} test santri accounts.")
    except Exception as e:
        print("Auto test cleanup error:", e)

    yield

app = FastAPI(
    title="Pesantren Al-Hamid - API Absensi Sholat",
    description="Sistem Absensi Sholat 5 Waktu Santri berbasis Sidik Jari ZK7500 & PostgreSQL",
    version="1.0.0",
    lifespan=lifespan
)

# Setup static files directory
os.makedirs("backend/static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="backend/static"), name="static")

# Mount sekolah-info public upload files directly
sekolah_info_public = os.getenv("SEKOLAH_INFO_PUBLIC_DIR", "d:/source/sekolah-info/public")
if not os.path.exists(sekolah_info_public):
    # Fallback to VPS Ubuntu path
    if os.path.exists("/var/www/sekolah-info/public"):
        sekolah_info_public = "/var/www/sekolah-info/public"

if os.path.exists(sekolah_info_public):
    app.mount("/sekolah-info-static", StaticFiles(directory=sekolah_info_public), name="sekolah-info-static")
    uploads_dir = os.path.join(sekolah_info_public, "uploads")
    if os.path.exists(uploads_dir):
        app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Setup CORS agar frontend React (Vite) dapat mengakses API
cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://absen.alhamidcintamulya.my.id,https://absen.alhamidcintamulya.my.id")
origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(academic_years.router)
app.include_router(santri.router)
app.include_router(fingerprint.router)
app.include_router(attendance.router)
app.include_router(rekap.router)
app.include_router(whatsapp.router)
app.include_router(settings.router)

@app.get("/")
def read_root():
    return {"message": "API Absensi Sholat Al-Hamid aktif!"}
