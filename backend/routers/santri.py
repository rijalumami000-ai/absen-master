from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import Santri, AcademicYear
from ..schemas import SantriCreate, SantriUpdate, SantriOut
from typing import List, Optional

router = APIRouter(prefix="/api/santri", tags=["Santri"])


@router.get("", response_model=List[SantriOut])
async def get_all(
    gender: Optional[str] = Query(None),
    room: Optional[str] = Query(None),
    academic_year_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Santri)
    if gender:
        query = query.where(Santri.gender == gender)
    if room:
        query = query.where(Santri.room == room)
    if academic_year_id:
        query = query.where(Santri.academic_year_id == academic_year_id)
    query = query.order_by(Santri.name)
    result = await db.execute(query)
    rows = result.scalars().all()
    out = []
    for s in rows:
        item = SantriOut(
            id=s.id,
            name=s.name,
            gender=s.gender,
            room=s.room,
            parent_phone=s.parent_phone,
            fingerprint_id=s.fingerprint_id,
            has_fingerprint=s.fingerprint_id is not None,
            academic_year_id=s.academic_year_id,
        )
        out.append(item)
    return out


@router.post("", response_model=SantriOut, status_code=201)
async def create(data: SantriCreate, db: AsyncSession = Depends(get_db)):
    if data.gender not in ("Putra", "Putri"):
        raise HTTPException(400, "Gender harus 'Putra' atau 'Putri'")

    # If no academic_year_id provided, use the active one
    ay_id = data.academic_year_id
    if not ay_id:
        result = await db.execute(select(AcademicYear).where(AcademicYear.is_active == True))
        active_year = result.scalar_one_or_none()
        if active_year:
            ay_id = active_year.id

    santri = Santri(
        name=data.name,
        gender=data.gender,
        room=data.room,
        parent_phone=data.parent_phone,
        academic_year_id=ay_id,
    )
    db.add(santri)
    await db.commit()
    await db.refresh(santri)
    return SantriOut(
        id=santri.id,
        name=santri.name,
        gender=santri.gender,
        room=santri.room,
        parent_phone=santri.parent_phone,
        fingerprint_id=santri.fingerprint_id,
        has_fingerprint=False,
        academic_year_id=santri.academic_year_id,
    )


@router.put("/{santri_id}", response_model=SantriOut)
async def update_santri(santri_id: int, data: SantriUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Santri).where(Santri.id == santri_id))
    santri = result.scalar_one_or_none()
    if not santri:
        raise HTTPException(404, "Santri tidak ditemukan")
    if data.name is not None:
        santri.name = data.name
    if data.gender is not None:
        if data.gender not in ("Putra", "Putri"):
            raise HTTPException(400, "Gender harus 'Putra' atau 'Putri'")
        santri.gender = data.gender
    if data.room is not None:
        santri.room = data.room
    if data.parent_phone is not None:
        santri.parent_phone = data.parent_phone
    if data.academic_year_id is not None:
        santri.academic_year_id = data.academic_year_id
    await db.commit()
    await db.refresh(santri)
    return SantriOut(
        id=santri.id,
        name=santri.name,
        gender=santri.gender,
        room=santri.room,
        parent_phone=santri.parent_phone,
        fingerprint_id=santri.fingerprint_id,
        has_fingerprint=santri.fingerprint_id is not None,
        academic_year_id=santri.academic_year_id,
    )


@router.delete("/{santri_id}")
async def delete_santri(santri_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Santri).where(Santri.id == santri_id))
    santri = result.scalar_one_or_none()
    if not santri:
        raise HTTPException(404, "Santri tidak ditemukan")
    await db.delete(santri)
    await db.commit()
    return {"message": f"Santri '{santri.name}' dihapus"}


@router.get("/rooms", response_model=List[str])
async def get_rooms(db: AsyncSession = Depends(get_db)):
    """Get all unique room names."""
    result = await db.execute(select(Santri.room).distinct().order_by(Santri.room))
    return [row[0] for row in result.all()]
