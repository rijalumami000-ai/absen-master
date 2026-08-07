import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Clock, 
  UserCheck, 
  Volume2, 
  VolumeX, 
  Sparkles,
  AlertCircle,
  ShieldCheck,
  Zap,
  Users
} from 'lucide-react';
import { faceService, attendanceService } from '../services/api';

interface AttendanceLog {
  id: number;
  santri_name: string;
  room: string;
  prayer_time: string;
  status: string;
  method: string;
  confidence?: number;
  scanned_at: string;
}

export const AbsensiWajah: React.FC = () => {
  const [prayerTime, setPrayerTime] = useState<string>('Maghrib');
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [scanResult, setScanResult] = useState<{
    matched: boolean;
    name?: string;
    room?: string;
    confidence?: number;
    message?: string;
    timestamp?: string;
  } | null>(null);

  const [todayLogs, setTodayLogs] = useState<AttendanceLog[]>([]);
  const [faceCount, setFaceCount] = useState<number>(0);
  const [isProcessingFrame, setIsProcessingFrame] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanIntervalRef = useRef<any>(null);
  const lastScannedSantriRef = useRef<{ id: number; time: number } | null>(null);

  // Auto detect current prayer time based on hour
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) setPrayerTime('Subuh');
    else if (hour >= 11 && hour < 15) setPrayerTime('Dzuhur');
    else if (hour >= 15 && hour < 18) setPrayerTime('Ashar');
    else if (hour >= 18 && hour < 19) setPrayerTime('Maghrib');
    else setPrayerTime('Isya');
  }, []);

  // Fetch initial today attendance logs
  useEffect(() => {
    const loadTodayLogs = async () => {
      try {
        const data = await attendanceService.getToday(prayerTime);
        if (Array.isArray(data)) {
          const mapped: AttendanceLog[] = data.map((item: any) => ({
            id: item.id,
            santri_name: item.santri_name || item.santri?.name || 'Santri',
            room: item.room || item.santri?.room || '-',
            prayer_time: item.prayer_time,
            status: item.status,
            method: item.method,
            confidence: item.face_confidence,
            scanned_at: item.scanned_at ? new Date(item.scanned_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'
          }));
          setTodayLogs(mapped);
          setFaceCount(mapped.filter(m => m.method === 'Face').length);
        }
      } catch (err) {
        console.error('Failed to load today logs:', err);
      }
    };
    loadTodayLogs();
  }, [prayerTime]);

  // Connect to SSE Stream for real-time attendance feed
  useEffect(() => {
    const streamUrl = attendanceService.getStreamUrl();
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'attendance_logged' || data.type === 'attendance_logged') {
          const logData = data.data || data;
          const newLog: AttendanceLog = {
            id: logData.id || Date.now(),
            santri_name: logData.santri_name,
            room: logData.room || '-',
            prayer_time: logData.prayer_time,
            status: logData.status || 'Hadir',
            method: logData.method || 'Face',
            confidence: logData.confidence,
            scanned_at: logData.scanned_at || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          };

          setTodayLogs((prev) => [newLog, ...prev.filter(p => p.id !== newLog.id)]);
          if (newLog.method === 'Face') {
            setFaceCount((prev) => prev + 1);
          }
        }
      } catch (e) {
        console.error('Error parsing SSE event:', e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Initialize WebCam stream with fallback
  const startCamera = async () => {
    try {
      setCameraError(null);

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: false
        });
      } catch (e1) {
        console.warn('Initial camera constraint failed, trying fallback video=true:', e1);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      let msg = 'Gagal mengakses kamera web. Pastikan izin kamera telah diberikan di browser.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Izin kamera ditolak oleh browser. Klik ikon gembok/kamera pada address bar browser untuk mengizinkan akses kamera, lalu klik Coba Lagi.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Tidak ada perangkat kamera yang terdeteksi di laptop/PC ini. Pastikan webcam terpasang.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Kamera sedang digunakan oleh aplikasi lain (seperti Zoom/Meet/Kamera Windows). Tutup aplikasi tersebut dan klik Coba Lagi.';
      }
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  useEffect(() => {
    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Text to Speech Audio Feedback
  const speakText = (text: string) => {
    if (!soundEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Speech synthesis error:', e);
    }
  };

  // Capture frame & scan loop
  useEffect(() => {
    if (!isScanning || !cameraActive || isProcessingFrame) return;

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || isProcessingFrame) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);

      setIsProcessingFrame(true);

      try {
        const res = await faceService.scan({
          image_base64: imageBase64,
          prayer_time: prayerTime
        });

        if (res.matched && res.santri_name) {
          const now = Date.now();

          // Anti duplicate spam check (3 seconds debounce per santri)
          if (
            lastScannedSantriRef.current &&
            lastScannedSantriRef.current.id === res.santri_id &&
            now - lastScannedSantriRef.current.time < 4000
          ) {
            setIsProcessingFrame(false);
            return;
          }

          lastScannedSantriRef.current = { id: res.santri_id!, time: now };

          setScanResult({
            matched: true,
            name: res.santri_name,
            room: res.room,
            confidence: res.confidence,
            message: res.message,
            timestamp: new Date().toLocaleTimeString('id-ID')
          });

          // Trigger audio feedback
          speakText(`${res.santri_name}, Hadir ${res.prayer_time}`);
        } else if (res.message && res.message.includes('tidak cocok')) {
          setScanResult({
            matched: false,
            message: res.message,
            confidence: res.confidence,
            timestamp: new Date().toLocaleTimeString('id-ID')
          });
        }
      } catch (err) {
        console.error('Scan face request failed:', err);
      } finally {
        setIsProcessingFrame(false);
      }
    }, 600);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [isScanning, cameraActive, isProcessingFrame, prayerTime, soundEnabled]);

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        padding: '24px 32px',
        borderRadius: '20px',
        color: '#ffffff',
        boxShadow: '0 10px 25px -5px rgba(49, 46, 129, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            width: '56px', 
            height: '56px', 
            borderRadius: '16px', 
            backgroundColor: 'rgba(255, 255, 255, 0.1)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <Camera size={30} color="#818cf8" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Kios Absensi Wajah (Face Recognition)
              </h1>
              <span style={{ 
                backgroundColor: '#10b981', 
                color: '#ffffff', 
                fontSize: '11px', 
                fontWeight: 700, 
                padding: '3px 10px', 
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Sparkles size={12} /> AI Powered
              </span>
            </div>
            <p style={{ color: '#c7d2fe', fontSize: '13px', marginTop: '4px', margin: 0 }}>
              Absensi santri otomatis secara real-time via kamera web dengan pencocokan 512-D ArcFace Vector
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: soundEnabled ? 'rgba(255, 255, 255, 0.15)' : 'rgba(239, 68, 68, 0.2)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '10px 16px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              transition: 'all 0.2s'
            }}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {soundEnabled ? 'Suara Aktif' : 'Suara Mute'}
          </button>

          <button
            onClick={() => setIsScanning(!isScanning)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: isScanning ? '#10b981' : '#f59e0b',
              color: '#ffffff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
          >
            <Zap size={16} />
            {isScanning ? 'Scanner AKTIF' : 'Scanner PAUSED'}
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
        
        {/* Left Column: Live Camera & Scanner */}
        <div>
          {/* Prayer Time Selector Tabs */}
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            marginBottom: '16px', 
            backgroundColor: '#ffffff', 
            padding: '8px', 
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9'
          }}>
            {['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'].map((time) => {
              const isActive = prayerTime === time;
              return (
                <button
                  key={time}
                  onClick={() => setPrayerTime(time)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: isActive ? '#4f46e5' : 'transparent',
                    color: isActive ? '#ffffff' : '#64748b',
                    fontWeight: isActive ? 700 : 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Clock size={16} />
                  {time}
                </button>
              );
            })}
          </div>

          {/* Camera Frame Container */}
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            height: '480px', 
            backgroundColor: '#0f172a', 
            borderRadius: '24px', 
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            border: '3px solid #1e293b'
          }}>
            <video
              ref={videoRef}
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)' // Mirror view for natural interaction
              }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Oval Face Guide Overlay */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '260px',
              height: '340px',
              borderRadius: '50%',
              border: scanResult?.matched ? '4px solid #10b981' : '3px dashed rgba(255, 255, 255, 0.5)',
              boxShadow: scanResult?.matched 
                ? '0 0 30px rgba(16, 185, 129, 0.8), inset 0 0 20px rgba(16, 185, 129, 0.3)' 
                : '0 0 20px rgba(0, 0, 0, 0.5)',
              transition: 'all 0.3s ease',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {!cameraActive && !cameraError && (
                <div style={{ color: '#ffffff', textAlign: 'center' }}>
                  <RefreshCw size={32} className="spin-icon" style={{ marginBottom: '8px' }} />
                  <div>Menghubungkan Kamera...</div>
                </div>
              )}
            </div>

            {/* Floating Top Badge */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(10px)',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <span style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                backgroundColor: isScanning && cameraActive ? '#10b981' : '#ef4444',
                boxShadow: isScanning && cameraActive ? '0 0 8px #10b981' : 'none'
              }} />
              {cameraActive ? (isScanning ? 'Mendeteksi Wajah Real-time...' : 'Scanner Pause') : 'Kamera Offline'}
            </div>

            {/* Bottom Floating Match Banner */}
            {scanResult && (
              <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                right: '20px',
                backgroundColor: scanResult.matched ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
                backdropFilter: 'blur(12px)',
                color: '#ffffff',
                padding: '16px 24px',
                borderRadius: '18px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                animation: 'slideUp 0.3s ease-out'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {scanResult.matched ? (
                    <CheckCircle2 size={32} color="#ffffff" />
                  ) : (
                    <XCircle size={32} color="#ffffff" />
                  )}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '16px' }}>
                      {scanResult.matched ? scanResult.name : 'Wajah Tidak Dikenali'}
                    </div>
                    <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '2px' }}>
                      {scanResult.matched 
                        ? `Kamar ${scanResult.room} • Akurasi: ${scanResult.confidence}% • ${scanResult.timestamp}`
                        : scanResult.message}
                    </div>
                  </div>
                </div>

                {scanResult.matched && (
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    padding: '6px 14px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 700
                  }}>
                    HADIR {prayerTime.toUpperCase()}
                  </div>
                )}
              </div>
            )}

            {/* Error Overlay */}
            {cameraError && (
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                padding: '32px',
                textAlign: 'center'
              }}>
                <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>Akses Kamera Terkendala</h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '440px', margin: '0 0 20px 0', lineHeight: '1.5' }}>{cameraError}</p>
                
                <button
                  onClick={startCamera}
                  style={{
                    backgroundColor: '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)'
                  }}
                >
                  <RefreshCw size={16} /> Coba Hubungkan Kamera
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Today Logs & Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Quick Stats Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            <div style={{
              backgroundColor: '#e0e7ff',
              borderRadius: '14px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#4338ca' }}>HADIR VIA WAJAH</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={20} color="#4f46e5" />
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#312e81' }}>{faceCount}</span>
              </div>
            </div>

            <div style={{
              backgroundColor: '#ecfdf5',
              borderRadius: '14px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#047857' }}>TOTAL HADIR</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} color="#10b981" />
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#064e3b' }}>{todayLogs.length}</span>
              </div>
            </div>
          </div>

          {/* Real-time Log Feed */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '430px',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Log Absensi Real-time ({prayerTime})
              </h3>
              <span style={{ 
                fontSize: '11px', 
                backgroundColor: '#f1f5f9', 
                color: '#64748b', 
                padding: '2px 8px', 
                borderRadius: '8px',
                fontWeight: 600
              }}>
                Live SSE
              </span>
            </div>

            {/* List */}
            <div style={{ 
              overflowY: 'auto', 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '10px',
              paddingRight: '4px'
            }}>
              {todayLogs.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px', 
                  color: '#94a3b8',
                  fontSize: '13px'
                }}>
                  Belum ada santri yang melakukan absensi untuk waktu sholat {prayerTime}.
                </div>
              ) : (
                todayLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '14px',
                      backgroundColor: log.method === 'Face' ? '#f5f3ff' : '#f8fafc',
                      border: log.method === 'Face' ? '1px solid #ddd6fe' : '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                        {log.santri_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        Kamar: {log.room} • {log.scanned_at}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '8px',
                        backgroundColor: log.method === 'Face' ? '#8b5cf6' : (log.method === 'Fingerprint' ? '#10b981' : '#3b82f6'),
                        color: '#ffffff',
                        display: 'inline-block'
                      }}>
                        {log.method === 'Face' ? `Face ${log.confidence ? `(${log.confidence}%)` : ''}` : log.method}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
