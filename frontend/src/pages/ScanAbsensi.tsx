import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Fingerprint, 
  Lock, 
  Unlock, 
  AlertCircle, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { attendanceService } from '../services/api';
import { PasswordModal } from '../components/PasswordModal';
import { ScanSuccessOverlay } from '../components/ScanSuccessOverlay';

export const ScanAbsensi: React.FC = () => {
  // Determine active prayer based on hours
  const getActiveSholat = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 6) return 'Subuh';
    if (hour >= 11 && hour < 14) return 'Dzuhur';
    if (hour >= 15 && hour < 17) return 'Ashar';
    if (hour >= 17 && hour < 19) return 'Maghrib';
    if (hour >= 19 && hour < 22) return 'Isya';
    return 'Subuh'; // Default
  };

  const [selectedSholat, setSelectedSholat] = useState(getActiveSholat());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [enrollStatus, setEnrollStatus] = useState<{ active: boolean; name?: string } | null>(null);
  
  // Modals & Overlays
  const [isPasscodeOpen, setIsPasscodeOpen] = useState(false);
  const [pendingSholat, setPendingSholat] = useState('');
  const [isTimeLocked, setIsTimeLocked] = useState(true);
  
  const [successOverlay, setSuccessOverlay] = useState({
    isOpen: false,
    name: '',
    room: '',
    gender: '',
    photoUrl: '',
    prayerTime: '',
    time: '',
  });

  // Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial logs for today
  const loadTodayLogs = async () => {
    try {
      const data = await attendanceService.getToday(selectedSholat);
      setRecentScans(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadTodayLogs();
  }, [selectedSholat]);

  // Server-Sent Events listener for real-time scans/enrollments
  useEffect(() => {
    const sseUrl = attendanceService.getStreamUrl();
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'scan_success') {
          // Open popup
          setSuccessOverlay({
            isOpen: true,
            name: data.name,
            room: data.room,
            gender: data.gender,
            photoUrl: data.photo_url || '',
            prayerTime: data.prayer_time,
            time: data.time,
          });
          // Auto-dismiss after 3.5 seconds to allow full TTS voice playback
          setTimeout(() => {
            setSuccessOverlay(prev => ({ ...prev, isOpen: false }));
          }, 3500);
          // Update list
          setRecentScans(prev => [
            {
              id: Date.now(),
              santri_id: data.santri_id,
              santri_name: data.name,
              santri_gender: data.gender,
              santri_room: data.room,
              date: new Date().toISOString().split('T')[0],
              prayer_time: data.prayer_time,
              status: data.status,
              method: 'Fingerprint',
              scanned_at: new Date().toISOString()
            },
            ...prev
          ]);
        } 
        else if (data.type === 'scan_failed') {
          alert(`Scan Gagal: ${data.message}`);
        }
        else if (data.type === 'enroll_start') {
          setEnrollStatus({ active: true, name: data.name });
        }
        else if (data.type === 'enroll_success' || data.type === 'enroll_cancelled') {
          setEnrollStatus(null);
        }
      } catch (err) {
        console.error("Gagal parse SSE:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Connection Error:", err);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (isTimeLocked) {
      setPendingSholat(value);
      setIsPasscodeOpen(true);
    } else {
      setSelectedSholat(value);
    }
  };

  const handlePasscodeSuccess = () => {
    setIsPasscodeOpen(false);
    setIsTimeLocked(false);
    setSelectedSholat(pendingSholat);
    // Lock automatically after 30 seconds
    setTimeout(() => {
      setIsTimeLocked(true);
    }, 30000);
  };

  return (
    <div className="animate-slide">
      <div className="page-header">
        <div className="page-title">
          <h1>Interface Absensi</h1>
          <p>Tempelkan jari ke mesin sidik jari untuk mengabsen diri secara otomatis.</p>
        </div>
        
        <div className="time-indicator">
          <div className="time-clock">
            {currentTime.toLocaleTimeString('id-ID', { hour12: false })}
          </div>
          <div className="time-date">
            {currentTime.toLocaleDateString('id-ID', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>

      <div className="grid-main-sidebar">
        {/* Main Column */}
        <div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge badge-hadir" style={{ padding: '6px 12px' }}>
                  Waktu Sholat Aktif: {selectedSholat}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {isTimeLocked ? 'Terkunci' : 'Otorisasi Aktif'}
                </span>
                <button 
                  onClick={() => {
                    if (!isTimeLocked) {
                      setIsTimeLocked(true);
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: isTimeLocked ? 'default' : 'pointer',
                    color: isTimeLocked ? '#94a3b8' : '#4f46e5'
                  }}
                >
                  {isTimeLocked ? <Lock size={16} /> : <Unlock size={16} />}
                </button>
                
                <select 
                  value={selectedSholat} 
                  onChange={handleDropdownChange}
                  className="form-control"
                  style={{ width: '130px', padding: '6px 10px', fontSize: '13px' }}
                >
                  <option value="Subuh">Subuh</option>
                  <option value="Dzuhur">Dzuhur</option>
                  <option value="Ashar">Ashar</option>
                  <option value="Maghrib">Maghrib</option>
                  <option value="Isya">Isya</option>
                </select>
              </div>
            </div>

            {/* Biometric Scanning Terminal */}
            <div className={`scanner-container ${enrollStatus?.active ? 'enroll-mode' : ''}`}>
              <div className="scanner-laser"></div>
              <div className="scanner-ripple"></div>

              {enrollStatus?.active ? (
                <>
                  <div className="scanner-circle">
                    <Sparkles size={54} color="#d946ef" className="pulse-icon" style={{ zIndex: 4 }} />
                  </div>
                  <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#f5d0fe', zIndex: 4 }}>
                    MODE REGISTRASI JARI
                  </h2>
                  <p style={{ color: '#d946ef', fontSize: '15px', marginTop: '6px', fontWeight: 600, zIndex: 4 }}>
                    Perekaman santri: <span style={{ color: '#ffffff', textDecoration: 'underline' }}>{enrollStatus.name}</span>
                  </p>
                  <p style={{ color: '#c084fc', fontSize: '13px', marginTop: '16px', zIndex: 4, maxWidth: '280px' }}>
                    Tempelkan sidik jari santri sebanyak 3 kali secara berkala pada sensor kaca scanner.
                  </p>
                </>
              ) : (
                <>
                  <div className="scanner-circle">
                    <Fingerprint size={64} color="#6366f1" className="pulse-icon" style={{ zIndex: 4 }} />
                  </div>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '0.75px', zIndex: 4 }}>
                    TEMPELKAN JARI ANDA
                  </h2>
                  <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '8px', zIndex: 4, maxWidth: '320px' }}>
                    Pastikan permukaan jari dalam keadaan bersih dan kering saat menempel pada sensor.
                  </p>
                  <div style={statusBannerStyle}>
                    <Activity size={14} color="#10b981" />
                    <span>Mesin Scanner ZKTeco Siap</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Activity Feed */}
        <div>
          <div className="card" style={{ padding: '20px', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="card-title" style={{ margin: 0 }}>
                <Activity size={18} color="var(--accent-primary)" />
                Aktivitas Hari Ini
              </h3>
              <button onClick={loadTodayLogs} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>
                <RefreshCw size={12} />
              </button>
            </div>
            
            <div style={logContainerStyle}>
              {recentScans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
                  <AlertCircle size={32} style={{ margin: '0 auto 10px auto', display: 'block', opacity: 0.5 }} />
                  <p style={{ fontSize: '13px' }}>Belum ada santri yang mengabsen hari ini.</p>
                </div>
              ) : (
                recentScans.map((log) => (
                  <div key={log.id} style={logItemStyle} className="animate-slide">
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{log.santri_name}</h4>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Kamar {log.santri_room} • {log.prayer_time}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-hadir" style={{ fontSize: '10px', padding: '2px 8px' }}>
                        {log.status}
                      </span>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {log.scanned_at ? new Date(log.scanned_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lock Passcode Modal */}
      <PasswordModal 
        isOpen={isPasscodeOpen} 
        onClose={() => setIsPasscodeOpen(false)} 
        onSuccess={handlePasscodeSuccess} 
      />

      {/* Tapping Success Alert */}
      <ScanSuccessOverlay 
        isOpen={successOverlay.isOpen}
        santriName={successOverlay.name}
        room={successOverlay.room}
        gender={successOverlay.gender}
        photoUrl={successOverlay.photoUrl}
        prayerTime={successOverlay.prayerTime}
        time={successOverlay.time}
        onClose={() => setSuccessOverlay(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

// Styling Object
const scanBoxStyle: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  border: '2px dashed var(--border-color)',
  borderRadius: '16px',
  padding: '60px 40px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
  textAlign: 'center',
};

const scanBoxEnrollStyle: React.CSSProperties = {
  backgroundColor: '#fdf4ff',
  border: '2px dashed #f5d0fe',
  borderRadius: '16px',
  padding: '60px 40px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
  textAlign: 'center',
};

const rippleStyle: React.CSSProperties = {
  position: 'absolute',
  width: '280px',
  height: '280px',
  backgroundColor: 'rgba(79, 70, 229, 0.04)',
  borderRadius: '50%',
  zIndex: 1,
  animation: 'pulse 2.5s infinite',
};

const rippleEnrollStyle: React.CSSProperties = {
  position: 'absolute',
  width: '280px',
  height: '280px',
  backgroundColor: 'rgba(217, 70, 239, 0.06)',
  borderRadius: '50%',
  zIndex: 1,
  animation: 'pulse 2s infinite',
};

const statusBannerStyle: React.CSSProperties = {
  marginTop: '28px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  backgroundColor: 'rgba(16, 185, 129, 0.15)',
  color: '#34d399',
  padding: '6px 14px',
  borderRadius: '9999px',
  fontSize: '12px',
  fontWeight: 600,
  zIndex: 4,
};

const logContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  maxHeight: '440px',
  overflowY: 'auto',
  paddingRight: '4px',
};

const logItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '12px',
  backgroundColor: '#f8fafc',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
};
