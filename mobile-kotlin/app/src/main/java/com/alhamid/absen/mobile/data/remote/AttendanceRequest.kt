package com.alhamid.absen.mobile.data.remote

import com.google.gson.annotations.SerializedName

data class AttendanceRequest(
    @SerializedName("prayer_time") val prayerTime: String,
    val date: String,
    val items: List<AttendanceItem>
)

data class AttendanceItem(
    @SerializedName("santri_id") val santriId: Int,
    val status: String
)
