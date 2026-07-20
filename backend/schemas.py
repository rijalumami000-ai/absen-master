from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel


# ── Academic Year ──────────────────────────────────────────────
class AcademicYearCreate(BaseModel):
    name: str

class AcademicYearOut(BaseModel):
    id: int
    name: str
    is_active: bool
    class Config:
        from_attributes = True


# ── Santri ─────────────────────────────────────────────────────
class SantriCreate(BaseModel):
    name: str
    gender: str  # "Putra" | "Putri"
    room: str
    parent_phone: str
    academic_year_id: Optional[int] = None

class SantriUpdate(BaseModel):
    name: Optional[str] = None
    gender: Optional[str] = None
    room: Optional[str] = None
    parent_phone: Optional[str] = None
    academic_year_id: Optional[int] = None

class SantriOut(BaseModel):
    id: int
    name: str
    gender: str
    room: str
    parent_phone: str
    fingerprint_id: Optional[str] = None
    has_fingerprint: bool = False
    academic_year_id: Optional[int] = None
    class Config:
        from_attributes = True


# ── Attendance ─────────────────────────────────────────────────
class AttendanceManualItem(BaseModel):
    santri_id: int
    status: str  # Hadir, Sakit, Izin, Alfa, Masbuq, Haid, Istihadhoh

class AttendanceManualRequest(BaseModel):
    prayer_time: str
    date: Optional[str] = None  # "YYYY-MM-DD", default today
    items: List[AttendanceManualItem]

class AttendanceOut(BaseModel):
    id: int
    santri_id: int
    santri_name: Optional[str] = None
    santri_gender: Optional[str] = None
    santri_room: Optional[str] = None
    date: date
    prayer_time: str
    status: str
    method: str
    scanned_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# ── Fingerprint ────────────────────────────────────────────────
class FingerprintScanRequest(BaseModel):
    fingerprint_id: str
    prayer_time: Optional[str] = None
    score: Optional[int] = None

class FingerprintEnrollRequest(BaseModel):
    fingerprint_id: str
    template_data: str

class FingerprintStartEnrollRequest(BaseModel):
    santri_id: int

class FingerprintTemplateOut(BaseModel):
    santri_id: int
    fingerprint_id: str
    template_data: str
    class Config:
        from_attributes = True


# ── Rekap ──────────────────────────────────────────────────────
class RekapQuery(BaseModel):
    prayer_time: Optional[str] = None
    status: Optional[str] = None
    month: Optional[int] = None
    year: Optional[int] = None
    room: Optional[str] = None
    gender: Optional[str] = None
    academic_year_id: Optional[int] = None

class RekapSummary(BaseModel):
    total: int
    hadir: int
    sakit: int
    izin: int
    alfa: int
    masbuq: int
    haid: int
    istihadhoh: int


# ── WhatsApp ───────────────────────────────────────────────────
class WATemplateUpdate(BaseModel):
    template: str

class WASendRequest(BaseModel):
    santri_ids: List[int]
    prayer_time: str
    date: Optional[str] = None

class WAPreviewRequest(BaseModel):
    santri_id: int
    prayer_time: str
    date: Optional[str] = None


# ── Settings ───────────────────────────────────────────────────
class SettingUpdate(BaseModel):
    value: str

class SettingOut(BaseModel):
    key: str
    value: str
    class Config:
        from_attributes = True


# ── Auth ───────────────────────────────────────────────────────
class PasswordVerify(BaseModel):
    password: str
