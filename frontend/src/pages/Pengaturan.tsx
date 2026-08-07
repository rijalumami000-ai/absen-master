import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Lock, 
  MessageSquare, 
  Database,
  RefreshCw,
  Eye,
  EyeOff,
  Building,
  Upload,
  Image as ImageIcon,
  Smartphone,
  Download
} from 'lucide-react';
import { settingsService } from '../services/api';
import { AlertModal } from '../components/AlertModal';

export const Pengaturan: React.FC = () => {
  const [settings, setSettings] = useState<any[]>([]);
  const [appTitle, setAppTitle] = useState('MASTER ABSENSI Alhamid Cintamulya');
  const [appIcon, setAppIcon] = useState('');
  const [loginBgImage, setLoginBgImage] = useState('/login_bg.png');
  const [prayerPass, setPrayerPass] = useState('');
  const [waUrl, setWaUrl] = useState('');
  const [waToken, setWaToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingLoginBg, setUploadingLoginBg] = useState(false);
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

      const titleSetting = data.find((s: any) => s.key === 'app_title');
      if (titleSetting && titleSetting.value) setAppTitle(titleSetting.value);

      const iconSetting = data.find((s: any) => s.key === 'app_icon');
      if (iconSetting) setAppIcon(iconSetting.value);

      const bgSetting = data.find((s: any) => s.key === 'login_bg_image');
      if (bgSetting && bgSetting.value) setLoginBgImage(bgSetting.value);

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

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIcon(true);
    try {
      const res = await settingsService.uploadIcon(file);
      if (res.icon_url) {
        setAppIcon(res.icon_url);
        window.dispatchEvent(new Event('app_settings_updated'));
        setAlertState({
          isOpen: true,
          type: 'success',
          title: 'Ikon Aplikasi Diperbarui',
          message: 'Ikon aplikasi berhasil diunggah dan diperbarui.'
        });
      }
    } catch (err) {
      console.error(err);
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Gagal Mengunggah',
        message: 'Terjadi kesalahan saat mengunggah ikon aplikasi.'
      });
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleLoginBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLoginBg(true);
    try {
      const res = await settingsService.uploadLoginBg(file);
      if (res.bg_url) {
        setLoginBgImage(res.bg_url);
        window.dispatchEvent(new Event('app_settings_updated'));
        setAlertState({
          isOpen: true,
          type: 'success',
          title: 'Gambar Latar Login Diperbarui',
          message: 'Gambar latar belakang halaman login berhasil diperbarui.'
        });
      }
    } catch (err) {
      console.error(err);
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Gagal Mengunggah',
        message: 'Terjadi kesalahan saat mengunggah gambar latar belakang login.'
      });
    } finally {
      setUploadingLoginBg(false);
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
          
          {/* App Title & App Icon CRUD Card */}
          <div className="card">
            <h3 className="card-title">
              <Building size={18} color="var(--accent-primary)" />
              Identitas & Ikon Aplikasi
            </h3>
            
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
              Atur nama judul utama aplikasi dan unggah ikon khusus yang tampil pada Sidebar & Favicon browser.
            </p>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Judul Aplikasi</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  className="form-control"
                  value={appTitle}
                  onChange={(e) => setAppTitle(e.target.value)}
                  placeholder="MASTER ABSENSI Alhamid Cintamulya"
                />
                <button 
                  onClick={() => {
                    handleSaveSetting('app_title', appTitle);
                    window.dispatchEvent(new Event('app_settings_updated'));
                  }}
                  className="btn btn-primary"
                  disabled={savingKey === 'app_title'}
                >
                  {savingKey === 'app_title' ? 'Saving...' : 'Simpan'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Ikon Aplikasi (Logo)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  backgroundColor: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  {appIcon ? (
                    <img src={appIcon} alt="App Icon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageIcon size={28} color="#818cf8" />
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                    <Upload size={14} />
                    {uploadingIcon ? 'Mengunggah...' : 'Unggah Ikon Baru'}
                    <input type="file" accept="image/*" onChange={handleIconUpload} style={{ display: 'none' }} disabled={uploadingIcon} />
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Format PNG, JPG, SVG. Maks 2 MB.</span>
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '20px' }}>
              <label className="form-label">Gambar Latar Belakang Login</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '90px',
                  height: '56px',
                  borderRadius: '12px',
                  backgroundColor: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  {loginBgImage ? (
                    <img src={loginBgImage} alt="Login Background" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageIcon size={28} color="#818cf8" />
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                    <Upload size={14} />
                    {uploadingLoginBg ? 'Mengunggah...' : 'Unggah Latar Login'}
                    <input type="file" accept="image/*" onChange={handleLoginBgUpload} style={{ display: 'none' }} disabled={uploadingLoginBg} />
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Format PNG, JPG. Maks 5 MB.</span>
                </div>
              </div>
            </div>
          </div>

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
                      {logs.map((log: any) => {
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
      </div>
      <AlertModal 
        isOpen={alertState.isOpen} 
        type={alertState.type} 
        title={alertState.title} 
        message={alertState.message} 
        onClose={() => setAlertState((prev: any) => ({ ...prev, isOpen: false }))} 
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
