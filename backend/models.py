from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Boolean, Text, Date, DateTime,
    ForeignKey, UniqueConstraint, CheckConstraint
)
from sqlalchemy.orm import relationship
from .database import Base


class AcademicYear(Base):
    __tablename__ = "academic_years"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    santri_list = relationship("Santri", back_populates="academic_year")
    attendance_list = relationship("Attendance", back_populates="academic_year")


class Santri(Base):
    __tablename__ = "santri"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    gender = Column(String(10), CheckConstraint("gender IN ('Putra', 'Putri')"), nullable=False)
    room = Column(String(100), nullable=False)
    parent_phone = Column(String(20), nullable=False)
    fingerprint_id = Column(String(50), unique=True, nullable=True)
    fingerprint_template = Column(Text, nullable=True)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    academic_year = relationship("AcademicYear", back_populates="santri_list")
    attendance_list = relationship("Attendance", back_populates="santri", cascade="all, delete-orphan")


class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint("santri_id", "date", "prayer_time", name="unique_santri_prayer_date"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    santri_id = Column(Integer, ForeignKey("santri.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False, default=date.today)
    prayer_time = Column(
        String(20),
        CheckConstraint("prayer_time IN ('Subuh','Dzuhur','Ashar','Maghrib','Isya')"),
        nullable=False,
    )
    status = Column(
        String(20),
        CheckConstraint("status IN ('Hadir','Sakit','Izin','Alfa','Masbuq','Haid','Istihadhoh')"),
        nullable=False,
    )
    method = Column(
        String(20),
        CheckConstraint("method IN ('Fingerprint','Manual')"),
        nullable=False,
    )
    scanned_at = Column(DateTime, nullable=True)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    santri = relationship("Santri", back_populates="attendance_list")
    academic_year = relationship("AcademicYear", back_populates="attendance_list")


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FingerprintLog(Base):
    __tablename__ = "fingerprint_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    fingerprint_id = Column(String(50), nullable=False)
    santri_name = Column(String(150), nullable=True)
    score = Column(Integer, nullable=True)
    status = Column(String(50), nullable=True)
    scanned_at = Column(DateTime, default=datetime.utcnow)
