package com.alhamid.absen.mobile.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.alhamid.absen.mobile.data.local.SantriEntity
import com.alhamid.absen.mobile.data.repository.AttendanceRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class AttendanceViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = AttendanceRepository(application)

    // Clock Flow
    private val _timeString = MutableStateFlow("")
    val timeString: StateFlow<String> = _timeString

    // Sync state
    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing

    private val _lastSyncText = MutableStateFlow("Belum pernah sinkronisasi")
    val lastSyncText: StateFlow<String> = _lastSyncText

    // Fingerprint Scanner state
    private val _isSensorConnected = MutableStateFlow(false)
    val isSensorConnected: StateFlow<Boolean> = _isSensorConnected

    private val _sensorStatusMessage = MutableStateFlow("Perangkat tidak terdeteksi")
    val sensorStatusMessage: StateFlow<String> = _sensorStatusMessage

    private val _lastMatchedSantri = MutableStateFlow<SantriEntity?>(null)
    val lastMatchedSantri: StateFlow<SantriEntity?> = _lastMatchedSantri

    private val _scanErrorMessage = MutableStateFlow<String?>(null)
    val scanErrorMessage: StateFlow<String?> = _scanErrorMessage

    // Manual Attendance Screen filters & data
    private val _selectedGender = MutableStateFlow("Putri")
    val selectedGender: StateFlow<String> = _selectedGender

    private val _selectedRoom = MutableStateFlow("")
    val selectedRoom: StateFlow<String> = _selectedRoom

    private val _roomsList = MutableStateFlow<List<String>>(emptyList())
    val roomsList: StateFlow<List<String>> = _roomsList

    private val _santriList = MutableStateFlow<List<SantriEntity>>(emptyList())
    val santriList: StateFlow<List<SantriEntity>> = _santriList

    private val _attendanceStates = MutableStateFlow<Map<Int, String>>(emptyMap())
    val attendanceStates: StateFlow<Map<Int, String>> = _attendanceStates

    private val _isSavingManual = MutableStateFlow(false)
    val isSavingManual: StateFlow<Boolean> = _isSavingManual

    init {
        // Start Clock timer ticker
        viewModelScope.launch {
            while (true) {
                val sdf = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
                _timeString.value = sdf.format(Date())
                delay(1000)
            }
        }

        // Connect fingerprint sensor (mock simulation default)
        connectSensor()
        loadManualAttendanceData()
    }

    fun setGender(gender: String) {
        _selectedGender.value = gender
        loadManualAttendanceData()
    }

    fun setRoom(room: String) {
        _selectedRoom.value = room
        loadManualAttendanceData()
    }

    fun updateAttendanceState(santriId: Int, status: String) {
        val current = _attendanceStates.value.toMutableMap()
        current[santriId] = status
        _attendanceStates.value = current
    }

    fun connectSensor() {
        viewModelScope.launch {
            _sensorStatusMessage.value = "Membuka koneksi ke alat..."
            delay(1000)
            _isSensorConnected.value = true
            _sensorStatusMessage.value = "Alat sidik jari terhubung. Siap scan."
        }
    }

    fun loadManualAttendanceData() {
        viewModelScope.launch {
            val rooms = repository.getRooms()
            val list = repository.getSantriFiltered(_selectedGender.value, _selectedRoom.value)
            _roomsList.value = rooms
            _santriList.value = list

            val states = _attendanceStates.value.toMutableMap()
            list.forEach {
                if (!states.containsKey(it.id)) {
                    states[it.id] = "Hadir" // Default option
                }
            }
            _attendanceStates.value = states
        }
    }

    fun syncDatabase() {
        viewModelScope.launch {
            _isSyncing.value = true
            val success = repository.syncData()
            if (success) {
                val sdf = SimpleDateFormat("dd/MM HH:mm", Locale.getDefault())
                _lastSyncText.value = "Terakhir Sinkronisasi: ${sdf.format(Date())}"
                loadManualAttendanceData()
            }
            _isSyncing.value = false
        }
    }

    // Handle incoming scan (either mock from test UI or real SDK event receiver)
    fun processFingerprintScan(fpId: String) {
        viewModelScope.launch {
            val santri = repository.getSantriByFingerprintId(fpId)
            if (santri != null) {
                _lastMatchedSantri.value = santri
                _scanErrorMessage.value = null
                _sensorStatusMessage.value = "Hadir: ${santri.name}"

                // Save attendance record to local repository (handles offline queueing)
                val sdfDate = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                val sdfFull = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                val todayStr = sdfDate.format(Date())
                val nowStr = sdfFull.format(Date())

                repository.reportAttendance(
                    santriId = santri.id,
                    date = todayStr,
                    prayerTime = getActiveSholat(),
                    status = "Hadir",
                    method = "Fingerprint",
                    scannedAt = nowStr,
                    academicYearId = santri.academicYearId
                )

                // Reset overlay status after 4 seconds
                delay(4000)
                if (_lastMatchedSantri.value?.id == santri.id) {
                    _lastMatchedSantri.value = null
                    _sensorStatusMessage.value = "Tempelkan jari Anda pada sensor..."
                }
            } else {
                _scanErrorMessage.value = "Sidik jari tidak dikenal/belum terdaftar"
                _sensorStatusMessage.value = "Sidik jari tidak dikenal. Silakan coba lagi."
                delay(3000)
                _scanErrorMessage.value = null
                _sensorStatusMessage.value = "Tempelkan jari Anda pada sensor..."
            }
        }
    }

    // Save manual bulk updates from ManualAttendanceScreen
    fun saveManualAttendance(prayerTime: String, onComplete: (Int) -> Unit, onError: () -> Unit) {
        viewModelScope.launch {
            _isSavingManual.value = true
            try {
                val sdfDate = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                val sdfFull = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                val todayStr = sdfDate.format(Date())
                val nowStr = sdfFull.format(Date())

                var savedCount = 0
                _santriList.value.forEach { s ->
                    val status = _attendanceStates.value[s.id] ?: "Hadir"
                    repository.reportAttendance(
                        santriId = s.id,
                        date = todayStr,
                        prayerTime = prayerTime,
                        status = status,
                        method = "Manual",
                        scannedAt = nowStr,
                        academicYearId = s.academicYearId
                    )
                    savedCount++
                }
                onComplete(savedCount)
            } catch (e: Exception) {
                onError()
            } finally {
                _isSavingManual.value = false
            }
        }
    }

    fun getActiveSholat(): String {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        return when {
            hour in 4..5 -> "Subuh"
            hour in 11..13 -> "Dzuhur"
            hour in 15..16 -> "Ashar"
            hour in 17..18 -> "Maghrib"
            hour in 19..21 -> "Isya"
            else -> "Subuh"
        }
    }

    fun getGreeting(): String {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        return when {
            hour in 4..9 -> "Selamat Pagi"
            hour in 10..14 -> "Selamat Siang"
            hour in 15..17 -> "Selamat Sore"
            else -> "Selamat Malam"
        }
    }
}
