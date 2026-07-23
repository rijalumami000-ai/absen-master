import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Lock, 
  MessageSquare, 
  Database,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { settingsService } from '../services/api';
import { AlertModal } from '../components/AlertModal';

export const Pengaturan: React.FC = () => {
  const [settings, setSettings] = useState<any[]>([]);
  const [prayerPass, setPrayerPass] = useState('');
  const [waUrl, setWaUrl] = useState('');
  const [waToken, setWaToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Debug raw log lists
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadSettings = async () => {
    try {
      const data = await settingsService.getAll();
      setSettings(data);

      const passSetting = data.find((s: any) => s.key === 'prayer_change_password');
      if (passSetting) setPrayerPass(passSetting.value);

      const urlSetting = data.find((s: any) => s.key === 'wa_api_url');
      if (urlSetting) setWaUrl(urlSetting.value);

      const tokenSetting = data.find((s: any) => s.key === 'wa_api_token');
      if (tokenSetting) setWaToken(tokenSetting.value);

    } catch (err) {
      console.error(err);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await settingsService.getFingerprintLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadLogs();
  }, []);

  const handleSaveSetting = async (key: string, value: string) => {
    setSavingKey(key);
    try {
      await settingsService.update(key, value);
      
      let friendlyName = key;
      if (key === 'prayer_change_password') friendlyName = 'Sandi Keamanan';
      else if (key === 'wa_api_url') friendlyName = 'API Gateway URL';
      else if (key === 'wa_api_token') friendlyName = 'API Token Fonnte';

      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Pengaturan Disimpan',
        message: `${friendlyName} berhasil diperbarui ke database.`,
      });
      loadSettings();
    } catch (err) {
      console.error(err);
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Gagal Menyimpan',
        message: 'Gagal menyimpan pembaruan pengaturan ke database.',
      });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="animate-slide">
      <div className="page-header">
        <div className="page-title">
          <h1>Pengaturan</h1>
          <p>Konfigurasi kredensial WhatsApp API Gateway, sandi sistem, dan monitor log sidik jari.</p>
        </div>
      </div>

      <div className="grid-2">
        {/* Left Column: Form Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Security lock password */}
          <div className="card">
            <h3 className="card-title">
              <Lock size={18} color="var(--accent-primary)" />
              Sandi Keamanan Sholat
            </h3>
            
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
              Password ini digunakan saat mengubah dropdown waktu sholat secara manual pada Halaman Absensi Utama.
            </p>

            <div className="form-group">
              <label className="form-label">Sandi Keamanan Baru</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  className="form-control"
                  value={prayerPass}
                  onChange={(e) => setPrayerPass(e.target.value)}
                />
                <button 
                  onClick={() => handleSaveSetting('prayer_change_password', prayerPass)}
                  className="btn btn-primary"
                  disabled={savingKey === 'prayer_change_password'}
                >
                  {savingKey === 'prayer_change_password' ? 'Saving...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>

          {/* WhatsApp settings */}
          <div className="card">
            <h3 className="card-title">
              <MessageSquare size={18} color="var(--accent-primary)" />
              WhatsApp Gateway (Fonnte)
            </h3>
            
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
              Masukkan detail URL Gateway API dan Token API resmi dari Fonnte. Token ini digunakan untuk mengautentikasi pengiriman pesan laporan.
            </p>

            <div className="form-group">
              <label className="form-label">API Gateway URL</label>
              <input
                type="text"
                className="form-control"
                value={waUrl}
                onChange={(e) => setWaUrl(e.target.value)}
                placeholder="https://api.fonnte.com/send"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">API Token / Auth Key</label>
              <div style={{ position: 'relative', display: 'flex', gap: '10px' }}>
                <input
                  type={showToken ? 'text' : 'password'}
                  className="form-control"
                  value={waToken}
                  onChange={(e) => setWaToken(e.target.value)}
                  placeholder="Masukkan Token Fonnte Anda"
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  style={eyeButtonStyle}
                >
                  {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => handleSaveSetting('wa_api_url', waUrl)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
                disabled={savingKey === 'wa_api_url'}
              >
                Simpan URL
              </button>
              <button 
                onClick={() => handleSaveSetting('wa_api_token', waToken)}
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={savingKey === 'wa_api_token'}
              >
                Simpan Token
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Raw Fingerprint Scan logs */}
        <div>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="card-title" style={{ margin: 0 }}>
                <Database size={18} color="var(--accent-primary)" />
                Log Pembacaan Alat
              </h3>
              
              <button onClick={loadLogs} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }} disabled={loadingLogs}>
                <RefreshCw size={12} className={loadingLogs ? 'pulse-icon' : ''} />
              </button>
            </div>
            
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
              Menampilkan riwayat tapping sidik jari mentah langsung dari alat sensor untuk mempermudah pengecekan dan pelacakan kesalahan.
            </p>

            <div style={logContainerStyle}>
              {loadingLogs ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <RefreshCw size={24} className="pulse-icon" style={{ margin: '0 auto 10px auto' }} />
                  <p style={{ fontSize: '12px' }}>Memuat logs pembacaan...</p>
                </div>
              ) : logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Belum ada aktivitas pembacaan sidik jari terdeteksi.
                </div>
              ) : (
                <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <table className="table" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th>Waktu</th>
                        <th>ID Sidik Jari</th>
                        <th>Santri</th>
                        <th>Kualitas</th>
                        <th>Hasil</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => {
                        const isSuccess = log.status && log.status.includes("Sukses");
                        return (
                          <tr key={log.id}>
                            <td>
                              {new Date(log.scanned_at).toLocaleTimeString('id-ID', { hour12: false })}
                            </td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{log.fingerprint_id}</td>
                            <td>{log.santri_name || '-'}</td>
                            <td>{log.score || '-'}</td>
                            <td>
                              <span 
                                className={`badge ${isSuccess ? 'badge-hadir' : 'badge-alfa'}`}
                                style={{ fontSize: '10px', padding: '2px 6px' }}
                              >
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      <AlertModal 
        isOpen={alertState.isOpen} 
        type={alertState.type} 
        title={alertState.title} 
        message={alertState.message} 
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))} 
      />
    </div>
  );
};

const eyeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  right: '12px',
  top: '12px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#94a3b8',
  zIndex: 10
};

const logContainerStyle: React.CSSProperties = {
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  overflow: 'hidden'
};
