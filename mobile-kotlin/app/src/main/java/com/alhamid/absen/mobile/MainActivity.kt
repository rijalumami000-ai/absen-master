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
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.core.content.ContextCompat
import com.alhamid.absen.mobile.ui.screens.HomeScreen
import com.alhamid.absen.mobile.ui.screens.ManualAttendanceScreen
import com.alhamid.absen.mobile.ui.theme.AbsensiTheme
import com.alhamid.absen.mobile.ui.viewmodel.AttendanceViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: AttendanceViewModel by viewModels()
    private val ACTION_USB_PERMISSION = "com.alhamid.absen.mobile.USB_PERMISSION"

    private val usbReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            try {
                val action = intent?.action
                if (ACTION_USB_PERMISSION == action) {
                    synchronized(this) {
                        val device: UsbDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                        } else {
                            @Suppress("DEPRECATION")
                            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                        }

                        if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                            device?.let {
                                viewModel.updateUsbDeviceStatus(true, it.productName)
                            }
                        } else {
                            viewModel.updateUsbDeviceStatus(true, device?.productName ?: "USB OTG Device")
                        }
                    }
                } else if (UsbManager.ACTION_USB_DEVICE_ATTACHED == action) {
                    val device: UsbDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                    }
                    device?.let { requestUsbPermission(it) }
                    viewModel.updateUsbDeviceStatus(true, device?.productName)
                } else if (UsbManager.ACTION_USB_DEVICE_DETACHED == action) {
                    viewModel.updateUsbDeviceStatus(false, null)
                }
            } catch (e: Exception) {
                Log.e("MainActivity", "USB Receiver error", e)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Safe register USB receiver using ContextCompat to prevent Android 14 API 34 SecurityException crash
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

        // Request USB permission safely if device is attached on startup
        checkAndRequestUsbDevice()

        // Set UI content safely
        setContent {
            AbsensiTheme {
                var currentScreen by remember { mutableStateOf("home") }

                if (currentScreen == "home") {
                    HomeScreen(
                        viewModel = viewModel,
                        onNavigateToManual = { currentScreen = "manual" }
                    )
                } else {
                    ManualAttendanceScreen(
                        viewModel = viewModel,
                        onBack = { currentScreen = "home" }
                    )
                }
            }
        }
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
            Log.e("MainActivity", "USB check error", e)
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
