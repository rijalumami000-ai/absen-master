import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, X } from 'lucide-react';
import { settingsService } from '../services/api';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await settingsService.verifyPassword(password);
      if (res.success) {
        setPassword('');
        onSuccess();
      } else {
        setError('Password keamanan salah');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Gagal memverifikasi password');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle} className="animate-slide">
        <div style={modalHeaderStyle}>
          <div style={iconContainerStyle}>
            <Lock size={20} color="#4f46e5" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Keamanan Sistem</h3>
          <button onClick={onClose} style={closeButtonStyle}>
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: '1.5' }}>
            Mengubah waktu sholat secara manual memerlukan password otoritas keamanan. Silakan masukkan password:
          </p>
          
          <div className="form-group">
            <input
              type="password"
              className="form-control"
              placeholder="Masukkan password keamanan"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
            />
            {error && <p style={errorStyle}>{error}</p>}
          </div>

          <div style={buttonContainerStyle}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Memverifikasi...' : 'Verifikasi'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// Inline CSS Styles for overlays/modals to avoid extra stylesheets
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.4)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  width: '380px',
  padding: '24px',
  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  border: '1px solid #e2e8f0',
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  position: 'relative',
};

const iconContainerStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  backgroundColor: '#e0e7ff',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#94a3b8',
};

const errorStyle: React.CSSProperties = {
  color: '#ef4444',
  fontSize: '12px',
  marginTop: '6px',
  fontWeight: 500,
};

const buttonContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginTop: '20px',
};
