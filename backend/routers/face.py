import json
import logging
from datetime import datetime, date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from ..database import get_db
from ..models import Santri, Attendance, AcademicYear, Setting
from ..schemas import FaceEnrollRequest, FaceScanRequest, FaceScanResponse
from ..services.face_service import (
    decode_base64_image,
    extract_face_embedding,
    find_matching_santri
)
from ..services.sse import sse_manager
from ..services.wa_sender import send_whatsapp, render_template

logger = logging.getLogger("face_router")

router = APIRouter(prefix="/api/face", tags=["Face Recognition"])


async def send_single_whatsapp_notification(santri: Santri, prayer_time: str, status: str, time_str: str, db: AsyncSession):
    """Sends immediate WhatsApp notification to parent when attendance is scanned."""
    if not santri.parent_phone or not santri.parent_phone.strip():
        return

    try:
        result = await db.execute(select(Setting).where(Setting.key == "wa_template"))
        setting = result.scalar_one_or_none()

        default_tpl = (
            "Assalamu'alaikum, Bapak/Ibu Wali dari {nama} ({kamar}).\n\n"
            "Pemberitahuan Absensi Sholat {sholat}:\n"
            "- Status: *{status}*\n"
            "- Waktu: {waktu}\n"
            "- Tanggal: {tanggal}\n\n"
            "Terimakasih.\n- Pesantren Al-Hamid"
        )

        template = setting.value if setting else default_tpl
        today_str = date.today().strftime("%d-%m-%Y")

        variables = {
            "nama": santri.name,
            "kamar": santri.room,
            "gender": santri.gender,
            "sholat": prayer_time,
            "status": status,
            "waktu": time_str,
            "tanggal": today_str
        }

        msg = render_template(template, variables)
        await send_whatsapp(santri.parent_phone, msg)
    except Exception as e:
        logger.error(f"WhatsApp notification exception: {e}")



@router.post("/register")
async def register_face(data: FaceEnrollRequest, db: AsyncSession = Depends(get_db)):
    """Registers or updates face embedding for a Santri."""
    result = await db.execute(select(Santri).where(Santri.id == data.santri_id))
    santri = result.scalar_one_or_none()
    if not santri:
        raise HTTPException(status_code=404, detail="Santri tidak ditemukan")

    img_bgr = decode_base64_image(data.image_base64)
    if img_bgr is None:
        raise HTTPException(status_code=400, detail="Format gambar tidak valid atau gagal didecode")

    embedding, err = extract_face_embedding(img_bgr)
    if err:
        raise HTTPException(status_code=400, detail=err)

    # Check duplicate face across ALL other registered santri
    other_santri_res = await db.execute(
        select(Santri)
        .where(Santri.id != data.santri_id)
        .where(Santri.has_face_registered == True)
        .where(Santri.face_embedding.isnot(None))
    )
    other_santris = other_santri_res.scalars().all()

    if other_santris:
        other_tuples = [(s.id, s.face_embedding) for s in other_santris]
        matched_other_id, similarity = find_matching_santri(embedding, other_tuples, threshold=0.60)

        if matched_other_id:
            duplicate_santri = next((s for s in other_santris if s.id == matched_other_id), None)
            dup_name = duplicate_santri.name if duplicate_santri else "Santri Lain"
            dup_room = duplicate_santri.room if duplicate_santri else "-"
            confidence_pct = round(similarity * 100, 1)

            raise HTTPException(
                status_code=400,
                detail=f"Wajah ini sudah terdaftar atas nama santri lain: '{dup_name}' (Kamar: {dup_room}) dengan tingkat kemiripan {confidence_pct}%. Satu wajah tidak boleh didaftarkan ke santri yang berbeda!"
            )

    santri.face_embedding = json.dumps(embedding)
    santri.has_face_registered = True
    santri.face_registered_at = datetime.utcnow()

    await db.commit()
    await db.refresh(santri)

    return {
        "success": True,
        "santri_id": santri.id,
        "santri_name": santri.name,
        "message": f"Wajah santri {santri.name} berhasil terdaftar!"
    }


