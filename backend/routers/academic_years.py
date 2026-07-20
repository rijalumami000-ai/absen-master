from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from ..database import get_db
from ..models import AcademicYear
from ..schemas import AcademicYearCreate, AcademicYearOut
from typing import List

router = APIRouter(prefix="/api/academic-years", tags=["Academic Years"])


@router.get("", response_model=List[AcademicYearOut])
async def get_all(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AcademicYear).order_by(AcademicYear.id.desc()))
    return result.scalars().all()


@router.post("", response_model=AcademicYearOut, status_code=201)
async def create(data: AcademicYearCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(AcademicYear).where(AcademicYear.name == data.name))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Tahun ajaran sudah ada")
    year = AcademicYear(name=data.name, is_active=False)
    db.add(year)
    await db.commit()
    await db.refresh(year)
    return year


@router.put("/{year_id}/activate", response_model=AcademicYearOut)
async def activate(year_id: int, db: AsyncSession = Depends(get_db)):
    # Deactivate all
    await db.execute(update(AcademicYear).values(is_active=False))
    # Activate selected
    result = await db.execute(select(AcademicYear).where(AcademicYear.id == year_id))
    year = result.scalar_one_or_none()
    if not year:
        raise HTTPException(404, "Tahun ajaran tidak ditemukan")
    year.is_active = True
    await db.commit()
    await db.refresh(year)
    return year


@router.delete("/{year_id}")
async def delete(year_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AcademicYear).where(AcademicYear.id == year_id))
    year = result.scalar_one_or_none()
    if not year:
        raise HTTPException(404, "Tahun ajaran tidak ditemukan")
    if year.is_active:
        raise HTTPException(400, "Tidak bisa menghapus tahun ajaran aktif")
    await db.delete(year)
    await db.commit()
    return {"message": "Tahun ajaran dihapus"}
