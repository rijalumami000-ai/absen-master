package com.alhamid.absen.mobile.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.alhamid.absen.mobile.ui.theme.*
import com.alhamid.absen.mobile.ui.viewmodel.AttendanceViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    viewModel: AttendanceViewModel,
    onNavigateToManual: () -> Unit
) {
    val timeString by viewModel.timeString.collectAsState()
    val isSyncing by viewModel.isSyncing.collectAsState()
    val lastSyncText by viewModel.lastSyncText.collectAsState()

    val isSensorConnected by viewModel.isSensorConnected.collectAsState()
    val sensorStatusMessage by viewModel.sensorStatusMessage.collectAsState()
    val lastMatchedSantri by viewModel.lastMatchedSantri.collectAsState()
    val scanErrorMessage by viewModel.scanErrorMessage.collectAsState()

    // Debug test simulation states
    var simFpId by remember { mutableStateOf("") }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate50)
            .padding(horizontal = 24.dp, vertical = 16.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // HEADER BRANDING
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = viewModel.getGreeting(),
                        fontSize = 14.sp,
                        color = Slate500,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Ponpes Al-Hamid",
                        fontSize = 22.sp,
                        color = Slate900,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = (-0.5).sp
                    )
                }

                // Sync button
                IconButton(
                    onClick = { viewModel.syncDatabase() },
                    enabled = !isSyncing,
                    modifier = Modifier
                        .background(Color.White, RoundedCornerShape(12.dp))
                        .size(44.dp)
                ) {
                    if (isSyncing) {
                        CircularProgressIndicator(
                            color = Emerald500,
                            strokeWidth = 2.dp,
                            modifier = Modifier.size(20.dp)
                        )
                    } else {
                        Text(
                            text = "🔄",
                            fontSize = 18.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // TIME & ACTIVE SHOLAT CARD
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .background(
                        Brush.linearGradient(
                            colors = listOf(Indigo500, Indigo600)
                        )
                    )
                    .padding(20.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Box(
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.2f))
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "Sholat ${viewModel.getActiveSholat()}",
                                color = Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = timeString,
                            color = Color.White,
                            fontSize = 32.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.sp
                        )
                    }
                    Text(
                        text = "⏰",
                        fontSize = 48.sp,
                        color = Color.White.copy(alpha = 0.3f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // MAIN SCANNER CONTAINER
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(24.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    // Pulse animation helper
                    val infiniteTransition = rememberInfiniteTransition()
                    val pulseScale by infiniteTransition.animateFloat(
                        initialValue = 1f,
                        targetValue = 1.08f,
                        animationSpec = infiniteRepeatable(
                            animation = tween(1500),
                            repeatMode = RepeatMode.Reverse
                        )
                    )

                    // Scanner circle
                    Box(
                        modifier = Modifier
                            .size(140.dp)
                            .scale(if (isSensorConnected) pulseScale else 1f)
                            .clip(CircleShape)
                            .background(
                                when {
                                    scanErrorMessage != null -> Red500.copy(alpha = 0.1f)
                                    isSensorConnected -> Emerald500.copy(alpha = 0.1f)
                                    else -> Slate50
                                }
                            )
                            .clickable {
                                if (!isSensorConnected) {
                                    viewModel.connectSensor()
                                }
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "☝️",
                            fontSize = 64.sp,
                            textAlign = TextAlign.Center
                        )
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    Text(
                        text = sensorStatusMessage,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (scanErrorMessage != null) Red500 else Slate900,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = lastSyncText,
                        fontSize = 12.sp,
                        color = Slate500
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // MATCHED SANTRI OVERLAY CARD
            AnimatedVisibility(visible = lastMatchedSantri != null) {
                lastMatchedSantri?.let { santri ->
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(Emerald50)
                            .padding(16.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(CircleShape)
                                    .background(Emerald500),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "✓",
                                    color = Color.White,
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Spacer(modifier = Modifier.width(16.dp))
                            Column {
                                Text(
                                    text = santri.name,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Emerald600
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "Kamar ${santri.room} • ${santri.gender}",
                                    fontSize = 12.sp,
                                    color = Emerald600.copy(alpha = 0.8f)
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // SIMULATOR PANEL FOR TESTING
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.White)
                    .padding(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = simFpId,
                        onValueChange = { simFpId = it },
                        label = { Text("Simulate FP ID", fontSize = 10.sp) },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            if (simFpId.isNotEmpty()) {
                                viewModel.processFingerprintScan(simFpId)
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Indigo500)
                    ) {
                        Text("Scan Test", fontSize = 12.sp)
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // FOOTER NAVIGATION: GO TO ABSENSI MANUAL
            Button(
                onClick = onNavigateToManual,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Slate50.copy(alpha = 0.9f),
                    contentColor = Slate900
                ),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
            ) {
                Text(
                    text = "📄 Buka Absensi Manual",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
