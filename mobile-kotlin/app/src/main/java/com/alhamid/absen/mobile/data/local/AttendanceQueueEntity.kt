package com.alhamid.absen.mobile.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "attendance_queue")
data class AttendanceQueueEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val santriId: Int,
    val date: String,
    val prayerTime: String,
    val status: String,
    val method: String,
    val scannedAt: String,
    val academicYearId: Int?
)
