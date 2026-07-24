package com.alhamid.absen.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.alhamid.absen.mobile.data.local.SantriEntity
import com.alhamid.absen.mobile.ui.theme.*
import com.alhamid.absen.mobile.ui.viewmodel.AttendanceViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManualAttendanceScreen(
    viewModel: AttendanceViewModel,
    onBack: () -> Unit
) {
    val selectedGender by viewModel.selectedGender.collectAsState()
    val selectedRoom by viewModel.selectedRoom.collectAsState()
    val roomsList by viewModel.roomsList.collectAsState()
    val santriList by viewModel.santriList.collectAsState()
    val attendanceStates by viewModel.attendanceStates.collectAsState()
    val isSavingManual by viewModel.isSavingManual.collectAsState()

    var searchQuery by remember { mutableStateOf("") }
    var activePrayerTime by remember { mutableStateOf(viewModel.getActiveSholat()) }

    var showSuccessDialog by remember { mutableStateOf(false) }
    var successCount by remember { mutableStateOf(0) }
    var showErrorDialog by remember { mutableStateOf(false) }

    // Dropdown open states
    var genderDropdownOpen by remember { mutableStateOf(false) }
    var roomDropdownOpen by remember { mutableStateOf(false) }
    var prayerDropdownOpen by remember { mutableStateOf(false) }

    // Filter local list
    val filteredSantri = remember(santriList, searchQuery) {
        if (searchQuery.isEmpty()) santriList
        else {
            santriList.filter {
                it.name.contains(searchQuery, ignoreCase = true) ||
                it.room.contains(searchQuery, ignoreCase = true)
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Absensi Manual", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Text("←", fontSize = 24.sp)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        },
        bottomBar = {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White)
                    .padding(16.dp)
            ) {
                Button(
                    onClick = {
                        viewModel.saveManualAttendance(
                            prayerTime = activePrayerTime,
                            onComplete = { count ->
                                successCount = count
                                showSuccessDialog = true
                            },
                            onError = {
                                showErrorDialog = true
                            }
                        )
                    },
                    enabled = !isSavingManual && filteredSantri.isNotEmpty(),
                    colors = ButtonDefaults.buttonColors(containerColor = Indigo500),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                ) {
                    if (isSavingManual) {
                        CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp)
                    } else {
                        Text("Simpan Absensi", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Slate50)
                .padding(paddingValues)
        ) {
            // FILTER BAR
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White)
                    .padding(16.dp)
            ) {
                // Active Prayer selector
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Waktu Sholat:", fontWeight = FontWeight.SemiBold, color = Slate500, fontSize = 14.sp)
                    Spacer(modifier = Modifier.width(12.dp))
                    Box(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "$activePrayerTime ▼",
                            fontWeight = FontWeight.Bold,
                            color = Indigo500,
                            modifier = Modifier
                                .clickable { prayerDropdownOpen = true }
                                .padding(8.dp)
                        )
                        DropdownMenu(
                            expanded = prayerDropdownOpen,
                            onDismissRequest = { prayerDropdownOpen = false }
                        ) {
                            listOf("Subuh", "Dzuhur", "Ashar", "Maghrib", "Isya").forEach { sholat ->
                                DropdownMenuItem(
                                    text = { Text(sholat) },
                                    onClick = {
                                        activePrayerTime = sholat
                                        prayerDropdownOpen = false
                                    }
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
                Divider(color = Slate50)
                Spacer(modifier = Modifier.height(12.dp))

                // Gender & Room selectors row
                Row(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    // Gender Filter
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Gender", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = Slate500)
                        Spacer(modifier = Modifier.height(6.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(Slate50)
                                .clickable { genderDropdownOpen = true }
                                .padding(horizontal = 12.dp, vertical = 12.dp)
                        ) {
                            Text(text = "$selectedGender ▼", fontSize = 14.sp)
                            DropdownMenu(
                                expanded = genderDropdownOpen,
                                onDismissRequest = { genderDropdownOpen = false }
                            ) {
                                listOf("Putra", "Putri").forEach { g ->
                                    DropdownMenuItem(
                                        text = { Text(g) },
                                        onClick = {
                                            viewModel.setGender(g)
                                            genderDropdownOpen = false
                                        }
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.width(16.dp))

                    // Room Filter
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Kamar", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = Slate500)
                        Spacer(modifier = Modifier.height(6.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(Slate50)
                                .clickable { roomDropdownOpen = true }
                                .padding(horizontal = 12.dp, vertical = 12.dp)
                        ) {
                            Text(text = "${if (selectedRoom.isEmpty()) "Semua" else selectedRoom} ▼", fontSize = 14.sp)
                            DropdownMenu(
                                expanded = roomDropdownOpen,
                                onDismissRequest = { roomDropdownOpen = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text("Semua") },
                                    onClick = {
                                        viewModel.setRoom("")
                                        roomDropdownOpen = false
                                    }
                                )
                                roomsList.forEach { r ->
                                    DropdownMenuItem(
                                        text = { Text(r) },
                                        onClick = {
                                            viewModel.setRoom(r)
                                            roomDropdownOpen = false
                                        }
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Search Box
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Cari nama santri...") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp)),
                    singleLine = true
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // LIST OF SANTRI
            if (filteredSantri.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("ℹ️", fontSize = 36.sp)
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("Tidak ada santri yang cocok.", color = Slate500)
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(filteredSantri) { santri ->
                        val currentStatus = attendanceStates[santri.id] ?: "Hadir"

                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            shape = RoundedCornerShape(16.dp),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(
                                            text = santri.name,
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Slate900
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = "Kamar ${santri.room} • ${santri.gender}",
                                            fontSize = 12.sp,
                                            color = Slate500
                                        )
                                    }

                                    if (santri.fingerprintId != null) {
                                        Text("☝️", fontSize = 16.sp)
                                    }
                                }

                                Spacer(modifier = Modifier.height(16.dp))

                                // Status options segmented buttons
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    listOf("Hadir", "Sakit", "Izin", "Alfa").forEach { opt ->
                                        val isSelected = currentStatus == opt

                                        val bg = when {
                                            !isSelected -> Slate50
                                            opt == "Hadir" -> Emerald50
                                            opt == "Sakit" -> Color(0xFFFEF3C7)
                                            opt == "Izin" -> Color(0xFFDBEAFE)
                                            else -> Color(0xFFFEE2E2)
                                        }

                                        val textCol = when {
                                            !isSelected -> Slate500
                                            opt == "Hadir" -> Emerald600
                                            opt == "Sakit" -> Color(0xFF92400E)
                                            opt == "Izin" -> Color(0xFF1E40AF)
                                            else -> Color(0xFF991B1B)
                                        }

                                        Box(
                                            modifier = Modifier
                                                .clip(CircleShape)
                                                .background(bg)
                                                .clickable {
                                                    viewModel.updateAttendanceState(santri.id, opt)
                                                }
                                                .padding(horizontal = 16.dp, vertical = 8.dp),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = opt,
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = textCol
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Success dialog modal popup
    if (showSuccessDialog) {
        AlertDialog(
            onDismissRequest = { showSuccessDialog = false },
            confirmButton = {
                Button(
                    onClick = {
                        showSuccessDialog = false
                        onBack()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Indigo500)
                ) {
                    Text("Selesai")
                }
            },
            title = { Text("Berhasil Disimpan", fontWeight = FontWeight.Bold) },
            text = { Text("Data absensi $successCount santri sholat $activePrayerTime berhasil dicatat.") }
        )
    }

    // Error dialog modal popup
    if (showErrorDialog) {
        AlertDialog(
            onDismissRequest = { showErrorDialog = false },
            confirmButton = {
                Button(
                    onClick = { showErrorDialog = false },
                    colors = ButtonDefaults.buttonColors(containerColor = Red500)
                ) {
                    Text("Tutup")
                }
            },
            title = { Text("Gagal Menyimpan", fontWeight = FontWeight.Bold) },
            text = { Text("Terjadi kesalahan saat memproses penyimpanan data absensi.") }
        )
    }
}
