from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from ..database import get_db, get_sekolah_db
from ..models import Santri, AcademicYear
from ..schemas import SantriCreate, SantriUpdate, SantriOut
from typing import List, Optional
import os
import time

router = APIRouter(prefix="/api/santri", tags=["Santri"])


# ── Internal Sync Helper ───────────────────────────────────────
async def sync_sekolah_info_internal(db: AsyncSession, sekolah_db: AsyncSession):
    # 1. Sync academic years from sekolah_info to local db
    years_query = text("SELECT id, kode, is_active FROM tahun_ajaran")
    years_result = await sekolah_db.execute(years_query)
    sekolah_years = years_result.fetchall()

    if not sekolah_years:
        return None

    sekolah_to_local_years = {}
    local_active_year = None

    for sy in sekolah_years:
        sy_id, sy_kode, sy_active = sy
        
        # Check if year exists locally by sekolah_info_year_id or name
        local_yr_query = select(AcademicYear).where(
            (AcademicYear.sekolah_info_year_id == sy_id) | (AcademicYear.name == sy_kode)
        )
        local_yr_result = await db.execute(local_yr_query)
        existing_yr = local_yr_result.scalar_one_or_none()

        if existing_yr:
            existing_yr.name = sy_kode
            existing_yr.is_active = sy_active
            existing_yr.sekolah_info_year_id = sy_id
            local_yr = existing_yr
        else:
            local_yr = AcademicYear(
                name=sy_kode,
                is_active=sy_active,
                sekolah_info_year_id=sy_id
            )
            db.add(local_yr)
            
        await db.flush() # Populate IDs
        sekolah_to_local_years[sy_id] = local_yr.id
        if sy_active:
            local_active_year = local_yr

    # Deactivate any other local academic years that are not active in sekolah_info
    if local_active_year:
        deactivate_query = select(AcademicYear).where(AcademicYear.id != local_active_year.id)
        deactivate_res = await db.execute(deactivate_query)
        for yr in deactivate_res.scalars().all():
            yr.is_active = False

    # Get active academic year ID from sekolah_info
    active_sy = next((y for y in sekolah_years if y[2]), None)
    if not active_sy or not local_active_year:
        return None
    
    active_sy_id, _, _ = active_sy

    # 2. Query students from sekolah_info active year
    student_query = text("""
        SELECT 
            sta.santri_id,
            sta.nama,
            sta.jenis_kelamin,
            k.nama as kamar_nama,
            sta.nama_ibu,
            sta.no_hp_ibu,
            s.foto_url
        FROM santri_tahun_ajaran sta
        JOIN santri s ON sta.santri_id = s.id
        LEFT JOIN kamar k ON sta.kamar_id = k.id
        WHERE sta.tahun_ajaran_id = :year_id
    """)
    student_result = await sekolah_db.execute(student_query, {"year_id": active_sy_id})
    sekolah_students = student_result.fetchall()

    imported_count = 0
    updated_count = 0
    sekolah_ids_in_active_year = set()

    for row in sekolah_students:
        si_id, name, gender, room, mother_name, mother_phone, photo_url = row
        sekolah_ids_in_active_year.add(si_id)

        # Map gender
        gender_mapped = "Putra"
        if gender:
            g_upper = gender.upper()
            if g_upper.startswith("P") or "PEREMPUAN" in g_upper or "PUTRI" in g_upper:
                gender_mapped = "Putri"

        # Map room
        room_mapped = room if room else "Tanpa Kamar"

        # Map parent_phone to mother_phone, fallback to empty string
        phone_mapped = mother_phone if mother_phone else ""

        # Check if student exists locally by sekolah_info_santri_id
        local_student_query = select(Santri).where(Santri.sekolah_info_santri_id == si_id)
        local_student_result = await db.execute(local_student_query)
        existing_student = local_student_result.scalar_one_or_none()

        if existing_student:
            # Update info, but DO NOT overwrite fingerprint_id or fingerprint_template
            existing_student.name = name
            existing_student.gender = gender_mapped
            existing_student.room = room_mapped
            existing_student.parent_phone = phone_mapped
            existing_student.mother_name = mother_name
            existing_student.photo_url = photo_url
            existing_student.academic_year_id = local_active_year.id
            updated_count += 1
        else:
            # Create new
            new_student = Santri(
                name=name,
                gender=gender_mapped,
                room=room_mapped,
                parent_phone=phone_mapped,
                mother_name=mother_name,
                photo_url=photo_url,
                sekolah_info_santri_id=si_id,
                academic_year_id=local_active_year.id
            )
            db.add(new_student)
            imported_count += 1

    # 3. Handle deletions: delete local synced students that no longer exist in sekolah-info active year
    if sekolah_ids_in_active_year:
        local_synced_query = select(Santri).where(
            (Santri.sekolah_info_santri_id != None) & 
            (~Santri.sekolah_info_santri_id.in_(list(sekolah_ids_in_active_year)))
        )
        local_synced_res = await db.execute(local_synced_query)
        deleted_local_students = local_synced_res.scalars().all()
        for s in deleted_local_students:
            await db.delete(s)

    await db.commit()
    return {
        "local_active_year": local_active_year,
        "imported": imported_count,
        "updated": updated_count
    }


