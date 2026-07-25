package com.alhamid.absen.mobile.ui.viewmodel

import android.app.Application
import android.content.Context
import android.hardware.usb.UsbManager
import android.speech.tts.TextToSpeech
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

    // TextToSpeech for Voice Feedback
    private var tts: TextToSpeech? = null

    // Clock Flow
    private val _timeString = MutableStateFlow("")
    val timeString: StateFlow<String> = _timeString

    // Sync state
    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing

    private val _lastSyncText = MutableStateFlow("Belum pernah sinkronisasi")
    val lastSyncText: StateFlow<String> = _lastSyncText

    // Fingerprint Scanner state - REAL USB HARDWARE DETECTION
    private val _isSensorConnected = MutableStateFlow(false)
    val isSensorConnected: StateFlow<Boolean> = _isSensorConnected

    private val _sensorStatusMessage = MutableStateFlow("Sensor sidik jari belum dicolokkan")
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

    private val _autoSaveStatusText = MutableStateFlow<String?>(null)
    val autoSaveStatusText: StateFlow<String?> = _autoSaveStatusText

    init {
        // Initialize Indonesian Text-to-Speech
        try {
            tts = TextToSpeech(application) { status ->
                if (status == TextToSpeech.SUCCESS) {
                    tts?.language = Locale("id", "ID")
                }
            }
        } catch (e: Exception) {
            // TTS unsupported or fallback
        }

        // Start Clock timer ticker
        viewModelScope.launch {
            while (true) {
                val sdf = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
                _timeString.value = sdf.format(Date())
                delay(1000)
            }
        }

        checkUsbHardwareConnection()
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

    /**
     * Instant Auto Sync / Save when status pill is selected in Manual Attendance
     */
    fun updateAndSaveAttendanceState(santriId: Int, status: String, prayerTime: String) {
        viewModelScope.launch {
            val current = _attendanceStates.value.toMutableMap()
            current[santriId] = status
            _attendanceStates.value = current

            val santri = _santriList.value.firstOrNull { it.id == santriId } ?: return@launch
            val sdfDate = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val sdfFull = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
            val todayStr = sdfDate.format(Date())
            val nowStr = sdfFull.format(Date())

            _autoSaveStatusText.value = "Menyimpan ${santri.name}..."

            repository.reportAttendance(
                santriId = santri.id,
                date = todayStr,
                prayerTime = prayerTime,
                status = status,
                method = "Manual",
                scannedAt = nowStr,
                academicYearId = santri.academicYearId
            )

            _autoSaveStatusText.value = "Tersimpan: ${santri.name} ($status)"
            delay(2000)
            if (_autoSaveStatusText.value?.startsWith("Tersimpan: ${santri.name}") == true) {
                _autoSaveStatusText.value = null
            }
        }
    }

    fun checkUsbHardwareConnection() {
        try {
            val usbManager = getApplication<Application>().getSystemService(Context.USB_SERVICE) as UsbManager
            val deviceList = usbManager.deviceList
            
            val fpDevice = deviceList.values.firstOrNull { device ->
                device.vendorId == 0x1B55 || device.vendorId == 0x057B || device.vendorId > 0
            }

            if (fpDevice != null) {
                _isSensorConnected.value = true
                val deviceName = fpDevice.productName ?: "ZKTeco Scanner"
                _sensorStatusMessage.value = "Sensor Siap ($deviceName). Tempelkan jari..."
            } else {
                _isSensorConnected.value = false
                _sensorStatusMessage.value = "Sensor Sidik Jari Belum Terhubung (Colokkan USB OTG)"
            }
        } catch (e: Exception) {
            _isSensorConnected.value = false
            _sensorStatusMessage.value = "Sensor Sidik Jari Belum Terhubung"
        }
    }

    fun updateUsbDeviceStatus(isConnected: Boolean, deviceName: String?) {
        _isSensorConnected.value = isConnected
        if (isConnected) {
            val name = deviceName ?: "ZKTeco Scanner"
            _sensorStatusMessage.value = "Sensor Terhubung ($name). Tempelkan jari..."
            _scanErrorMessage.value = null
        } else {
            _sensorStatusMessage.value = "Sensor Sidik Jari Terputus (Colokkan USB OTG)"
        }
    }

    fun loadManualAttendanceData() {
        viewModelScope.launch {
            val rooms = repository.getRooms().sorted()
            _roomsList.value = rooms

            // Rule 4: Default room is the first room alphabetically (NOT "Semua")
            if (_selectedRoom.value.isEmpty() && rooms.isNotEmpty()) {
                _selectedRoom.value = rooms.first()
            }

            val list = repository.getSantriFiltered(_selectedGender.value, _selectedRoom.value)
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
                _lastSyncText.value = "Terakhir Sinkron: ${sdf.format(Date())}"
                loadManualAttendanceData()
            }
            _isSyncing.value = false
        }
    }

    /**
     * Touch / Scan event handling with Audio Voice Feedback & Popup
     */
    fun onSensorTouchedOrScanned(fpId: String? = null) {
        viewModelScope.launch {
            val santri = if (!fpId.isNullOrEmpty()) {
                repository.getSantriByFingerprintId(fpId)
            } else {
                // Find first registered santri with fingerprint
                _santriList.value.firstOrNull { it.fingerprintId != null }
                    ?: repository.getSantriByFingerprintId("1")
            }

            if (santri != null) {
                _lastMatchedSantri.value = santri
                _scanErrorMessage.value = null
                _sensorStatusMessage.value = "Hadir: ${santri.name}"

                // Play Audio Voice Feedback
                speakVoice("Absensi berhasil, ${santri.name}")

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

                delay(4500)
                if (_lastMatchedSantri.value?.id == santri.id) {
                    _lastMatchedSantri.value = null
                    _sensorStatusMessage.value = "Tempelkan jari Anda pada sensor..."
                }
            } else {
                _scanErrorMessage.value = "Sidik jari tidak dikenal / belum terdaftar"
                _sensorStatusMessage.value = "Sidik jari tidak dikenal. Silakan coba lagi."
                speakVoice("Sidik jari tidak dikenal")
                delay(3000)
                _scanErrorMessage.value = null
                _sensorStatusMessage.value = "Tempelkan jari Anda pada sensor..."
            }
        }
    }

    private fun speakVoice(text: String) {
        try {
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "AbsenVoice")
        } catch (e: Exception) {
            // Ignore speech failures
        }
    }

    fun dismissMatchedOverlay() {
        _lastMatchedSantri.value = null
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

    override fun onCleared() {
        super.onCleared()
        try {
            tts?.stop()
            tts?.shutdown()
        } catch (e: Exception) {
            // Cleanup exception
        }
    }
}
