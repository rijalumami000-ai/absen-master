package com.alhamid.absen.mobile.ui.screens

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
fun RekapAttendanceScreen(
    viewModel: AttendanceViewModel,
    onBack: () -> Unit
) {
    val santriList by viewModel.santriList.collectAsState()
    val attendanceStates by viewModel.attendanceStates.collectAsState()

    var activePrayerTime by remember { mutableStateOf(viewModel.getActiveSholat()) }
    var selectedStatusFilter by remember { mutableStateOf("Semua") }
    var searchQuery by remember { mutableStateOf("") }

    var prayerDropdownOpen by remember { mutableStateOf(false) }
    var statusDropdownOpen by remember { mutableStateOf(false) }

    val statusOptions = listOf("Semua", "Hadir", "Sakit", "Izin", "Alfa", "Masbuq", "Haid", "Istihadhoh", "Tugas", "Terlambat")

    // Stats calculations
    val totalHadir = remember(attendanceStates) { attendanceStates.values.count { it == "Hadir" } }
    val totalSakit = remember(attendanceStates) { attendanceStates.values.count { it == "Sakit" } }
    val totalIzin = remember(attendanceStates) { attendanceStates.values.count { it == "Izin" } }
    val totalAlfa = remember(attendanceStates) { attendanceStates.values.count { it == "Alfa" } }
    val totalHaid = remember(attendanceStates) { attendanceStates.values.count { it == "Haid" } }

    val filteredSantri = remember(santriList, attendanceStates, selectedStatusFilter, searchQuery) {
        santriList.filter { santri ->
            val status = attendanceStates[santri.id] ?: "Hadir"
            val matchesStatus = if (selectedStatusFilter == "Semua") true else status == selectedStatusFilter
            val matchesQuery = if (searchQuery.isEmpty()) true else {
                santri.name.contains(searchQuery, ignoreCase = true) ||
                santri.room.contains(searchQuery, ignoreCase = true)
            }
            matchesStatus && matchesQuery
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
                                text = "Rekap Absensi Santri",
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                fontSize = 17.sp
                            )
                            Text(
                                text = "Laporan & Statistik Kehadiran Real-Time",
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
                // STATS CARDS BAR
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = Emerald500.copy(alpha = 0.15f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Emerald400.copy(alpha = 0.3f)),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(
                            modifier = Modifier.padding(10.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("HADIR", fontSize = 9.sp, color = Emerald400, fontWeight = FontWeight.Bold)
                            Text("$totalHadir", fontSize = 16.sp, color = Color.White, fontWeight = FontWeight.Black)
                        }
                    }

                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = Color(0xFFF59E0B).copy(alpha = 0.15f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFBBF24).copy(alpha = 0.3f)),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(
                            modifier = Modifier.padding(10.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("SAKIT", fontSize = 9.sp, color = Color(0xFFFBBF24), fontWeight = FontWeight.Bold)
                            Text("$totalSakit", fontSize = 16.sp, color = Color.White, fontWeight = FontWeight.Black)
                        }
                    }

                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = Color(0xFF3B82F6).copy(alpha = 0.15f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF60A5FA).copy(alpha = 0.3f)),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(
                            modifier = Modifier.padding(10.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("IZIN", fontSize = 9.sp, color = Color(0xFF60A5FA), fontWeight = FontWeight.Bold)
                            Text("$totalIzin", fontSize = 16.sp, color = Color.White, fontWeight = FontWeight.Black)
                        }
                    }

                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = Red500.copy(alpha = 0.15f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Red500.copy(alpha = 0.3f)),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(
                            modifier = Modifier.padding(10.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("ALFA", fontSize = 9.sp, color = Red500, fontWeight = FontWeight.Bold)
                            Text("$totalAlfa", fontSize = 16.sp, color = Color.White, fontWeight = FontWeight.Black)
                        }
                    }

                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = Color(0xFFEC4899).copy(alpha = 0.15f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFF472B6).copy(alpha = 0.3f)),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(
                            modifier = Modifier.padding(10.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("HAID", fontSize = 9.sp, color = Color(0xFFF472B6), fontWeight = FontWeight.Bold)
                            Text("$totalHaid", fontSize = 16.sp, color = Color.White, fontWeight = FontWeight.Black)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // FILTER BAR
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Color.White.copy(alpha = 0.05f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.1f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            // PRAYER TIME FILTER
                            Box(modifier = Modifier.weight(1f)) {
                                Surface(
                                    onClick = { prayerDropdownOpen = true },
                                    shape = RoundedCornerShape(12.dp),
                                    color = Color.White.copy(alpha = 0.08f),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.12f)),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(
                                        text = "🕌 $activePrayerTime ▼",
                                        fontSize = 12.sp,
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(8.dp)
                                    )
                                }
                                DropdownMenu(
                                    expanded = prayerDropdownOpen,
                                    onDismissRequest = { prayerDropdownOpen = false }
                                ) {
                                    listOf("Subuh", "Dzuhur", "Ashar", "Maghrib", "Isya").forEach { p ->
                                        DropdownMenuItem(
                                            text = { Text(p) },
                                            onClick = {
                                                activePrayerTime = p
                                                prayerDropdownOpen = false
                                            }
                                        )
                                    }
                                }
                            }

                            // STATUS FILTER
                            Box(modifier = Modifier.weight(1f)) {
                                Surface(
                                    onClick = { statusDropdownOpen = true },
                                    shape = RoundedCornerShape(12.dp),
                                    color = Color.White.copy(alpha = 0.08f),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.12f)),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(
                                        text = "🏷️ $selectedStatusFilter ▼",
                                        fontSize = 12.sp,
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(8.dp)
                                    )
                                }
                                DropdownMenu(
                                    expanded = statusDropdownOpen,
                                    onDismissRequest = { statusDropdownOpen = false }
                                ) {
                                    statusOptions.forEach { st ->
                                        DropdownMenuItem(
                                            text = { Text(st) },
                                            onClick = {
                                                selectedStatusFilter = st
                                                statusDropdownOpen = false
                                            }
                                        )
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // SEARCH FIELD
                        OutlinedTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            placeholder = { Text("Cari nama santri...", color = Slate400, fontSize = 12.sp) },
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

                Spacer(modifier = Modifier.height(14.dp))

                // SANTRI REKAP LIST
                if (filteredSantri.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("📊", fontSize = 36.sp)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("Tidak ada data absensi yang cocok", color = Slate400, fontSize = 13.sp)
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        contentPadding = PaddingValues(bottom = 16.dp)
                    ) {
                        items(filteredSantri) { santri ->
                            val status = attendanceStates[santri.id] ?: "Hadir"

                            val (badgeBg, badgeBorder, badgeText) = when (status) {
                                "Hadir" -> Triple(Emerald500.copy(alpha = 0.2f), Emerald400, Emerald400)
                                "Sakit" -> Triple(Color(0xFFF59E0B).copy(alpha = 0.2f), Color(0xFFFBBF24), Color(0xFFFBBF24))
                                "Izin" -> Triple(Color(0xFF3B82F6).copy(alpha = 0.2f), Color(0xFF60A5FA), Color(0xFF60A5FA))
                                "Alfa" -> Triple(Red500.copy(alpha = 0.2f), Red500, Red500)
                                "Masbuq" -> Triple(Color(0xFF8B5CF6).copy(alpha = 0.2f), Color(0xFFA78BFA), Color(0xFFA78BFA))
                                "Haid" -> Triple(Color(0xFFEC4899).copy(alpha = 0.2f), Color(0xFFF472B6), Color(0xFFF472B6))
                                else -> Triple(Color(0xFF14B8A6).copy(alpha = 0.2f), Color(0xFF2DD4BF), Color(0xFF2DD4BF))
                            }

                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = Color.White.copy(alpha = 0.05f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.08f)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(14.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(santri.name, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text("Kamar ${santri.room} • ${santri.gender}", fontSize = 11.sp, color = Slate400)
                                    }

                                    Surface(
                                        shape = CircleShape,
                                        color = badgeBg,
                                        border = androidx.compose.foundation.BorderStroke(1.dp, badgeBorder)
                                    ) {
                                        Text(
                                            text = status.uppercase(),
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Black,
                                            color = badgeText,
                                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp)
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
