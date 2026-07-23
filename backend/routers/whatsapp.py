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
        "Laporan absensi sholat 24 Jam ({tanggal}):\n"
        "- Subuh: *{subuh}*\n"
        "- Dzuhur: *{dzuhur}*\n"
        "- Ashar: *{ashar}*\n"
        "- Maghrib: *{maghrib}*\n"
        "- Isya: *{isya}*\n\n"
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
            {"key": "{kamar}", "desc": "Nama Kamar Santri"},
            {"key": "{gender}", "desc": "Jenis Kelamin (Putra/Putri)"},
            {"key": "{tanggal}", "desc": "Tanggal Laporan Absensi"},
            {"key": "{subuh}", "desc": "Status Sholat Subuh"},
            {"key": "{dzuhur}", "desc": "Status Sholat Dzuhur"},
            {"key": "{ashar}", "desc": "Status Sholat Ashar"},
            {"key": "{maghrib}", "desc": "Status Sholat Maghrib"},
            {"key": "{isya}", "desc": "Status Sholat Isya"},
        ]
    }


@router.post("/preview")
async def preview_message(data: WAPreviewRequest, db: AsyncSession = Depends(get_db)):
    """Render a message preview for a specific santri across the 24-hour cycle."""
    # Get template
    tpl_res = await db.execute(select(Setting).where(Setting.key == "wa_template"))
    tpl_setting = tpl_res.scalar_one_or_none()
    template = tpl_setting.value if tpl_setting else (
        "Assalamu'alaikum, Bapak/Ibu Wali dari {nama} ({kamar}).\n\n"
        "Laporan absensi sholat 24 Jam ({tanggal}):\n"
        "- Subuh: *{subuh}*\n"
        "- Dzuhur: *{dzuhur}*\n"
        "- Ashar: *{ashar}*\n"
        "- Maghrib: *{maghrib}*\n"
        "- Isya: *{isya}*\n\n"
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

    # Get attendance status for all 5 prayers on target_date
    att_res = await db.execute(
        select(Attendance)
        .where(Attendance.santri_id == santri.id)
        .where(Attendance.date == target_date)
    )
    attendances = att_res.scalars().all()
    att_map = {a.prayer_time: a.status for a in attendances}

    subuh_st = att_map.get("Subuh", "Alfa")
    dzuhur_st = att_map.get("Dzuhur", "Alfa")
    ashar_st = att_map.get("Ashar", "Alfa")
    maghrib_st = att_map.get("Maghrib", "Alfa")
    isya_st = att_map.get("Isya", "Alfa")

    variables = {
        "nama": santri.name,
        "kamar": santri.room,
        "gender": santri.gender,
        "tanggal": target_date.strftime("%d-%m-%Y"),
        "subuh": subuh_st,
        "dzuhur": dzuhur_st,
        "ashar": ashar_st,
        "maghrib": maghrib_st,
        "isya": isya_st,
        "status": f"Subuh: {subuh_st}, Dzuhur: {dzuhur_st}, Ashar: {ashar_st}, Maghrib: {maghrib_st}, Isya: {isya_st}",
        "sholat": "Full 24 Jam"
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
        "Laporan absensi sholat 24 Jam ({tanggal}):\n"
        "- Subuh: *{subuh}*\n"
        "- Dzuhur: *{dzuhur}*\n"
        "- Ashar: *{ashar}*\n"
        "- Maghrib: *{maghrib}*\n"
        "- Isya: *{isya}*\n\n"
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

        # Skip if no parent phone number
        if not santri.parent_phone or not santri.parent_phone.strip():
            results.append({"santri_id": s_id, "santri_name": santri.name, "success": False, "error": "Tidak ada nomor HP wali santri"})
            continue

        # Get attendance status for all 5 prayers on target_date
        att_res = await db.execute(
            select(Attendance)
            .where(Attendance.santri_id == santri.id)
            .where(Attendance.date == target_date)
        )
        attendances = att_res.scalars().all()
        att_map = {a.prayer_time: a.status for a in attendances}

        subuh_st = att_map.get("Subuh", "Alfa")
        dzuhur_st = att_map.get("Dzuhur", "Alfa")
        ashar_st = att_map.get("Ashar", "Alfa")
        maghrib_st = att_map.get("Maghrib", "Alfa")
        isya_st = att_map.get("Isya", "Alfa")

        variables = {
            "nama": santri.name,
            "kamar": santri.room,
            "gender": santri.gender,
            "tanggal": target_date.strftime("%d-%m-%Y"),
            "subuh": subuh_st,
            "dzuhur": dzuhur_st,
            "ashar": ashar_st,
            "maghrib": maghrib_st,
            "isya": isya_st,
            "status": f"Subuh: {subuh_st}, Dzuhur: {dzuhur_st}, Ashar: {ashar_st}, Maghrib: {maghrib_st}, Isya: {isya_st}",
            "sholat": "Full 24 Jam"
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
