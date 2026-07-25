package com.alhamid.absen.mobile.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
    val autoSaveStatusText by viewModel.autoSaveStatusText.collectAsState()

    var searchQuery by remember { mutableStateOf("") }
    var activePrayerTime by remember { mutableStateOf(viewModel.getActiveSholat()) }

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

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF090D16),
                        Color(0xFF0F172A),
                        Color(0xFF1E293B)
                    )
                )
            )
    ) {
        Scaffold(
            containerColor = Color.Transparent,
            topBar = {
                TopAppBar(
                    title = {
                        Column {
                            Text(
                                text = "Absensi Manual Santri",
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                fontSize = 17.sp
                            )
                            Text(
                                text = "Pilih status di bawah untuk simpan otomatis",
                                fontSize = 11.sp,
                                color = Emerald400
                            )
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Text("←", fontSize = 24.sp, color = Color.White)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
                )
            }
        ) { paddingValues ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(horizontal = 16.dp)
            ) {
                // AUTO-SAVE NOTIFICATION TOAST BADGE (Request #5)
                AnimatedVisibility(
                    visible = autoSaveStatusText != null,
                    enter = fadeIn(),
                    exit = fadeOut()
                ) {
                    autoSaveStatusText?.let { text ->
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = Emerald500.copy(alpha = 0.2f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Emerald400),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 10.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("⚡", fontSize = 14.sp)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = text,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Emerald400
                                )
                            }
                        }
                    }
                }

                // FILTER HEADER GLASS CARD
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Color.White.copy(alpha = 0.05f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.1f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        // PRAYER SELECTOR ROW
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("WAKTU SHOLAT", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Emerald400, letterSpacing = 1.sp)
                            
                            Box {
                                Surface(
                                    onClick = { prayerDropdownOpen = true },
                                    shape = RoundedCornerShape(12.dp),
                                    color = Color.White.copy(alpha = 0.08f),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.15f))
                                ) {
                                    Text(
                                        text = "🕌 Sholat $activePrayerTime ▼",
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White,
                                        fontSize = 13.sp,
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                    )
                                }
                                DropdownMenu(
                                    expanded = prayerDropdownOpen,
                                    onDismissRequest = { prayerDropdownOpen = false }
                                ) {
                                    listOf("Subuh", "Dzuhur", "Ashar", "Maghrib", "Isya").forEach { sholat ->
                                        DropdownMenuItem(
                                            text = { Text(sholat, fontWeight = FontWeight.SemiBold) },
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

                        // GENDER & ROOM DROPDOWNS (Request #4: Default room is first room alphabetically)
                        Row(modifier = Modifier.fillMaxWidth()) {
                            // GENDER FILTER
                            Column(modifier = Modifier.weight(1f)) {
                                Text("GENDER", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Slate400, letterSpacing = 0.5.sp)
                                Spacer(modifier = Modifier.height(4.dp))
                                Box {
                                    Surface(
                                        onClick = { genderDropdownOpen = true },
                                        shape = RoundedCornerShape(12.dp),
                                        color = Color.White.copy(alpha = 0.08f),
                                        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.12f)),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Text(
                                            text = "$selectedGender ▼",
                                            fontSize = 13.sp,
                                            color = Color.White,
                                            fontWeight = FontWeight.SemiBold,
                                            modifier = Modifier.padding(10.dp)
                                        )
                                    }
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

                            Spacer(modifier = Modifier.width(12.dp))

                            // ROOM FILTER
                            Column(modifier = Modifier.weight(1f)) {
                                Text("KAMAR", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Slate400, letterSpacing = 0.5.sp)
                                Spacer(modifier = Modifier.height(4.dp))
                                Box {
                                    Surface(
                                        onClick = { roomDropdownOpen = true },
                                        shape = RoundedCornerShape(12.dp),
                                        color = Color.White.copy(alpha = 0.08f),
                                        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.12f)),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Text(
                                            text = "${if (selectedRoom.isEmpty()) "Pilih Kamar" else selectedRoom} ▼",
                                            fontSize = 13.sp,
                                            color = Color.White,
                                            fontWeight = FontWeight.SemiBold,
                                            modifier = Modifier.padding(10.dp)
                                        )
                                    }
                                    DropdownMenu(
                                        expanded = roomDropdownOpen,
                                        onDismissRequest = { roomDropdownOpen = false }
                                    ) {
                                        roomsList.forEach { r ->
                                            DropdownMenuItem(
                                                text = { Text("Kamar $r") },
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

                        Spacer(modifier = Modifier.height(12.dp))

                        // SEARCH FIELD
                        OutlinedTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            placeholder = { Text("Cari nama santri...", color = Slate400, fontSize = 13.sp) },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = Color.White.copy(alpha = 0.08f),
                                unfocusedContainerColor = Color.White.copy(alpha = 0.05f),
                                focusedBorderColor = Emerald400,
                                unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            ),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // SANTRI LIST
                if (filteredSantri.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("🔍", fontSize = 36.sp)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("Tidak ada santri yang cocok", color = Slate400, fontSize = 14.sp)
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        contentPadding = PaddingValues(bottom = 16.dp)
                    ) {
                        items(filteredSantri) { santri ->
                            val currentStatus = attendanceStates[santri.id] ?: "Hadir"

                            Surface(
                                shape = RoundedCornerShape(18.dp),
                                color = Color.White.copy(alpha = 0.06f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.1f)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
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
                                                color = Color.White
                                            )
                                            Spacer(modifier = Modifier.height(2.dp))
                                            Text(
                                                text = "Kamar ${santri.room} • ${santri.gender}",
                                                fontSize = 12.sp,
                                                color = Slate400
                                            )
                                        }

                                        if (santri.fingerprintId != null) {
                                            Surface(
                                                shape = CircleShape,
                                                color = Emerald500.copy(alpha = 0.15f),
                                                border = androidx.compose.foundation.BorderStroke(1.dp, Emerald400.copy(alpha = 0.3f))
                                            ) {
                                                Text(
                                                    text = "☝️ FP",
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Emerald400,
                                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                                )
                                            }
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(12.dp))

                                    // ALL ATTENDANCE STATUS PILL OPTIONS (Hadir, Sakit, Izin, Alfa)
                                    // Request #3 & #5: Instant Auto-Sync when tapped!
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        listOf("Hadir", "Sakit", "Izin", "Alfa").forEach { opt ->
                                            val isSelected = currentStatus == opt

                                            val bg = when {
                                                !isSelected -> Color.White.copy(alpha = 0.04f)
                                                opt == "Hadir" -> Emerald500.copy(alpha = 0.25f)
                                                opt == "Sakit" -> Color(0xFFF59E0B).copy(alpha = 0.25f)
                                                opt == "Izin" -> Color(0xFF3B82F6).copy(alpha = 0.25f)
                                                else -> Red500.copy(alpha = 0.25f)
                                            }

                                            val borderCol = when {
                                                !isSelected -> Color.White.copy(alpha = 0.08f)
                                                opt == "Hadir" -> Emerald400
                                                opt == "Sakit" -> Color(0xFFFBBF24)
                                                opt == "Izin" -> Color(0xFF60A5FA)
                                                else -> Red500
                                            }

                                            val textCol = when {
                                                !isSelected -> Slate400
                                                opt == "Hadir" -> Emerald400
                                                opt == "Sakit" -> Color(0xFFFBBF24)
                                                opt == "Izin" -> Color(0xFF60A5FA)
                                                else -> Red500
                                            }

                                            Box(
                                                modifier = Modifier
                                                    .weight(1f)
                                                    .clip(RoundedCornerShape(12.dp))
                                                    .background(bg)
                                                    .border(1.dp, borderCol, RoundedCornerShape(12.dp))
                                                    .clickable {
                                                        // Instant auto sync on status pill tap
                                                        viewModel.updateAndSaveAttendanceState(
                                                            santriId = santri.id,
                                                            status = opt,
                                                            prayerTime = activePrayerTime
                                                        )
                                                    }
                                                    .padding(vertical = 10.dp),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Text(
                                                    text = opt,
                                                    fontSize = 12.sp,
                                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
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
    }
}
