package com.alhamid.absen.mobile.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query

@Dao
interface AttendanceQueueDao {
    @Query("SELECT * FROM attendance_queue ORDER BY id ASC")
    suspend fun getQueuedAttendance(): List<AttendanceQueueEntity>

    @Insert
    suspend fun queueAttendance(item: AttendanceQueueEntity)

    @Query("DELETE FROM attendance_queue WHERE id = :id")
    suspend fun deleteQueuedAttendance(id: Int)
}
