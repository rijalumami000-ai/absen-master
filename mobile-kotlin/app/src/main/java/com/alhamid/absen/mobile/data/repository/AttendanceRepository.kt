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

    suspend fun getRooms(): List<String> = withContext(Dispatchers.IO) {
        santriDao.getRooms()
    }

    suspend fun getSantriByFingerprintId(fpId: String): SantriEntity? = withContext(Dispatchers.IO) {
        santriDao.getSantriByFingerprintId(fpId)
    }

    // Sync remote data into local database
    suspend fun syncData(): Boolean = withContext(Dispatchers.IO) {
        try {
            val santriRes = api.getSantriList()
            val templatesRes = api.getFingerprintTemplates()

            if (santriRes.isSuccessful && templatesRes.isSuccessful) {
                val remoteSantri = santriRes.body() ?: emptyList()
                val remoteTemplates = templatesRes.body() ?: emptyList()

                // Create a map of fingerprint_id -> template_data
                val templateMap = remoteTemplates.associate { it.fingerprintId to it.templateData }

                // Map remote DTO to Room Entity
                val santriEntities = remoteSantri.map { dto ->
                    SantriEntity(
                        id = dto.id,
                        name = dto.name,
                        gender = dto.gender,
                        room = dto.room,
                        fingerprintId = dto.fingerprintId,
                        fingerprintTemplate = templateMap[dto.fingerprintId] ?: "",
                        academicYearId = dto.academicYearId,
                        photoUrl = dto.photoUrl
                    )
                }

                // SQLite write Transactional write
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
        // Attempt posting to server first
        val request = AttendanceRequest(
            prayerTime = prayerTime,
            date = date,
            items = listOf(AttendanceItem(santriId, status))
        )

        try {
            val res = api.postAttendance(request)
            if (res.isSuccessful) {
                // If success, attempt syncing previous queues if any
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
                break // Stop sync if internet disconnected again
            }
        }
    }
}
