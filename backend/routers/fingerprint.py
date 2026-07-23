from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import Santri, Attendance, AcademicYear, FingerprintLog
from ..schemas import (
    FingerprintScanRequest, FingerprintEnrollRequest,
    FingerprintStartEnrollRequest, FingerprintTemplateOut
)
from ..services.sse import sse_manager
from datetime import datetime, date, timezone, timedelta
from typing import List, Optional

router = APIRouter(prefix="/api/fingerprint", tags=["Fingerprint"])

# Global memory state for current enrollment session
# { "santri_id": int, "started_at": datetime }
current_enroll_session = {}

@router.get("/templates", response_model=List[FingerprintTemplateOut])
async def get_templates(db: AsyncSession = Depends(get_db)):
    """Retrieve all saved fingerprint templates for syncing to the C# Bridge."""
    result = await db.execute(
        select(Santri)
        .where(Santri.fingerprint_id.isnot(None))
        .where(Santri.fingerprint_template.isnot(None))
    )
    rows = result.scalars().all()
    return [
        FingerprintTemplateOut(
            santri_id=s.id,
            fingerprint_id=s.fingerprint_id,
            template_data=s.fingerprint_template
        ) for s in rows
    ]

@router.post("/start-enroll")
async def start_enroll(data: FingerprintStartEnrollRequest, db: AsyncSession = Depends(get_db)):
    """Triggered by the Web UI to initiate enrollment mode for a specific Santri."""
    result = await db.execute(select(Santri).where(Santri.id == data.santri_id))
    santri = result.scalar_one_or_none()
    if not santri:
        raise HTTPException(404, "Santri tidak ditemukan")
    
    current_enroll_session["santri_id"] = santri.id
    current_enroll_session["started_at"] = datetime.utcnow()
    
    await sse_manager.broadcast("enroll_start", {
        "santri_id": santri.id,
        "name": santri.name
    })
    
    return {"message": f"Pendaftaran sidik jari dimulai untuk {santri.name}"}

@router.get("/enroll-status")
async def get_enroll_status(db: AsyncSession = Depends(get_db)):
    """Endpoint for the C# Bridge to check if there is an active enrollment session."""
    santri_id = current_enroll_session.get("santri_id")
    if not santri_id:
        return {"active": False}
        
    result = await db.execute(select(Santri).where(Santri.id == santri_id))
    santri = result.scalar_one_or_none()
    if not santri:
        current_enroll_session.clear()
        return {"active": False}
        
    return {
        "active": True,
        "santri_id": santri.id,
        "name": santri.name
    }

@router.post("/enroll")
async def enroll_fingerprint(data: FingerprintEnrollRequest, db: AsyncSession = Depends(get_db)):
    """Receives the newly registered fingerprint data from the C# Bridge."""
    santri_id = current_enroll_session.get("santri_id")
    if not santri_id:
        raise HTTPException(400, "Tidak ada sesi pendaftaran aktif dari Web UI")
        
    result = await db.execute(select(Santri).where(Santri.id == santri_id))
    santri = result.scalar_one_or_none()
    if not santri:
        current_enroll_session.clear()
        raise HTTPException(404, "Santri untuk sesi pendaftaran tidak ditemukan")
        
    # Check if fingerprint ID is already used by someone else
    existing = await db.execute(select(Santri).where(Santri.fingerprint_id == data.fingerprint_id))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "ID Sidik jari ini sudah terdaftar untuk santri lain")
        
    # Update Santri records
    santri.fingerprint_id = data.fingerprint_id
    santri.fingerprint_template = data.template_data
    
    # Save log
    log = FingerprintLog(
        fingerprint_id=data.fingerprint_id,
        santri_name=santri.name,
        status="Enroll Sukses"
    )
    db.add(log)
    
    await db.commit()
    current_enroll_session.clear()
    
    # Notify Web UI
    await sse_manager.broadcast("enroll_success", {
        "santri_id": santri.id,
        "name": santri.name,
        "fingerprint_id": data.fingerprint_id
    })
    
    return {"message": f"Sidik jari berhasil didaftarkan untuk {santri.name}"}

