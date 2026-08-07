import os
import shutil
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import Setting, FingerprintLog
from ..schemas import SettingUpdate, SettingOut, PasswordVerify
from typing import List

logger = logging.getLogger("settings_router")

router = APIRouter(prefix="/api/settings", tags=["Settings"])


@router.get("", response_model=List[SettingOut])
async def get_settings(db: AsyncSession = Depends(get_db)):
    """Retrieve all app settings, inserting default values if not present."""
    default_settings = {
        "app_title": "MASTER ABSENSI Alhamid Cintamulya",
        "app_icon": "",
        "login_bg_image": "/login_bg.png",
        "prayer_change_password": "alhamidku123",
        "wa_api_token": "",
        "wa_api_url": "https://api.fonnte.com/send",
    }

    # Fetch existing from DB
    result = await db.execute(select(Setting))
    existing = {s.key: s.value for s in result.scalars().all()}

    # Populate missing defaults
    updated = False
    for k, v in default_settings.items():
        if k not in existing:
            setting = Setting(key=k, value=v)
            db.add(setting)
            existing[k] = v
            updated = True

    if updated:
        await db.commit()

    return [SettingOut(key=k, value=v) for k, v in existing.items()]


@router.put("/{key}", response_model=SettingOut)
async def update_setting(key: str, data: SettingUpdate, db: AsyncSession = Depends(get_db)):
    """Update a specific setting by key."""
    result = await db.execute(select(Setting).where(Setting.key == key))
    setting = result.scalar_one_or_none()
    if not setting:
        setting = Setting(key=key, value=data.value)
        db.add(setting)
    else:
        setting.value = data.value
    await db.commit()
    await db.refresh(setting)
    return setting


@router.post("/upload-icon")
async def upload_app_icon(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """Upload custom app icon image."""
    try:
        os.makedirs("backend/static/uploads", exist_ok=True)
        ext = os.path.splitext(file.filename)[1] or ".png"
        filename = f"app_icon{ext}"
        filepath = os.path.join("backend/static/uploads", filename)

        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        icon_url = f"/static/uploads/{filename}?t={int(datetime.now().timestamp())}"

        # Save to setting table
        res = await db.execute(select(Setting).where(Setting.key == "app_icon"))
        setting = res.scalar_one_or_none()
        if not setting:
            setting = Setting(key="app_icon", value=icon_url)
            db.add(setting)
        else:
            setting.value = icon_url
        await db.commit()

        return {"success": True, "icon_url": icon_url}
    except Exception as e:
        logger.error(f"Error uploading app icon: {e}")
        raise HTTPException(500, f"Gagal mengunggah ikon aplikasi: {e}")


@router.post("/upload-login-bg")
async def upload_login_bg(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """Upload custom background image for login page."""
    try:
        os.makedirs("backend/static/uploads", exist_ok=True)
        ext = os.path.splitext(file.filename)[1] or ".png"
        filename = f"login_bg{ext}"
        filepath = os.path.join("backend/static/uploads", filename)

        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        bg_url = f"/static/uploads/{filename}?t={int(datetime.now().timestamp())}"

        # Save to setting table
        res = await db.execute(select(Setting).where(Setting.key == "login_bg_image"))
        setting = res.scalar_one_or_none()
        if not setting:
            setting = Setting(key="login_bg_image", value=bg_url)
            db.add(setting)
        else:
            setting.value = bg_url
        await db.commit()

        return {"success": True, "bg_url": bg_url}
    except Exception as e:
        logger.error(f"Error uploading login background: {e}")
        raise HTTPException(500, f"Gagal mengunggah gambar latar login: {e}")


@router.post("/verify-password")
async def verify_password(data: PasswordVerify, db: AsyncSession = Depends(get_db)):
    """Verify security password for altering active prayer times manually."""
    result = await db.execute(select(Setting).where(Setting.key == "prayer_change_password"))
    setting = result.scalar_one_or_none()
    stored_password = setting.value if setting else "alhamidku123"

    if data.password == stored_password:
        return {"success": True, "message": "Password valid"}
    raise HTTPException(401, "Password keamanan salah!")


@router.get("/fingerprint-logs")
async def get_fingerprint_logs(db: AsyncSession = Depends(get_db), limit: int = 100):
    """Retrieve latest raw fingerprint logs for troubleshooting."""
    result = await db.execute(
        select(FingerprintLog)
        .order_by(FingerprintLog.scanned_at.desc())
        .limit(limit)
    )
    return result.scalars().all()
