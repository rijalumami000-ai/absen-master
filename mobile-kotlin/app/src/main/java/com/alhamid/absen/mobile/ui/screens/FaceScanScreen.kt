package com.alhamid.absen.mobile.ui.screens

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.AudioManager
import android.media.ToneGenerator
import android.speech.tts.TextToSpeech
import android.util.Base64
import android.util.Log
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import coil.compose.AsyncImage
import com.alhamid.absen.mobile.data.remote.ApiService
import com.alhamid.absen.mobile.data.remote.FaceScanRequestDto
import com.alhamid.absen.mobile.data.remote.FaceScanResponseDto
import com.alhamid.absen.mobile.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.util.*
import java.util.concurrent.Executors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FaceScanScreen(
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    val apiService = remember { ApiService.create() }

    var selectedPrayer by remember { mutableStateOf("Subuh") }
    var isScanning by remember { mutableStateOf(false) }
    var resultDialog by remember { mutableStateOf<FaceScanResponseDto?>(null) }
    var statusMessage by remember { mutableStateOf<String?>(null) }
    var cameraLens by remember { mutableStateOf(CameraSelector.LENS_FACING_FRONT) }

    // Android Native TextToSpeech Engine
    var ttsEngine by remember { mutableStateOf<TextToSpeech?>(null) }

    DisposableEffect(context) {
        val tts = TextToSpeech(context) { status ->
            if (status == TextToSpeech.SUCCESS) {
                ttsEngine?.language = Locale("id", "ID")
            }
        }
        ttsEngine = tts
        onDispose {
            tts.stop()
            tts.shutdown()
        }
    }

    // CameraX Capture UseCase holder
    val imageCapture = remember { ImageCapture.Builder().build() }
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }

    fun playChimeSound() {
        try {
            val toneG = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 100)
            toneG.startTone(ToneGenerator.TONE_PROP_BEEP, 200)
        } catch (e: Exception) {
            Log.e("FaceScan", "Error playing chime", e)
        }
    }

    fun speakVoice(text: String) {
        try {
            ttsEngine?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "FaceScanTTS")
        } catch (e: Exception) {
            Log.e("FaceScan", "TTS error", e)
        }
    }

    fun captureAndScan() {
        if (isScanning) return
        isScanning = true
        statusMessage = "Memproses pemindaian wajah..."

        imageCapture.takePicture(
            cameraExecutor,
            object : ImageCapture.OnImageCapturedCallback() {
                override fun onCaptureSuccess(imageProxy: ImageProxy) {
                    val rotatedBitmap = imageProxyToBitmap(imageProxy)
                    imageProxy.close()

                    val base64Str = bitmapToBase64(rotatedBitmap)

                    scope.launch(Dispatchers.IO) {
                        try {
                            val response = apiService.scanFace(
                                FaceScanRequestDto(
                                    imageBase64 = "data:image/jpeg;base64,$base64Str",
                                    prayerTime = selectedPrayer
                                )
                            )

                            withContext(Dispatchers.Main) {
                                isScanning = false
                                if (response.isSuccessful && response.body() != null) {
                                    val result = response.body()!!
                                    resultDialog = result

                                    if (result.matched) {
                                        playChimeSound()
                                        val name = result.santriName ?: "Santri"
                                        speakVoice("Terima kasih $name, absensi sholat $selectedPrayer berhasil dicatat.")
                                        statusMessage = "Absensi Berhasil!"
                                    } else {
                                        speakVoice(result.message)
                                        statusMessage = result.message
                                    }
                                } else {
                                    statusMessage = "Gagal memproses pemindaian wajah ke server."
                                }
                            }
                        } catch (e: Exception) {
                            withContext(Dispatchers.Main) {
                                isScanning = false
                                statusMessage = "Koneksi terputus: ${e.localizedMessage}"
                            }
                        }
                    }
                }

                override fun onError(exception: ImageCaptureException) {
                    isScanning = false
                    statusMessage = "Gagal mengambil foto kamera."
                }
            }
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            // TOP BAR NAV
            Surface(
                color = Color(0xFF1E293B),
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onNavigateBack) {
                        Text("←", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    }

                    Text(
                        text = "ABSENSI WAJAH AI",
                        color = Color.White,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 0.5.sp
                    )

                    IconButton(onClick = {
                        cameraLens = if (cameraLens == CameraSelector.LENS_FACING_FRONT)
                            CameraSelector.LENS_FACING_BACK else CameraSelector.LENS_FACING_FRONT
                    }) {
                        Text("🔄", fontSize = 18.sp)
                    }
                }
            }

            // PRAYER TIME SELECTOR TABS
            Surface(
                color = Color(0xFF0F172A),
                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp, horizontal = 12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf("Subuh", "Dzuhur", "Ashar", "Maghrib", "Isya").forEach { time ->
                        val isSelected = selectedPrayer == time
                        Surface(
                            onClick = { selectedPrayer = time },
                            shape = RoundedCornerShape(14.dp),
                            color = if (isSelected) Color(0xFF6366F1) else Color.White.copy(alpha = 0.08f),
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (isSelected) Color(0xFF818CF8) else Color.White.copy(alpha = 0.12f)
                            ),
                            modifier = Modifier.weight(1f)
                        ) {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.padding(vertical = 10.dp)
                            ) {
                                Text(
                                    text = time,
                                    color = if (isSelected) Color.White else Slate400,
                                    fontSize = 12.sp,
                                    fontWeight = if (isSelected) FontWeight.Black else FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }

            // CAMERAX LIVE PREVIEW CONTAINER
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .padding(horizontal = 16.dp)
                    .clip(RoundedCornerShape(28.dp))
                    .background(Color.Black)
                    .border(2.dp, Color(0xFF6366F1).copy(alpha = 0.4f), RoundedCornerShape(28.dp)),
                contentAlignment = Alignment.Center
            ) {
                AndroidView(
                    factory = { ctx ->
                        val previewView = PreviewView(ctx)
                        val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                        cameraProviderFuture.addListener({
                            val cameraProvider = cameraProviderFuture.get()
                            val preview = Preview.Builder().build().also {
                                it.setSurfaceProvider(previewView.surfaceProvider)
                            }
                            val cameraSelector = CameraSelector.Builder()
                                .requireLensFacing(cameraLens)
                                .build()

                            try {
                                cameraProvider.unbindAll()
                                cameraProvider.bindToLifecycle(
                                    lifecycleOwner,
                                    cameraSelector,
                                    preview,
                                    imageCapture
                                )
                            } catch (exc: Exception) {
                                Log.e("FaceScan", "Use case binding failed", exc)
                            }
                        }, ContextCompat.getMainExecutor(ctx))
                        previewView
                    },
                    modifier = Modifier.fillMaxSize()
                )

                // SCANNER RING OVERLAY
                Box(
                    modifier = Modifier
                        .size(240.dp)
                        .clip(CircleShape)
                        .border(3.dp, Color(0xFF818CF8).copy(alpha = 0.6f), CircleShape)
                        .background(Color(0xFF6366F1).copy(alpha = 0.05f))
                )

                if (statusMessage != null) {
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = Color.Black.copy(alpha = 0.75f),
                        modifier = Modifier
                            .align(Alignment.TopCenter)
                            .padding(top = 16.dp)
                    ) {
                        Text(
                            text = statusMessage!!,
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // BIG CAPTURE & SUBMIT BUTTON
            Button(
                onClick = { captureAndScan() },
                enabled = !isScanning,
                shape = RoundedCornerShape(22.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                contentPadding = PaddingValues(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(58.dp)
                    .padding(horizontal = 16.dp)
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(
                                Color(0xFF10B981),
                                Color(0xFF059669)
                            )
                        ),
                        shape = RoundedCornerShape(22.dp)
                    )
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    if (isScanning) {
                        CircularProgressIndicator(color = Color.White, strokeWidth = 2.5.dp, modifier = Modifier.size(22.dp))
                        Spacer(modifier = Modifier.width(10.dp))
                        Text("Memproses Absensi...", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    } else {
                        Text("⚡  PINDAI & ABSEN WAJAH SEKARANG", fontSize = 15.sp, fontWeight = FontWeight.Black, color = Color.White)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }

        // NATIVE MATCH POPUP DIALOG
        resultDialog?.let { result ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.75f))
                    .clickable { resultDialog = null },
                contentAlignment = Alignment.Center
            ) {
                Surface(
                    shape = RoundedCornerShape(32.dp),
                    color = Color(0xFF0F172A),
                    border = androidx.compose.foundation.BorderStroke(2.dp, if (result.matched) Color(0xFF10B981) else Color(0xFFEF4444)),
                    modifier = Modifier
                        .fillMaxWidth(0.88f)
                        .padding(20.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(28.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = if (result.matched) Color(0xFF10B981).copy(alpha = 0.2f) else Color(0xFFEF4444).copy(alpha = 0.2f)
                        ) {
                            Text(
                                text = if (result.matched) "✅ ABSENSI BERHASIL" else "⚠️ ABSENSI GAGAL",
                                color = if (result.matched) Color(0xFF10B981) else Color(0xFFEF4444),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Black,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                            )
                        }

                        Spacer(modifier = Modifier.height(20.dp))

                        if (result.matched && !result.photoUrl.isNullOrEmpty()) {
                            AsyncImage(
                                model = result.photoUrl,
                                contentDescription = result.santriName,
                                modifier = Modifier
                                    .size(100.dp)
                                    .clip(CircleShape)
                                    .border(3.dp, Color(0xFF10B981), CircleShape)
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                        }

                        Text(
                            text = result.santriName ?: result.message,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White,
                            textAlign = TextAlign.Center
                        )

                        if (result.santriRoom != null) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Kamar ${result.santriRoom} • ${result.santriGender ?: ""}",
                                fontSize = 13.sp,
                                color = Color(0xFF10B981),
                                fontWeight = FontWeight.SemiBold
                            )
                        }

                        Spacer(modifier = Modifier.height(24.dp))

                        Button(
                            onClick = { resultDialog = null },
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
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

private fun imageProxyToBitmap(imageProxy: ImageProxy): Bitmap {
    val planeProxy = imageProxy.planes[0]
    val buffer = planeProxy.buffer
    val bytes = ByteArray(buffer.remaining())
    buffer.get(bytes)
    val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    return rotateBitmapIfNeeded(bitmap, imageProxy.imageInfo.rotationDegrees)
}

private fun rotateBitmapIfNeeded(bitmap: Bitmap, degrees: Int): Bitmap {
    if (degrees == 0) return bitmap
    val matrix = Matrix().apply { postRotate(degrees.toFloat()) }
    return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
}

private fun bitmapToBase64(bitmap: Bitmap): String {
    val outputStream = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.JPEG, 85, outputStream)
    val byteArray = outputStream.toByteArray()
    return Base64.encodeToString(byteArray, Base64.NO_WRAP)
}
