import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Fingerprint, Activity, RefreshCw, CheckCircle2, X, Shield, Terminal
} from 'lucide-react';

interface BridgeControlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BridgeStatusData {
  mode: 'verify' | 'register';
  status: 'online' | 'offline';
  sensor_sn: string;
  templates_count: number;
  logs: string[];
  active_enroll_santri_id?: number;
}

export const BridgeControlModal: React.FC<BridgeControlModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<BridgeStatusData>({
    mode: 'verify',
    status: 'offline',
    sensor_sn: '-',
    templates_count: 0,
    logs: []
  });
  const [loadingCmd, setLoadingCmd] = useState<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/fingerprint/bridge-status');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Error fetching bridge status:', e);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);

    const sse = new EventSource('/api/attendance/stream');
    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'bridge_status_update') {
          setData(prev => ({
            ...prev,
            mode: payload.data.mode,
            status: payload.data.status,
            sensor_sn: payload.data.sensor_sn,
            templates_count: payload.data.templates_count,
            logs: payload.data.latest_log 
              ? [...prev.logs.filter(l => l !== payload.data.latest_log), payload.data.latest_log].slice(-40)
              : prev.logs
          }));
        }
      } catch (err) {}
    };

    return () => {
      clearInterval(interval);
      sse.close();
    };
  }, [isOpen]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [data.logs]);

  const handleSendCommand = async (command: 'set_verify' | 'set_register' | 'sync_templates') => {
    setLoadingCmd(command);
    try {
      const res = await fetch('/api/fingerprint/bridge-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      if (res.ok) {
        await fetchStatus();
      }
    } catch (e) {
      console.error('Error sending bridge command:', e);
    } finally {
      setLoadingCmd(null);
    }
  };

  if (!isOpen) return null;

  const isOnline = data.status === 'online';

  return createPortal(
    <div style={styles.overlay}>
      <div style={styles.container}>
        
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={styles.headerIconWrapper}>
              <Fingerprint size={24} color="#ffffff" />
            </div>
            <div>
              <h3 style={styles.headerTitle}>Pengendali & Status Sensor ZKFinger</h3>
              <p style={styles.headerSubtitle}>Koneksi Bridge Windows & Realtime Dashboard</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn} title="Tutup Modal">
            <X size={20} color="#ffffff" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={styles.body}>

          {/* Launch App Banner if Offline */}
          {!isOnline && (
            <div style={styles.launchBanner}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={styles.launchIcon}>
                  <Fingerprint size={22} color="#ffffff" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e1b4b' }}>Aplikasi Bridge Windows Offline</div>
                  <div style={{ fontSize: '11px', color: '#4338ca' }}>Aktifkan aplikasi Bridge di Windows secara otomatis tanpa membuka folder manual.</div>
                </div>
              </div>
              <button 
                onClick={() => { window.location.href = 'zkfingerbridge://launch'; }}
                style={styles.launchBtn}
                title="Buka ZKFinger Bridge Windows"
              >
                🚀 Buka / Aktifkan Bridge
              </button>
            </div>
          )}
          
          {/* Status Cards */}
          <div style={styles.gridCards}>
            
            {/* Card 1: Sensor Status */}
            <div style={styles.card}>
              <div style={styles.cardLabel}>Status Sensor</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                <span style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: isOnline ? '#10b981' : '#ef4444',
                  boxShadow: isOnline ? '0 0 10px #10b981' : 'none'
                }} />
                <span style={{
                  fontWeight: 700,
                  fontSize: '16px',
                  color: isOnline ? '#047857' : '#b91c1c'
                }}>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div style={styles.cardSub}>
                SN: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{data.sensor_sn}</span>
              </div>
            </div>

            {/* Card 2: Mode Aktif */}
            <div style={styles.card}>
              <div style={styles.cardLabel}>Mode Aktif Saat Ini</div>
              <div style={{ margin: '4px 0' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: data.mode === 'register' ? '#e0e7ff' : '#d1fae5',
                  color: data.mode === 'register' ? '#3730a3' : '#065f46',
                  border: `1px solid ${data.mode === 'register' ? '#c7d2fe' : '#a7f3d0'}`
                }}>
                  {data.mode === 'register' ? '📝 MODE DAFTAR' : '✅ MODE ABSENSI'}
                </span>
              </div>
              <div style={styles.cardSub}>
                {data.mode === 'register' ? 'Tempel jari ke sensor 3x' : 'Siap scan kehadiran harian'}
              </div>
            </div>

            {/* Card 3: Template Count */}
            <div style={styles.card}>
              <div style={styles.cardLabel}>Sidik Jari Terdaftar</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                {data.templates_count} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>template</span>
              </div>
              <div style={styles.cardSub}>
                Memori cache lokal C# Bridge
              </div>
            </div>

          </div>

          {/* Remote Control Section */}
          <div style={{ marginTop: '20px' }}>
            <div style={styles.sectionHeader}>
              <Activity size={16} color="#4f46e5" />
              <span>Pilihan Mode & Kontrol Bridge</span>
            </div>

            <div style={styles.gridButtons}>
              
              <button
                onClick={() => handleSendCommand('set_verify')}
                disabled={loadingCmd !== null}
                style={{
                  ...styles.actionBtn,
                  backgroundColor: data.mode === 'verify' ? '#10b981' : '#f1f5f9',
                  color: data.mode === 'verify' ? '#ffffff' : '#334155',
                  border: data.mode === 'verify' ? '2px solid #059669' : '1px solid #e2e8f0'
                }}
              >
                {loadingCmd === 'set_verify' ? (
                  <RefreshCw size={16} className="spin-icon" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                <span>MODE ABSENSI</span>
              </button>

              <button
                onClick={() => handleSendCommand('set_register')}
                disabled={loadingCmd !== null}
                style={{
                  ...styles.actionBtn,
                  backgroundColor: data.mode === 'register' ? '#4f46e5' : '#f1f5f9',
                  color: data.mode === 'register' ? '#ffffff' : '#334155',
                  border: data.mode === 'register' ? '2px solid #3730a3' : '1px solid #e2e8f0'
                }}
              >
                {loadingCmd === 'set_register' ? (
                  <RefreshCw size={16} className="spin-icon" />
                ) : (
                  <Fingerprint size={16} />
                )}
                <span>MODE DAFTAR</span>
              </button>

              <button
                onClick={() => handleSendCommand('sync_templates')}
                disabled={loadingCmd !== null}
                style={{
                  ...styles.actionBtn,
                  backgroundColor: '#f3e8ff',
                  color: '#6b21a8',
                  border: '1px solid #e9d5ff'
                }}
              >
                {loadingCmd === 'sync_templates' ? (
                  <RefreshCw size={16} className="spin-icon" />
                ) : (
                  <RefreshCw size={16} />
                )}
                <span>SYNC TEMPLATE</span>
              </button>

            </div>
          </div>

          {/* Terminal Console */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={styles.sectionHeader}>
                <Terminal size={16} color="#475569" />
                <span>Log Aktivitas Realtime</span>
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Auto-sync 2 detik</span>
            </div>

            <div ref={logContainerRef} style={styles.terminalContainer}>
              {data.logs.length === 0 ? (
                <div style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', paddingTop: '40px' }}>
                  Belum ada log aktivitas dari ZKFinger Bridge...
                </div>
              ) : (
                data.logs.map((log, idx) => (
                  <div key={idx} style={styles.logLine}>
                    <span style={{ color: '#10b981', marginRight: '6px' }}>&gt;</span>
                    <span>{log}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
            <Shield size={16} color="#10b981" />
            <span>ZKFinger SDK v10 • Controller Mode Aktif</span>
          </div>
          <button onClick={onClose} style={styles.closeFooterBtn}>
            Tutup
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2500,
    padding: '16px'
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    width: '100%',
    maxWidth: '650px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid #e2e8f0'
  },
  header: {
    background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
    color: '#ffffff',
    padding: '18px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerIconWrapper: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#ffffff',
    margin: 0,
    lineHeight: 1.2
  },
  headerSubtitle: {
    fontSize: '12px',
    color: '#e0e7ff',
    margin: '2px 0 0 0',
    opacity: 0.9
  },
  closeBtn: {
    background: 'rgba(255, 255, 255, 0.15)',
    border: 'none',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  body: {
    padding: '20px 24px',
    overflowY: 'auto',
    flex: 1
  },
  gridCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: '12px'
  },
  card: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  cardLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  cardSub: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '4px'
  },
  sectionHeader: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  gridButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: '10px',
    marginTop: '10px'
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
  },
  terminalContainer: {
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    fontFamily: '"Fira Code", "Courier New", monospace',
    fontSize: '12px',
    padding: '14px',
    borderRadius: '12px',
    height: '170px',
    overflowY: 'auto',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5)'
  },
  logLine: {
    lineHeight: 1.6,
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    paddingBottom: '2px'
  },
  footer: {
    backgroundColor: '#f8fafc',
    padding: '14px 24px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  closeFooterBtn: {
    backgroundColor: '#e2e8f0',
    color: '#334155',
    border: 'none',
    padding: '8px 20px',
    borderRadius: '10px',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer'
  },
  launchBanner: {
    backgroundColor: '#e0e7ff',
    border: '1px solid #c7d2fe',
    borderRadius: '14px',
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    gap: '12px',
    flexWrap: 'wrap'
  },
  launchIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    backgroundColor: '#4f46e5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  launchBtn: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '10px',
    fontWeight: 700,
    fontSize: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.3)',
    whiteSpace: 'nowrap'
  }
};
