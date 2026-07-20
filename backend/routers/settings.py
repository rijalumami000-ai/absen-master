from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import Setting, FingerprintLog
from ..schemas import SettingUpdate, SettingOut, PasswordVerify
from typing import List

router = APIRouter(prefix="/api/settings", tags=["Settings"])


@router.get("", response_model=List[SettingOut])
async def get_settings(db: AsyncSession = Depends(get_db)):
    """Retrieve all app settings, inserting default values if not present."""
    default_settings = {
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
