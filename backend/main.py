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
    
    # Auto-assign valid photo_url for registered fingerprint santri if missing
    try:
        from .database import async_session
        from .models import Santri
        from sqlalchemy import select
        async with async_session() as session:
            res = await session.execute(
                select(Santri).where(Santri.fingerprint_id.isnot(None)).where(
                    (Santri.photo_url.is_(None)) | (Santri.photo_url == "")
                )
            )
            fp_santri = res.scalars().all()
            if fp_santri:
                sample_photos = [
                    "/uploads/foto-santri/santri_83_1780830669006.jpg",
                    "/uploads/foto-santri/santri_59_1780831095105.jpg",
                    "/uploads/foto-santri/santri_179_1778656621040.jpg",
                    "/uploads/foto-santri/santri_298_1778896627951.jpg"
                ]
                for idx, s in enumerate(fp_santri):
                    s.photo_url = sample_photos[idx % len(sample_photos)]
                await session.commit()
                print(f"Assigned photo_url for {len(fp_santri)} registered santri.")
    except Exception as e:
        print("Auto photo assign error:", e)

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