@router.get("", response_model=List[SantriOut])
async def get_all(
    gender: Optional[str] = Query(None),
    room: Optional[str] = Query(None),
    academic_year_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    sekolah_db: AsyncSession = Depends(get_sekolah_db)
):
    # Automatically sync with sekolah_info database on each request to keep data 100% up-to-date
    try:
        await sync_sekolah_info_internal(db, sekolah_db)
    except Exception as e:
        # Log error but don't raise exception, allowing app to run offline using existing local data
        print(f"Automatic sync from sekolah-info failed/skipped: {e}")

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
            sekolah_info_santri_id=s.sekolah_info_santri_id,
            mother_name=s.mother_name,
            photo_url=s.photo_url,
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
        mother_name=data.mother_name,
        photo_url=data.photo_url,
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
        sekolah_info_santri_id=santri.sekolah_info_santri_id,
        mother_name=santri.mother_name,
        photo_url=santri.photo_url,
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
    if data.mother_name is not None:
        santri.mother_name = data.mother_name
    if data.photo_url is not None:
        santri.photo_url = data.photo_url
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
        sekolah_info_santri_id=santri.sekolah_info_santri_id,
        mother_name=santri.mother_name,
        photo_url=santri.photo_url,
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


# ── Photo Upload Endpoint ──────────────────────────────────────
@router.post("/{santri_id}/upload-photo", response_model=SantriOut)
async def upload_photo(santri_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Santri).where(Santri.id == santri_id))
    santri = result.scalar_one_or_none()
    if not santri:
        raise HTTPException(404, "Santri tidak ditemukan")
    
    try:
        contents = await file.read()
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in (".png", ".jpg", ".jpeg", ".webp"):
            raise HTTPException(400, "Format berkas foto tidak didukung (harus PNG, JPG, JPEG, atau WEBP)")
        
        filename = f"santri_manual_{santri_id}_{int(time.time())}{ext}"
        upload_dir = "backend/static/uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, filename)
        
        with open(file_path, "wb") as f:
            f.write(contents)
            
        relative_url = f"/static/uploads/{filename}"
        santri.photo_url = relative_url
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
            sekolah_info_santri_id=santri.sekolah_info_santri_id,
            mother_name=santri.mother_name,
            photo_url=santri.photo_url,
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(500, f"Gagal mengunggah foto: {str(e)}")


# ── Sync from sekolah-info Database Endpoint ──────────────────────
@router.post("/sync-sekolah-info")
async def sync_sekolah_info(
    db: AsyncSession = Depends(get_db),
    sekolah_db: AsyncSession = Depends(get_sekolah_db)
):
    try:
        res = await sync_sekolah_info_internal(db, sekolah_db)
    except Exception as e:
        raise HTTPException(500, f"Gagal sinkronisasi: {str(e)}")

    if not res:
        raise HTTPException(400, "Tidak ada data tahun ajaran aktif di database sekolah-info")

    local_active_year = res["local_active_year"]
    imported_count = res["imported"]
    updated_count = res["updated"]

    return {
        "status": "success", 
        "message": f"Sinkronisasi berhasil: {imported_count} santri baru ditambahkan, {updated_count} diperbarui. Tahun ajaran aktif '{local_active_year.name}' telah disinkronkan dari sekolah-info.",
        "imported": imported_count,
        "updated": updated_count
    }
