import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  AlertCircle, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Users, 
  Calendar, 
  Building, 
  Database,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { settingsService } from '../services/api';

interface LoginProps {
  onSuccess?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bgImage, setBgImage] = useState<string>('/login_bg.png');

  const loadBgSetting = async () => {
    try {
      const settings = await settingsService.getAll();
      const bgS = settings.find((s: any) => s.key === 'login_bg_image');
      if (bgS && bgS.value) setBgImage(bgS.value);
    } catch (e) {}
  };

  useEffect(() => {
    loadBgSetting();
    const handleUpdate = () => loadBgSetting();
    window.addEventListener('app_settings_updated', handleUpdate);
    return () => window.removeEventListener('app_settings_updated', handleUpdate);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const success = login(username, password);
      setLoading(false);
      if (success) {
        if (onSuccess) onSuccess();
      } else {
        setError('Username atau password superuser salah!');
      }
    }, 350);
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      backgroundColor: '#ffffff',
      display: 'flex',
      overflowX: 'hidden',
      overflowY: 'auto'
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        width: '100%',
        minHeight: '100vh'
      }}>
        
        {/* Left Side: Hero Section with Dynamic Background Image & Glass Cards */}
        <div style={{
          position: 'relative',
          backgroundImage: `url('${bgImage}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 56px',
          color: '#ffffff',
          overflow: 'hidden'
        }}>
          {/* Dark Overlay Gradient */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.88) 0%, rgba(30, 27, 75, 0.85) 100%)',
            backdropFilter: 'blur(2px)',
            zIndex: 1
          }} />

          {/* Top Left Header Brand */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(79, 70, 229, 0.5)'
            }}>
              <Building size={20} color="#ffffff" />
            </div>
            <span style={{
              fontWeight: 800,
              fontSize: '14px',
              letterSpacing: '1px',
              color: '#ffffff',
              fontFamily: 'Outfit, sans-serif'
            }}>
              PONDOK PESANTREN AL-HAMID
            </span>
          </div>

          {/* Middle Hero Main Content */}
          <div style={{ position: 'relative', zIndex: 2, margin: '40px 0' }}>
            <h1 style={{
              fontSize: '38px',
              fontWeight: 800,
              color: '#ffffff',
              margin: '0 0 16px 0',
              lineHeight: '1.2',
              fontFamily: 'Outfit, sans-serif'
            }}>
              Portal Administrasi <br />
              <span style={{
                background: 'linear-gradient(90deg, #818cf8 0%, #c7d2fe 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                MASTER ABSENSI
              </span>
            </h1>
            <p style={{
              fontSize: '15px',
              color: '#cbd5e1',
              maxWidth: '500px',
              lineHeight: '1.6',
              margin: 0
            }}>
              Sistem manajemen cerdas untuk kelola data absensi sholat santri secara profesional, terintegrasi, dan aman.
            </p>

            {/* 2x2 Glassmorphic Stat Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginTop: '40px',
              maxWidth: '520px'
            }}>
              {/* Card 1 */}
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '20px',
                padding: '20px'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}>
                  <Users size={18} color="#a5b4fc" />
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>1,000+</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Total Santri Active</div>
              </div>

              {/* Card 2 */}
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '20px',
                padding: '20px'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}>
                  <Calendar size={18} color="#a5b4fc" />
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>Aktif</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>AI Wajah & Sidik Jari</div>
              </div>

              {/* Card 3 */}
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '20px',
                padding: '20px'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}>
                  <Building size={18} color="#a5b4fc" />
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>5 Waktu</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Sholat Berjamaah</div>
              </div>

              {/* Card 4 */}
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '20px',
                padding: '20px'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}>
                  <Database size={18} color="#a5b4fc" />
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>100%</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Data Terintegrasi</div>
              </div>
            </div>
          </div>

          {/* Footer Copy */}
          <div style={{ position: 'relative', zIndex: 2, fontSize: '12px', color: '#64748b' }}>
            © 2026 PP. Al-Hamid Cintamulya • Master Absensi AI
          </div>
        </div>

        {/* Right Side: Form Container (50% Split, Perfectly Centered) */}
        <div style={{
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '48px 40px',
          position: 'relative'
        }}>
          <div style={{ maxWidth: '440px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            
            {/* Top Pill Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#eeeffe',
              padding: '8px 16px',
              borderRadius: '20px',
              marginBottom: '20px',
              border: '1px solid #c7d2fe'
            }}>
              <ShieldCheck size={18} color="#4f46e5" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#3730a3' }}>
                Master Absensi Al-Hamid
              </span>
            </div>

            {/* Heading */}
            <h2 style={{
              fontSize: '34px',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 10px 0',
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '-0.5px'
            }}>
              Portal Administrasi
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#64748b',
              margin: '0 0 32px 0',
              lineHeight: '1.5'
            }}>
              Masukkan kredensial Anda untuk masuk ke sistem.
            </p>

            {/* Form Card */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '28px',
              padding: '36px 32px',
              boxShadow: '0 25px 50px -12px rgba(99, 102, 241, 0.12), 0 0 1px 1px rgba(0, 0, 0, 0.05)',
              border: '1px solid #f1f5f9',
              width: '100%',
              boxSizing: 'border-box',
              textAlign: 'left'
            }}>
              <form onSubmit={handleSubmit}>
                {error && (
                  <div style={{
                    marginBottom: '20px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    color: '#dc2626',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                {/* Username Input */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#1e293b',
                    marginBottom: '8px'
                  }}>
                    Username
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Masukkan username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '12px 16px 12px 42px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f8fafc',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease'
                      }}
                    />
                    <User size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '13px' }} />
                  </div>
                </div>

                {/* Password Input */}
                <div style={{ marginBottom: '28px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#1e293b',
                    marginBottom: '8px'
                  }}>
                    Kata Sandi
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 42px 12px 42px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f8fafc',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease'
                      }}
                    />
                    <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '13px' }} />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '12px',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '2px'
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    backgroundColor: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '14px',
                    fontWeight: 700,
                    fontSize: '15px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 10px 20px -5px rgba(99, 102, 241, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {loading ? 'Memverifikasi...' : (
                    <>
                      Masuk ke Dashboard <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Bottom Security Footer Badges */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '16px',
              marginTop: '32px',
              fontSize: '12px',
              color: '#94a3b8'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={12} /> Secure Login
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={12} /> Protected Access
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Activity size={12} /> Real-Time
              </span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
