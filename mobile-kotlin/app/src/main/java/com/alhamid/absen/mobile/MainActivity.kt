package com.alhamid.absen.mobile

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.KeyEvent
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.runtime.*
import androidx.core.content.ContextCompat
import com.alhamid.absen.mobile.ui.screens.HomeScreen
import com.alhamid.absen.mobile.ui.screens.ManualAttendanceScreen
import com.alhamid.absen.mobile.ui.screens.RekapAttendanceScreen
import com.alhamid.absen.mobile.ui.theme.AbsensiTheme
import com.alhamid.absen.mobile.ui.viewmodel.AttendanceViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: AttendanceViewModel by viewModels()
    private val ACTION_USB_PERMISSION = "com.alhamid.absen.mobile.USB_PERMISSION"
    private val scannedBuffer = StringBuilder()

    private val usbReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                ACTION_USB_PERMISSION -> {
                    synchronized(this) {
                        val device: UsbDevice? = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                        if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                            device?.let {
                                Log.d("MainActivity", "USB Permission Granted: ${it.deviceName}")
                                viewModel.checkUsbHardwareConnection()
                            }
                        } else {
                            Log.d("MainActivity", "USB Permission Denied")
                        }
                    }
                }
                UsbManager.ACTION_USB_DEVICE_ATTACHED -> {
                    Log.d("MainActivity", "USB Device Attached")
                    viewModel.checkUsbHardwareConnection()
                    checkAndRequestUsbDevice()
                }
                UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                    Log.d("MainActivity", "USB Device Detached")
                    viewModel.checkUsbHardwareConnection()
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        try {
            val filter = IntentFilter().apply {
                addAction(ACTION_USB_PERMISSION)
                addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
                addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
            }
            ContextCompat.registerReceiver(
                this,
                usbReceiver,
                filter,
                ContextCompat.RECEIVER_NOT_EXPORTED
            )
        } catch (e: Exception) {
            Log.e("MainActivity", "Error registering receiver", e)
        }

        checkAndRequestUsbDevice()

        setContent {
            AbsensiTheme {
                var currentScreen by remember { mutableStateOf("home") }

                when (currentScreen) {
                    "home" -> HomeScreen(
                        viewModel = viewModel,
                        onNavigateToManual = { currentScreen = "manual" },
                        onNavigateToRekap = { currentScreen = "rekap" }
                    )
                    "manual" -> ManualAttendanceScreen(
                        viewModel = viewModel,
                        onBack = { currentScreen = "home" }
                    )
                    else -> RekapAttendanceScreen(
                        viewModel = viewModel,
                        onBack = { currentScreen = "home" }
                    )
                }
            }
        }
    }

    /**
     * Listens to USB OTG Scanner Key Events (ZKTeco / Biometric OTG Key Input)
     */
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.action == KeyEvent.ACTION_DOWN) {
            val char = event.unicodeChar.toChar()
            if (event.keyCode == KeyEvent.KEYCODE_ENTER) {
                val scannedId = scannedBuffer.toString().trim()
                scannedBuffer.clear()
                if (scannedId.isNotEmpty()) {
                    viewModel.onSensorTouchedOrScanned(scannedId)
                    return true
                }
            } else if (char.isLetterOrDigit() || char == '-' || char == '_') {
                scannedBuffer.append(char)
            }
        }
        return super.dispatchKeyEvent(event)
    }

    private fun checkAndRequestUsbDevice() {
        try {
            val usbManager = getSystemService(Context.USB_SERVICE) as UsbManager
            val deviceList = usbManager.deviceList
            val fpDevice = deviceList.values.firstOrNull { device ->
                device.vendorId == 0x1B55 || device.vendorId == 0x057B || device.vendorId > 0
            }
            fpDevice?.let { requestUsbPermission(it) }
        } catch (e: Exception) {
            Log.e("MainActivity", "Error checking USB device", e)
        }
    }

    private fun requestUsbPermission(device: UsbDevice) {
        try {
            val usbManager = getSystemService(Context.USB_SERVICE) as UsbManager
            if (!usbManager.hasPermission(device)) {
                val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                } else {
                    0
                }
                val permissionIntent = PendingIntent.getBroadcast(
                    this,
                    0,
                    Intent(ACTION_USB_PERMISSION),
                    flags
                )
                usbManager.requestPermission(device, permissionIntent)
            }
        } catch (e: Exception) {
            Log.e("MainActivity", "Error requesting USB permission", e)
        }
    }

    override fun onResume() {
        super.onResume()
        try {
            viewModel.checkUsbHardwareConnection()
        } catch (e: Exception) {
            // Safe guard onResume
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            unregisterReceiver(usbReceiver)
        } catch (e: Exception) {
            // Ignore unregister exceptions
        }
    }
}
