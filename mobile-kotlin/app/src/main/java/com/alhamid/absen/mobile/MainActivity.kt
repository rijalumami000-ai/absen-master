package com.alhamid.absen.mobile

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.alhamid.absen.mobile.ui.screens.HomeScreen
import com.alhamid.absen.mobile.ui.screens.ManualAttendanceScreen
import com.alhamid.absen.mobile.ui.theme.AbsensiTheme
import com.alhamid.absen.mobile.ui.viewmodel.AttendanceViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: AttendanceViewModel by viewModels()

    private val usbReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                UsbManager.ACTION_USB_DEVICE_ATTACHED -> {
                    val device: UsbDevice? = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                    viewModel.updateUsbDeviceStatus(true, device?.productName)
                }
                UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                    viewModel.updateUsbDeviceStatus(false, null)
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Register USB hardware state broadcast listeners
        val filter = IntentFilter().apply {
            addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
            addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
        }
        registerReceiver(usbReceiver, filter)

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

    override fun onResume() {
        super.onResume()
        // Re-check USB status on app focus
        viewModel.checkUsbHardwareConnection()
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
