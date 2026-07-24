package com.alhamid.absen.mobile.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface SantriDao {
    @Query("SELECT * FROM santri")
    suspend fun getAllSantri(): List<SantriEntity>

    @Query("SELECT * FROM santri WHERE gender = :gender AND (:room = '' OR room = :room)")
    suspend fun getSantriFiltered(gender: String, room: String): List<SantriEntity>

    @Query("SELECT DISTINCT room FROM santri WHERE room != '' ORDER BY room ASC")
    suspend fun getRooms(): List<String>

    @Query("SELECT * FROM santri WHERE fingerprintId = :fpId LIMIT 1")
    suspend fun getSantriByFingerprintId(fpId: String): SantriEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSantriList(santri: List<SantriEntity>)

    @Query("DELETE FROM santri")
    suspend fun clearAllSantri()
}
