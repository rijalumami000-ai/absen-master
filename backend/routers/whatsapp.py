from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import Setting, Santri, Attendance, AcademicYear
from ..schemas import WATemplateUpdate, WASendRequest, WAPreviewRequest
from ..services.wa_sender import send_whatsapp, render_template
from datetime import date, datetime
from typing import List

router = APIRouter(prefix="/api/wa", tags=["WhatsApp Laporan"])


@router.get("/template")
async def get_template(db: AsyncSession = Depends(get_db)):
    """Retrieve the stored WhatsApp message template."""
    result = await db.execute(select(Setting).where(Setting.key == "wa_template"))
    setting = result.scalar_one_or_none()
    
    default_tpl = (
        "Assalamu'alaikum, Bapak/Ibu Wali dari {nama} ({kamar}).\n\n"
        "Laporan absensi sholat hari {tanggal}:\n"
        "Sholat {sholat}: *{status}*\n\n"
        "Terimakasih.\n- Pesantren Al-Hamid"
    )
    
    if not setting:
        return {"template": default_tpl}
    return {"template": setting.value}


@router.put("/template")
async def update_template(data: WATemplateUpdate, db: AsyncSession = Depends(get_db)):
    """Save a customized WhatsApp template."""
    result = await db.execute(select(Setting).where(Setting.key == "wa_template"))
    setting = result.scalar_one_or_none()
    
    if setting:
        setting.value = data.template
    else:
        setting = Setting(key="wa_template", value=data.template)
        db.add(setting)
        
    await db.commit()
    return {"message": "Template pesan berhasil diperbarui", "template": data.template}


@router.get("/placeholders")
async def get_placeholders():
    """Retrieve supported placeholders for custom messaging templates."""
    return {
        "placeholders": [
            {"key": "{nama}", "desc": "Nama Santri"},
            {"key": "{status}", "desc": "Status Kehadiran (Hadir, Alfa, Sakit, etc.)"},
            {"key": "{sholat}", "desc": "Waktu Sholat (Subuh, Dzuhur, etc.)"},
            {"key": "{tanggal}", "desc": "Tanggal Absensi"},
            {"key": "{kamar}", "desc": "Nama Kamar Santri"},
            {"key": "{gender}", "desc": "Jenis Kelamin (Putra/Putri)"}
        ]
    }


@router.post("/preview")
async def preview_message(data: WAPreviewRequest, db: AsyncSession = Depends(get_db)):
    """Render a message preview for a specific santri and prayer time."""
    # Get template
    tpl_res = await db.execute(select(Setting).where(Setting.key == "wa_template"))
    tpl_setting = tpl_res.scalar_one_or_none()
    template = tpl_setting.value if tpl_setting else (
        "Assalamu'alaikum, Bapak/Ibu Wali dari {nama} ({kamar}).\n\n"
        "Laporan absensi sholat hari {tanggal}:\n"
        "Sholat {sholat}: *{status}*\n\n"
        "Terimakasih.\n- Pesantren Al-Hamid"
    )

    # Get Santri details
    santri_res = await db.execute(select(Santri).where(Santri.id == data.santri_id))
    santri = santri_res.scalar_one_or_none()
    if not santri:
        raise HTTPException(404, "Santri tidak ditemukan")

    target_date = date.today()
    if data.date:
        try:
            target_date = datetime.strptime(data.date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(400, "Format tanggal salah. Gunakan YYYY-MM-DD")

    # Get attendance status
    att_res = await db.execute(
        select(Attendance)
        .where(Attendance.santri_id == santri.id)
        .where(Attendance.date == target_date)
        .where(Attendance.prayer_time == data.prayer_time)
    )
    att = att_res.scalar_one_or_none()
    status_str = att.status if att else "Belum Absen / Alfa"

    variables = {
        "nama": santri.name,
        "kamar": santri.room,
        "gender": santri.gender,
        "sholat": data.prayer_time,
        "tanggal": target_date.strftime("%d-%m-%Y"),
        "status": status_str
    }

    message = render_template(template, variables)
    return {
        "santri_id": santri.id,
        "parent_phone": santri.parent_phone,
        "message": message
    }


@router.post("/send")
async def send_bulk_whatsapp(data: WASendRequest, db: AsyncSession = Depends(get_db)):
    """Send generated reports to multiple guardians in parallel/sequence."""
    # Load WhatsApp Gateway Token
    token_res = await db.execute(select(Setting).where(Setting.key == "wa_api_token"))
    token_setting = token_res.scalar_one_or_none()
    
    # Also load from environment variables if not set in DB
    token = token_setting.value if token_setting else ""
    
    # Get template
    tpl_res = await db.execute(select(Setting).where(Setting.key == "wa_template"))
    tpl_setting = tpl_res.scalar_one_or_none()
    template = tpl_setting.value if tpl_setting else (
        "Assalamu'alaikum, Bapak/Ibu Wali dari {nama} ({kamar}).\n\n"
        "Laporan absensi sholat hari {tanggal}:\n"
        "Sholat {sholat}: *{status}*\n\n"
        "Terimakasih.\n- Pesantren Al-Hamid"
    )

    target_date = date.today()
    if data.date:
        try:
            target_date = datetime.strptime(data.date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(400, "Format tanggal salah. Gunakan YYYY-MM-DD")

    results = []
    success_count = 0

    for s_id in data.santri_ids:
        # Get Santri details
        s_res = await db.execute(select(Santri).where(Santri.id == s_id))
        santri = s_res.scalar_one_or_none()
        if not santri:
            results.append({"santri_id": s_id, "success": False, "error": "Santri tidak ditemukan"})
            continue

        # Get attendance status
        att_res = await db.execute(
            select(Attendance)
            .where(Attendance.santri_id == santri.id)
            .where(Attendance.date == target_date)
            .where(Attendance.prayer_time == data.prayer_time)
        )
        att = att_res.scalar_one_or_none()
        status_str = att.status if att else "Belum Absen / Alfa"

        variables = {
            "nama": santri.name,
            "kamar": santri.room,
            "gender": santri.gender,
            "sholat": data.prayer_time,
            "tanggal": target_date.strftime("%d-%m-%Y"),
            "status": status_str
        }

        rendered = render_template(template, variables)
        
        # Trigger sending
        res = await send_whatsapp(santri.parent_phone, rendered)
        if res.get("success"):
            success_count += 1
            results.append({"santri_id": s_id, "santri_name": santri.name, "success": True})
        else:
            results.append({"santri_id": s_id, "santri_name": santri.name, "success": False, "error": res.get("error")})

    return {
        "total_attempted": len(data.santri_ids),
        "success_count": success_count,
        "results": results
    }
