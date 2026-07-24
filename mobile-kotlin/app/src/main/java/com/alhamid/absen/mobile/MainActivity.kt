package com.alhamid.absen.mobile

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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
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
}
