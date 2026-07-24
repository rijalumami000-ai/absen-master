package com.alhamid.absen.mobile.data.remote

import com.google.gson.annotations.SerializedName

data class SantriDto(
    val id: Int,
    val name: String,
    val gender: String,
    val room: String,
    @SerializedName("fingerprint_id") val fingerprintId: String?,
    @SerializedName("academic_year_id") val academicYearId: Int?,
    @SerializedName("photo_url") val photoUrl: String?
)
