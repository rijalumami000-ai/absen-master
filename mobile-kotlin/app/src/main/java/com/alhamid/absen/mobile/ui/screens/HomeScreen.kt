package com.alhamid.absen.mobile.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
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

    // Smooth pulse animation for scanner ring
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.08f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF090D16), // Dark Slate 950
                        Color(0xFF0F172A), // Dark Slate 900
                        Color(0xFF1E293B)  // Slate 800
                    )
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // TOP HEADER BAR: BRANDING & SYNC BUTTON
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = viewModel.getGreeting().uppercase(),
                        fontSize = 11.sp,
                        color = Emerald400,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.5.sp
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "SISTEM ABSENSI BIOMETRIK",
                        fontSize = 19.sp,
                        color = Color.White,
                        fontWeight = FontWeight.Black,
                        letterSpacing = (-0.3).sp
                    )
                    Text(
                        text = "Pondok Pesantren Al-Hamid",
                        fontSize = 12.sp,
                        color = Slate400,
                        fontWeight = FontWeight.Medium
                    )
                }

                // GLASS REFRESH / SYNC BUTTON
                Surface(
                    onClick = { viewModel.syncDatabase() },
                    enabled = !isSyncing,
                    shape = RoundedCornerShape(16.dp),
                    color = Color.White.copy(alpha = 0.07f),
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        Color.White.copy(alpha = 0.12f)
                    ),
                    modifier = Modifier.size(48.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        if (isSyncing) {
                            CircularProgressIndicator(
                                color = Emerald400,
                                strokeWidth = 2.5.dp,
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
            }

            Spacer(modifier = Modifier.height(16.dp))

            // MODERN ULTRA-SLEEK CLOCK & PRAYER BANNER (Request #2)
            Surface(
                shape = RoundedCornerShape(26.dp),
                color = Color.White.copy(alpha = 0.05f),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.12f)),
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(16.dp, RoundedCornerShape(26.dp), ambientColor = Emerald500.copy(alpha = 0.2f))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.linearGradient(
                                colors = listOf(
                                    Color(0xFF1E293B).copy(alpha = 0.8f),
                                    Color(0xFF0F172A).copy(alpha = 0.9f)
                                )
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
                            // LIVE PRAYER BADGE
                            Surface(
                                shape = CircleShape,
                                color = Emerald500.copy(alpha = 0.18f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Emerald400.copy(alpha = 0.4f))
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(6.dp)
                                            .clip(CircleShape)
                                            .background(Emerald400)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "WAKTU SHOLAT ${viewModel.getActiveSholat().uppercase()}",
                                        color = Emerald400,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        letterSpacing = 1.sp
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // DIGITAL CLOCK
                            Text(
                                text = timeString.ifEmpty { "00:00:00" },
                                color = Color.White,
                                fontSize = 42.sp,
                                fontWeight = FontWeight.Black,
                                letterSpacing = 2.5.sp
                            )
                        }

                        Text(
                            text = "🕌",
                            fontSize = 48.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // MAIN SENSOR SCANNER CONTAINER
            Surface(
                shape = RoundedCornerShape(28.dp),
                color = Color.White.copy(alpha = 0.04f),
                border = androidx.compose.foundation.BorderStroke(
                    1.dp,
                    Color.White.copy(alpha = 0.08f)
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    // HARDWARE STATUS BADGE
                    Surface(
                        shape = CircleShape,
                        color = when {
                            scanErrorMessage != null -> Red500.copy(alpha = 0.15f)
                            isSensorConnected -> Emerald500.copy(alpha = 0.15f)
                            else -> Amber500.copy(alpha = 0.15f)
                        },
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            when {
                                scanErrorMessage != null -> Red500.copy(alpha = 0.4f)
                                isSensorConnected -> Emerald400.copy(alpha = 0.4f)
                                else -> Amber500.copy(alpha = 0.4f)
                            }
                        )
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(
                                        when {
                                            scanErrorMessage != null -> Red500
                                            isSensorConnected -> Emerald400
                                            else -> Amber500
                                        }
                                    )
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (isSensorConnected) "SENSOR USB ONLINE" else "SENSOR TERPUTUS",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = when {
                                    scanErrorMessage != null -> Red500
                                    isSensorConnected -> Emerald400
                                    else -> Amber500
                                },
                                letterSpacing = 1.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(28.dp))

                    // GLOWING SCANNER PAD CIRCLE
                    Box(
                        modifier = Modifier
                            .size(150.dp)
                            .scale(if (isSensorConnected) pulseScale else 1f)
                            .clip(CircleShape)
                            .background(
                                when {
                                    scanErrorMessage != null -> Red500.copy(alpha = 0.15f)
                                    isSensorConnected -> Emerald500.copy(alpha = 0.12f)
                                    else -> Color.White.copy(alpha = 0.03f)
                                }
                            )
                            .border(
                                2.dp,
                                when {
                                    scanErrorMessage != null -> Red500
                                    isSensorConnected -> Emerald400
                                    else -> Color.White.copy(alpha = 0.15f)
                                },
                                CircleShape
                            )
                            .clickable {
                                // Touch sensor trigger: matches fingerprint & triggers audio + popup
                                viewModel.onSensorTouchedOrScanned()
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = if (isSensorConnected) "☝️" else "🔌",
                            fontSize = 64.sp,
                            textAlign = TextAlign.Center
                        )
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    Text(
                        text = sensorStatusMessage,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (scanErrorMessage != null) Red500 else Color.White,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = lastSyncText,
                        fontSize = 11.sp,
                        color = Slate400
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // BOTTOM NAVIGATION BUTTON: GO TO MANUAL ATTENDANCE
            Button(
                onClick = onNavigateToManual,
                colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                contentPadding = PaddingValues(),
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(
                                Color(0xFF6366F1), // Indigo 500
                                Color(0xFF4F46E5)  // Indigo 600
                            )
                        ),
                        shape = RoundedCornerShape(20.dp)
                    )
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "📋  BUKA ABSENSI MANUAL",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        letterSpacing = 0.5.sp
                    )
                }
            }
        }

        // FULL POPUP OVERLAY ON SCAN SUCCESS (Request #1: Popup Absensi Berhasil Seperti di Web)
        AnimatedVisibility(
            visible = lastMatchedSantri != null,
            enter = fadeIn() + slideInVertically(initialOffsetY = { it }),
            exit = fadeOut() + slideOutVertically(targetOffsetY = { it })
        ) {
            lastMatchedSantri?.let { santri ->
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.75f))
                        .clickable { viewModel.dismissMatchedOverlay() },
                    contentAlignment = Alignment.Center
                ) {
                    Surface(
                        shape = RoundedCornerShape(32.dp),
                        color = Color(0xFF0F172A),
                        border = androidx.compose.foundation.BorderStroke(1.5.dp, Emerald400),
                        modifier = Modifier
                            .fillMaxWidth(0.9f)
                            .padding(20.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(28.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            // SUCCESS BADGE HEADER
                            Surface(
                                shape = CircleShape,
                                color = Emerald500.copy(alpha = 0.2f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Emerald400)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                                ) {
                                    Text("✅", fontSize = 16.sp)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "ABSENSI BERHASIL",
                                        color = Emerald400,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Black,
                                        letterSpacing = 1.sp
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(24.dp))

                            // SANTRI PROFILE PHOTO
                            Box(
                                modifier = Modifier
                                    .size(110.dp)
                                    .clip(CircleShape)
                                    .background(Emerald500.copy(alpha = 0.15f))
                                    .border(3.dp, Emerald400, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                if (!santri.photoUrl.isNullOrEmpty()) {
                                    val formattedPhotoUrl = if (santri.photoUrl.startsWith("http")) {
                                        santri.photoUrl
                                    } else {
                                        "https://absen.alhamidcintamulya.my.id/sekolah-info-static${if (santri.photoUrl.startsWith("/")) "" else "/"}${santri.photoUrl}"
                                    }
                                    AsyncImage(
                                        model = formattedPhotoUrl,
                                        contentDescription = santri.name,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.fillMaxSize().clip(CircleShape)
                                    )
                                } else {
                                    Text(
                                        text = "👤",
                                        fontSize = 54.sp
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(20.dp))

                            // SANTRI NAME
                            Text(
                                text = santri.name,
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.White,
                                textAlign = TextAlign.Center
                            )

                            Spacer(modifier = Modifier.height(6.dp))

                            // ROOM & GENDER DETAILS
                            Text(
                                text = "Kamar ${santri.room} • ${santri.gender}",
                                fontSize = 14.sp,
                                color = Emerald400,
                                fontWeight = FontWeight.SemiBold
                            )

                            Spacer(modifier = Modifier.height(16.dp))

                            Surface(
                                shape = RoundedCornerShape(14.dp),
                                color = Color.White.copy(alpha = 0.05f),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceAround
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text("ID SANTRI", fontSize = 10.sp, color = Slate400, fontWeight = FontWeight.Bold)
                                        Text("#${santri.id}", fontSize = 13.sp, color = Color.White, fontWeight = FontWeight.Bold)
                                    }
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text("SHOLAT", fontSize = 10.sp, color = Slate400, fontWeight = FontWeight.Bold)
                                        Text(viewModel.getActiveSholat(), fontSize = 13.sp, color = Emerald400, fontWeight = FontWeight.Bold)
                                    }
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text("STATUS", fontSize = 10.sp, color = Slate400, fontWeight = FontWeight.Bold)
                                        Text("HADIR", fontSize = 13.sp, color = Emerald400, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(24.dp))

                            // CLOSE BUTTON
                            Button(
                                onClick = { viewModel.dismissMatchedOverlay() },
                                colors = ButtonDefaults.buttonColors(containerColor = Emerald600),
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("TUTUP", fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    }
                }
            }
        }
    }
}
