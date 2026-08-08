package com.alhamid.absen.mobile.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface SantriDao {
    @Query("SELECT * FROM santri ORDER BY name ASC")
    suspend fun getAllSantri(): List<SantriEntity>

    @Query("SELECT COUNT(*) FROM santri")
    suspend fun getCountAll(): Int

    @Query("SELECT * FROM santri WHERE gender = :gender AND (:room = '' OR room = :room) ORDER BY name ASC")
    suspend fun getSantriFiltered(gender: String, room: String): List<SantriEntity>

    @Query("SELECT DISTINCT room FROM santri WHERE room != '' ORDER BY room ASC")
    suspend fun getRooms(): List<String>

    @Query("SELECT * FROM santri WHERE fingerprintId = :fpId LIMIT 1")
    suspend fun getSantriByFingerprintId(fpId: String): SantriEntity?

    @Query("SELECT * FROM santri WHERE id = :id LIMIT 1")
    suspend fun getSantriById(id: Int): SantriEntity?

    @Query("SELECT * FROM santri WHERE (fingerprintId IS NOT NULL AND fingerprintId != '') OR (fingerprintTemplate IS NOT NULL AND fingerprintTemplate != '') ORDER BY name ASC")
    suspend fun getAllRegisteredSantri(): List<SantriEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSantriList(santri: List<SantriEntity>)

    @Query("DELETE FROM santri")
    suspend fun clearAllSantri()
}