@router.post("/scan", response_model=FaceScanResponse)
async def scan_face(data: FaceScanRequest, db: AsyncSession = Depends(get_db)):
    """Scans a face frame and logs attendance for the active academic year."""
    # 1. Get active academic year
    ay_res = await db.execute(select(AcademicYear).where(AcademicYear.is_active == True))
    active_ay = ay_res.scalar_one_or_none()
    if not active_ay:
        return FaceScanResponse(
            matched=False,
            message="Tahun akademik aktif belum diatur di sistem."
        )

    # 2. Decode image and extract embedding
    img_bgr = decode_base64_image(data.image_base64)
    if img_bgr is None:
        return FaceScanResponse(
            matched=False,
            message="Gambar tidak terdeteksi / tidak valid."
        )

    target_vec, err = extract_face_embedding(img_bgr)
    if err or not target_vec:
        return FaceScanResponse(
            matched=False,
            message=err or "Wajah tidak terdeteksi pada kamera."
        )

    # 3. Fetch all registered santri embeddings
    santri_res = await db.execute(
        select(Santri.id, Santri.face_embedding)
        .where(Santri.has_face_registered == True)
        .where(Santri.face_embedding.isnot(None))
    )
    rows = santri_res.all()

    if not rows:
        return FaceScanResponse(
            matched=False,
            message="Belum ada data wajah santri yang terdaftar di sistem."
        )

    santri_tuples = [(row[0], row[1]) for row in rows]

    # 4. Perform vector similarity matching
    matched_id, similarity = find_matching_santri(target_vec, santri_tuples, threshold=0.60)

    if not matched_id:
        confidence_pct = round(similarity * 100, 1)
        return FaceScanResponse(
            matched=False,
            confidence=confidence_pct,
            message=f"Wajah tidak cocok dengan data manapun (Kemiripan tertinggi: {confidence_pct}%)."
        )

    # 5. Fetch matched Santri details
    matched_santri_res = await db.execute(select(Santri).where(Santri.id == matched_id))
    santri = matched_santri_res.scalar_one_or_none()
    if not santri:
        return FaceScanResponse(matched=False, message="Data santri terdeteksi namun tidak ditemukan.")

    today_date = date.today()
    confidence_pct = round(similarity * 100, 1)

    # 6. Check existing attendance record
    att_res = await db.execute(
        select(Attendance)
        .where(Attendance.santri_id == santri.id)
        .where(Attendance.date == today_date)
        .where(Attendance.prayer_time == data.prayer_time)
    )
    existing_att = att_res.scalar_one_or_none()

    if existing_att:
        scanned_str = existing_att.scanned_at.strftime("%H:%M") if existing_att.scanned_at else "-"
        return FaceScanResponse(
            matched=True,
            santri_id=santri.id,
            santri_name=santri.name,
            room=santri.room,
            confidence=confidence_pct,
            prayer_time=data.prayer_time,
            status=existing_att.status,
            scanned_at=scanned_str,
            message=f"{santri.name} sudah tercatat absensi ({existing_att.status}) pada jam {scanned_str}."
        )

    # 7. Create new Attendance record
    now_dt = datetime.now()
    new_att = Attendance(
        santri_id=santri.id,
        date=today_date,
        prayer_time=data.prayer_time,
        status="Hadir",
        method="Face",
        face_confidence=int(confidence_pct),
        scanned_at=now_dt,
        academic_year_id=active_ay.id
    )

    db.add(new_att)
    await db.commit()
    await db.refresh(new_att)

    time_str = now_dt.strftime("%H:%M:%S")

    # 8. Broadcast SSE event
    try:
        await sse_manager.broadcast("attendance_logged", {
            "id": new_att.id,
            "santri_id": santri.id,
            "santri_name": santri.name,
            "room": santri.room,
            "prayer_time": data.prayer_time,
            "status": "Hadir",
            "method": "Face",
            "confidence": confidence_pct,
            "scanned_at": time_str
        })
    except Exception as e:
        logger.error(f"SSE Broadcast failed: {e}")

    # 9. Trigger WhatsApp notification (async background safe)
    try:
        await send_single_whatsapp_notification(santri, data.prayer_time, "Hadir", time_str, db)
    except Exception as e:
        logger.error(f"WhatsApp notification failed: {e}")

    return FaceScanResponse(
        matched=True,
        santri_id=santri.id,
        santri_name=santri.name,
        room=santri.room,
        confidence=confidence_pct,
        prayer_time=data.prayer_time,
        status="Hadir",
        scanned_at=time_str,
        message=f"Berhasil! Absensi {santri.name} ({santri.room}) tercatat [Face Recognition]."
    )


@router.delete("/unregister/{santri_id}")
async def unregister_face(santri_id: int, db: AsyncSession = Depends(get_db)):
    """Removes face embedding for a specific santri."""
    result = await db.execute(select(Santri).where(Santri.id == santri_id))
    santri = result.scalar_one_or_none()
    if not santri:
        raise HTTPException(status_code=404, detail="Santri tidak ditemukan")

    santri.face_embedding = None
    santri.has_face_registered = False
    santri.face_registered_at = None

    await db.commit()
    return {"success": True, "message": f"Data wajah santri {santri.name} telah dihapus."}
