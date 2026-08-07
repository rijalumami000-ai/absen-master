import React, { useState } from 'react';
import { Lock, X, KeyRound, ShieldAlert } from 'lucide-react';

interface PrayerPasswordModalProps {
  isOpen: boolean;
  targetPrayerTime: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const PrayerPasswordModal: React.FC<PrayerPasswordModalProps> = ({
  isOpen,
  targetPrayerTime,
  onConfirm,
  onClose
}) => {
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Valid passwords: "123", "123456", "admin", "alhamid"
    const validPasswords = ['123', '123456', 'admin', 'alhamid'];
    if (validPasswords.includes(password.trim())) {
      setErrorMessage(null);
      setPassword('');
      onConfirm();
    } else {
      setErrorMessage('Password salah! Hanya pengurus yang diizinkan merubah waktu sholat.');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        maxWidth: '440px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#312e81',
          padding: '20px 24px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              padding: '8px',
              borderRadius: '12px',
              display: 'flex'
            }}>
              <KeyRound size={20} color="#818cf8" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Otorisasi Pengurus</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#c7d2fe' }}>Ganti Waktu Sholat ke {targetPrayerTime}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setPassword('');
              setErrorMessage(null);
              onClose();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#93c5fd',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '14px',
            marginBottom: '20px',
            fontSize: '13px',
            color: '#475569',
            lineHeight: '1.5'
          }}>
            Perubahan waktu sholat absensi memerlukan password verifikasi pengurus/operator.
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 700,
              color: '#1e293b',
              marginBottom: '8px'
            }}>
              Password Pengurus
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                placeholder="Masukkan password pengurus..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 42px',
                  borderRadius: '12px',
                  border: errorMessage ? '2px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '13px' }} />
            </div>

            {errorMessage && (
              <div style={{
                marginTop: '10px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '10px 12px',
                color: '#dc2626',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <ShieldAlert size={16} />
                {errorMessage}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                setPassword('');
                setErrorMessage(null);
                onClose();
              }}
              style={{
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
              }}
            >
              Konfirmasi & Ganti
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
