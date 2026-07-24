package com.alhamid.absen.mobile.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "santri")
data class SantriEntity(
    @PrimaryKey val id: Int,
    val name: String,
    val gender: String,
    val room: String,
    val fingerprintId: String?,
    val fingerprintTemplate: String?,
    val academicYearId: Int?,
    val photoUrl: String?
)