@router.post("/scan")
async def scan_fingerprint(data: FingerprintScanRequest, db: AsyncSession = Depends(get_db)):
    """Receives a fingerprint scan event from the C# Bridge and records attendance."""
    result = await db.execute(select(Santri).where(Santri.fingerprint_id == data.fingerprint_id))
    santri = result.scalar_one_or_none()
    
    if not santri:
        # Unknown fingerprint
        log = FingerprintLog(
            fingerprint_id=data.fingerprint_id,
            score=data.score,
            status="Gagal - ID Tidak Dikenal"
        )
        db.add(log)
        await db.commit()
        
        await sse_manager.broadcast("scan_failed", {
            "fingerprint_id": data.fingerprint_id,
            "message": "Sidik jari tidak terdaftar di sistem"
        })
        raise HTTPException(404, "Sidik jari tidak dikenal")
        
    # Find active academic year
    ay_res = await db.execute(select(AcademicYear).where(AcademicYear.is_active == True))
    active_year = ay_res.scalar_one_or_none()
    if not active_year:
        raise HTTPException(400, "Tahun ajaran aktif belum ditentukan. Hubungi admin.")
        
    # Determine prayer time if not sent by bridge
    prayer_time = data.prayer_time
    if not prayer_time:
        hour = datetime.now().hour
        if 4 <= hour < 6:
            prayer_time = "Subuh"
        elif 11 <= hour < 14:
            prayer_time = "Dzuhur"
        elif 15 <= hour < 17:
            prayer_time = "Ashar"
        elif 17 <= hour < 19:
            prayer_time = "Maghrib"
        elif 19 <= hour < 22:
            prayer_time = "Isya"
        else:
            prayer_time = "Subuh" # Fallback default
            
    today = date.today()
    
    # Check if already checked in
    att_res = await db.execute(
        select(Attendance)
        .where(Attendance.santri_id == santri.id)
        .where(Attendance.date == today)
        .where(Attendance.prayer_time == prayer_time)
    )
    existing_att = att_res.scalar_one_or_none()
    
    status_str = "Hadir"
    if existing_att:
        status_str = existing_att.status
        # Update scan time if already present but not scan-authenticated
        if existing_att.method == "Manual":
            existing_att.method = "Fingerprint"
            existing_att.scanned_at = datetime.utcnow() + timedelta(hours=7)
            await db.commit()
    else:
        # Create new attendance record
        new_att = Attendance(
            santri_id=santri.id,
            date=today,
            prayer_time=prayer_time,
            status="Hadir",
            method="Fingerprint",
            scanned_at=datetime.utcnow() + timedelta(hours=7),
            academic_year_id=active_year.id
        )
        db.add(new_att)
        
    # Log scan
    log = FingerprintLog(
        fingerprint_id=data.fingerprint_id,
        santri_name=santri.name,
        score=data.score,
        status=f"Absen {prayer_time} Berhasil"
    )
    db.add(log)
    await db.commit()
    
    # Broadcast scan to Web UI
    await sse_manager.broadcast("scan_success", {
        "santri_id": santri.id,
        "name": santri.name,
        "gender": santri.gender,
        "room": santri.room,
        "prayer_time": prayer_time,
        "status": status_str,
        "time": datetime.now().strftime("%H:%M:%S")
    })
    
    return {
        "status": "success",
        "name": santri.name,
        "prayer_time": prayer_time,
        "message": f"Kehadiran {prayer_time} berhasil dicatat"
    }

@router.post("/cancel-enroll")
async def cancel_enroll():
    """Cancel the active enrollment session."""
    current_enroll_session.clear()
    await sse_manager.broadcast("enroll_cancelled", {})
    return {"message": "Pendaftaran sidik jari dibatalkan"}
