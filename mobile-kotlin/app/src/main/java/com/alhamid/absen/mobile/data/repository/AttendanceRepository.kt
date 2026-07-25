package com.alhamid.absen.mobile.data.repository

import android.content.Context
import android.util.Log
import com.alhamid.absen.mobile.data.local.AppDatabase
import com.alhamid.absen.mobile.data.local.AttendanceQueueEntity
import com.alhamid.absen.mobile.data.local.SantriEntity
import com.alhamid.absen.mobile.data.remote.ApiService
import com.alhamid.absen.mobile.data.remote.AttendanceItem
import com.alhamid.absen.mobile.data.remote.AttendanceRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AttendanceRepository(context: Context) {
    private val db = AppDatabase.getDatabase(context)
    private val santriDao = db.santriDao()
    private val queueDao = db.attendanceQueueDao()
    private val api = ApiService.create()

    suspend fun getSantriFiltered(gender: String, room: String): List<SantriEntity> = withContext(Dispatchers.IO) {
        santriDao.getSantriFiltered(gender, room)
    }

    suspend fun getAllRegisteredSantri(): List<SantriEntity> = withContext(Dispatchers.IO) {
        santriDao.getAllRegisteredSantri()
    }

    suspend fun getRooms(): List<String> = withContext(Dispatchers.IO) {
        santriDao.getRooms()
    }

    suspend fun getSantriByFingerprintId(fpId: String): SantriEntity? = withContext(Dispatchers.IO) {
        val cleanId = fpId.trim()
        santriDao.getSantriByFingerprintId(cleanId) ?: santriDao.getSantriById(cleanId.toIntOrNull() ?: -1)
    }

    // Sync remote data into local database with robust ID & Template mapping
    suspend fun syncData(): Boolean = withContext(Dispatchers.IO) {
        try {
            val santriRes = api.getSantriList()
            val templatesRes = api.getFingerprintTemplates()

            if (santriRes.isSuccessful && templatesRes.isSuccessful) {
                val remoteSantri = santriRes.body() ?: emptyList()
                val remoteTemplates = templatesRes.body() ?: emptyList()

                // Create maps linking santri_id -> fingerprint_id and template_data
                val santriIdToFpIdMap = remoteTemplates.associate { it.santriId to it.fingerprintId }
                val santriIdToTemplateMap = remoteTemplates.associate { it.santriId to it.templateData }

                // Map remote DTO to Room Entity with fallback linking by santri_id
                val santriEntities = remoteSantri.map { dto ->
                    val fpId = dto.fingerprintId ?: santriIdToFpIdMap[dto.id]
                    val fpTemplate = santriIdToTemplateMap[dto.id] ?: ""

                    SantriEntity(
                        id = dto.id,
                        name = dto.name,
                        gender = dto.gender,
                        room = dto.room,
                        fingerprintId = fpId,
                        fingerprintTemplate = fpTemplate,
                        academicYearId = dto.academicYearId,
                        photoUrl = dto.photoUrl
                    )
                }

                // SQLite write Transaction
                santriDao.clearAllSantri()
                santriDao.insertSantriList(santriEntities)

                // Sync local queue to server since internet is back
                syncQueuedAttendance()
                return@withContext true
            }
            return@withContext false
        } catch (e: Exception) {
            Log.e("AttendanceRepository", "Sync failed", e)
            return@withContext false
        }
    }

    // Report individual attendance and queue if offline
    suspend fun reportAttendance(
        santriId: Int,
        date: String,
        prayerTime: String,
        status: String,
        method: String,
        scannedAt: String,
        academicYearId: Int?
    ): Boolean = withContext(Dispatchers.IO) {
        val request = AttendanceRequest(
            prayerTime = prayerTime,
            date = date,
            items = listOf(AttendanceItem(santriId, status))
        )

        try {
            val res = api.postAttendance(request)
            if (res.isSuccessful) {
                syncQueuedAttendance()
                return@withContext true
            }
        } catch (e: Exception) {
            Log.e("AttendanceRepository", "Direct report failed, queueing offline", e)
        }

        // Save to SQLite queue if server check failed
        queueDao.queueAttendance(
            AttendanceQueueEntity(
                santriId = santriId,
                date = date,
                prayerTime = prayerTime,
                status = status,
                method = method,
                scannedAt = scannedAt,
                academicYearId = academicYearId
            )
        )
        return@withContext false
    }

    // Sync local offline queue
    suspend fun syncQueuedAttendance() = withContext(Dispatchers.IO) {
        val queued = queueDao.getQueuedAttendance()
        if (queued.isEmpty()) return@withContext

        for (item in queued) {
            val request = AttendanceRequest(
                prayerTime = item.prayerTime,
                date = item.date,
                items = listOf(AttendanceItem(item.santriId, item.status))
            )
            try {
                val res = api.postAttendance(request)
                if (res.isSuccessful) {
                    queueDao.deleteQueuedAttendance(item.id)
                }
            } catch (e: Exception) {
                Log.e("AttendanceRepository", "Syncing queue item ID: ${item.id} failed", e)
                break
            }
        }
    }
}
