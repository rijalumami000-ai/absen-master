package com.alhamid.absen.mobile.data.remote

import com.google.gson.annotations.SerializedName

data class FingerprintTemplateDto(
    @SerializedName("santri_id") val santriId: Int,
    @SerializedName("fingerprint_id") val fingerprintId: String,
    @SerializedName("template_data") val templateData: String
)
