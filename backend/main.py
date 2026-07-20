from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .database import init_db
from .routers import academic_years, santri, fingerprint, attendance, rekap, whatsapp, settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inisialisasi database relasional PostgreSQL (membuat tabel jika belum ada)
    await init_db()
    yield

app = FastAPI(
    title="Pesantren Al-Hamid - API Absensi Sholat",
    description="Sistem Absensi Sholat 5 Waktu Santri berbasis Sidik Jari ZK7500 & PostgreSQL",
    version="1.0.0",
    lifespan=lifespan
)

# Setup CORS agar frontend React (Vite) dapat mengakses API
import os
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
