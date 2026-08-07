package com.alhamid.absen.mobile.data.remote

import com.google.gson.annotations.SerializedName
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import java.util.concurrent.TimeUnit

data class FaceScanRequestDto(
    @SerializedName("image_base64") val imageBase64: String,
    @SerializedName("prayer_time") val prayerTime: String
)

data class FaceScanResponseDto(
    val matched: Boolean,
    val message: String,
    @SerializedName("santri_name") val santriName: String? = null,
    @SerializedName("santri_room") val santriRoom: String? = null,
    @SerializedName("santri_gender") val santriGender: String? = null,
    @SerializedName("photo_url") val photoUrl: String? = null,
    val time: String? = null,
    val confidence: Double? = null
)

interface ApiService {

    @GET("santri")
    suspend fun getSantriList(): Response<List<SantriDto>>

    @GET("fingerprint/templates")
    suspend fun getFingerprintTemplates(): Response<List<FingerprintTemplateDto>>

    @POST("attendance/manual")
    suspend fun postAttendance(@Body request: AttendanceRequest): Response<Unit>

    @POST("face/scan_face")
    suspend fun scanFace(@Body request: FaceScanRequestDto): Response<FaceScanResponseDto>

    companion object {
        private const val BASE_URL = "https://absen.alhamidcintamulya.my.id/api/"

        fun create(): ApiService {
            val logger = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            val client = OkHttpClient.Builder()
                .addInterceptor(logger)
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .build()

            return Retrofit.Builder()
                .baseUrl(BASE_URL)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(ApiService::class.java)
        }
    }
}
