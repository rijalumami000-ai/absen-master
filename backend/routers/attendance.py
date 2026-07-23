from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from ..database import get_db
from ..models import Attendance, Santri, AcademicYear
from ..schemas import AttendanceManualRequest, AttendanceOut
from ..services.sse import sse_manager
from sse_starlette.sse import EventSourceResponse
from datetime import date, datetime, timezone, timedelta
from typing import List, Optional

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


@router.get("/today", response_model=List[AttendanceOut])
async def get_today_attendance(
    prayer_time: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve today's attendance logs for the dashboard feed."""
    today = date.today()
    query = (
        select(Attendance, Santri.name, Santri.gender, Santri.room)
        .join(Santri, Attendance.santri_id == Santri.id)
        .where(Attendance.date == today)
    )
    if prayer_time:
        query = query.where(Attendance.prayer_time == prayer_time)
    
    query = query.order_by(Attendance.created_at.desc())
    result = await db.execute(query)
    
    out = []
    for row in result.all():
        att, name, gen, room = row
        out.append(
            AttendanceOut(
                id=att.id,
                santri_id=att.santri_id,
                santri_name=name,
                santri_gender=gen,
                santri_room=room,
                date=att.date,
                prayer_time=att.prayer_time,
                status=att.status,
                method=att.method,
                scanned_at=att.scanned_at,
            )
        )
    return out


@router.post("/manual")
async def save_manual_attendance(data: AttendanceManualRequest, db: AsyncSession = Depends(get_db)):
    """Save or update attendance manually for a batch of santri."""
    # Find active academic year
    ay_res = await db.execute(select(AcademicYear).where(AcademicYear.is_active == True))
    active_year = ay_res.scalar_one_or_none()
    if not active_year:
        raise HTTPException(400, "Tahun ajaran aktif belum ditentukan. Hubungi admin.")

    target_date = date.today()
    if data.date:
        try:
            target_date = datetime.strptime(data.date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(400, "Format tanggal salah. Gunakan YYYY-MM-DD")

    saved_count = 0
    for item in data.items:
        # Check if attendance already exists
        att_res = await db.execute(
            select(Attendance)
            .where(Attendance.santri_id == item.santri_id)
            .where(Attendance.date == target_date)
            .where(Attendance.prayer_time == data.prayer_time)
        )
        existing = att_res.scalar_one_or_none()

        if existing:
            # Update status
            existing.status = item.status
            existing.method = "Manual"
            existing.scanned_at = datetime.utcnow() + timedelta(hours=7)
        else:
            # Create new record
            new_att = Attendance(
                santri_id=item.santri_id,
                date=target_date,
                prayer_time=data.prayer_time,
                status=item.status,
                method="Manual",
                scanned_at=datetime.utcnow() + timedelta(hours=7),
                academic_year_id=active_year.id,
            )
            db.add(new_att)
        saved_count += 1

    await db.commit()
    return {"message": f"Berhasil mencatat {saved_count} data absensi secara manual"}


@router.get("/stream")
async def stream_attendance():
    """SSE streaming endpoint for pushing live attendance scan/enroll alerts to the client."""
    return EventSourceResponse(sse_manager.subscribe())
