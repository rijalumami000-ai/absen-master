from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract
from ..database import get_db
from ..models import Attendance, Santri, AcademicYear
from ..schemas import AttendanceOut, RekapSummary
from datetime import date
from typing import List, Optional

router = APIRouter(prefix="/api/rekap", tags=["Rekap"])


@router.get("", response_model=List[AttendanceOut])
async def get_rekap(
    prayer_time: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    room: Optional[str] = Query(None),
    gender: Optional[str] = Query(None),
    academic_year_id: Optional[int] = Query(None),
    date_str: Optional[str] = Query(None, alias="date"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve detailed attendance records filtered by various criteria."""
    query = (
        select(Attendance, Santri.name, Santri.gender, Santri.room)
        .join(Santri, Attendance.santri_id == Santri.id)
    )

    conditions = []
    if prayer_time:
        conditions.append(Attendance.prayer_time == prayer_time)
    if status:
        conditions.append(Attendance.status == status)
    if room:
        conditions.append(Santri.room == room)
    if gender:
        conditions.append(Santri.gender == gender)
    if academic_year_id:
        conditions.append(Attendance.academic_year_id == academic_year_id)
    else:
        # Default to active year if no year is selected and no other filters override
        active_yr_res = await db.execute(select(AcademicYear).where(AcademicYear.is_active == True))
        active_yr = active_yr_res.scalar_one_or_none()
        if active_yr:
            conditions.append(Attendance.academic_year_id == active_yr.id)

    if date_str:
        from datetime import datetime
        try:
            parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            conditions.append(Attendance.date == parsed_date)
        except ValueError:
            pass

    if month:
        conditions.append(extract("month", Attendance.date) == month)
    if year:
        conditions.append(extract("year", Attendance.date) == year)

    if conditions:
        query = query.where(and_(*conditions))

    query = query.order_by(Attendance.date.desc(), Santri.name)
    result = await db.execute(query)

    out = []
    for row in result.all():
        att, name, gen, room_name = row
        out.append(
            AttendanceOut(
                id=att.id,
                santri_id=att.santri_id,
                santri_name=name,
                santri_gender=gen,
                santri_room=room_name,
                date=att.date,
                prayer_time=att.prayer_time,
                status=att.status,
                method=att.method,
                scanned_at=att.scanned_at,
            )
        )
    return out


@router.get("/summary", response_model=RekapSummary)
async def get_rekap_summary(
    prayer_time: Optional[str] = Query(None),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    room: Optional[str] = Query(None),
    gender: Optional[str] = Query(None),
    academic_year_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve statistical aggregations (totals by presence status) based on filters."""
    # Find base active academic year
    active_year_id = academic_year_id
    if not active_year_id:
        active_yr_res = await db.execute(select(AcademicYear).where(AcademicYear.is_active == True))
        active_yr = active_yr_res.scalar_one_or_none()
        if active_yr:
            active_year_id = active_yr.id

    query = select(Attendance.status, func.count(Attendance.id)).join(Santri, Attendance.santri_id == Santri.id)

    conditions = []
    if active_year_id:
        conditions.append(Attendance.academic_year_id == active_year_id)
    if prayer_time:
        conditions.append(Attendance.prayer_time == prayer_time)
    if room:
        conditions.append(Santri.room == room)
    if gender:
        conditions.append(Santri.gender == gender)
    if month:
        conditions.append(extract("month", Attendance.date) == month)
    if year:
        conditions.append(extract("year", Attendance.date) == year)

    if conditions:
        query = query.where(and_(*conditions))

    query = query.group_by(Attendance.status)
    result = await db.execute(query)

    counts = {
        "Hadir": 0,
        "Sakit": 0,
        "Izin": 0,
        "Alfa": 0,
        "Masbuq": 0,
        "Haid": 0,
        "Istihadhoh": 0,
    }

    total = 0
    for row in result.all():
        status_name, count = row
        if status_name in counts:
            counts[status_name] = count
            total += count

    return RekapSummary(
        total=total,
        hadir=counts["Hadir"],
        sakit=counts["Sakit"],
        izin=counts["Izin"],
        alfa=counts["Alfa"],
        masbuq=counts["Masbuq"],
        haid=counts["Haid"],
        istihadhoh=counts["Istihadhoh"],
    )
