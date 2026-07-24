package com.alhamid.absen.mobile.data.remote

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import java.util.concurrent.TimeUnit

interface ApiService {

    @GET("santri")
    suspend fun getSantriList(): Response<List<SantriDto>>

    @GET("fingerprint/templates")
    suspend fun getFingerprintTemplates(): Response<List<FingerprintTemplateDto>>

    @POST("attendance/manual")
    suspend fun postAttendance(@Body request: AttendanceRequest): Response<Unit>

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
