import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, User } from 'lucide-react';

interface ScanSuccessOverlayProps {
  isOpen: boolean;
  santriName: string;
  room: string;
  gender: string;
  prayerTime: string;
  time: string;
  onClose: () => void;
}

export const ScanSuccessOverlay: React.FC<ScanSuccessOverlayProps> = ({
  isOpen,
  santriName,
  room,
  gender,
  prayerTime,
  time,
  onClose,
}) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // Auto close after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div style={overlayStyle}>
      <div style={cardStyle} className="animate-slide">
        <div style={checkmarkContainerStyle}>
          <CheckCircle2 size={54} color="#ffffff" />
        </div>
        
        <h2 style={statusTitleStyle}>ABSENSI BERHASIL</h2>
        <p style={{ color: '#d1fae5', fontSize: '14px', marginTop: '4px', fontWeight: 500 }}>
          Sholat {prayerTime} • {time}
        </p>

        <div style={profileBoxStyle}>
          <div style={avatarStyle}>
            <User size={36} color="#4f46e5" />
          </div>
          <div style={infoStyle}>
            <h3 style={nameStyle}>{santriName}</h3>
            <p style={detailStyle}>
              Kamar: <span style={{ fontWeight: 600 }}>{room}</span> | Gender: <span style={{ fontWeight: 600 }}>{gender}</span>
            </p>
          </div>
        </div>

        <div style={footerBoxStyle}>
          Pintu masuk tercatat. Silakan masuk ke dalam masjid.
        </div>
      </div>
    </div>,
    document.body
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(9, 9, 11, 0.85)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
};

const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', // Vibrant Emerald Gradient
  borderRadius: '24px',
  width: '460px',
  padding: '40px 32px',
  textAlign: 'center',
  boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.4)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  color: '#ffffff',
};

const checkmarkContainerStyle: React.CSSProperties = {
  width: '84px',
  height: '84px',
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 20px auto',
  border: '4px solid rgba(255, 255, 255, 0.3)',
};

const statusTitleStyle: React.CSSProperties = {
  fontFamily: 'Outfit, sans-serif',
  fontSize: '24px',
  fontWeight: 800,
  letterSpacing: '1px',
};

const profileBoxStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '20px',
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  marginTop: '28px',
  textAlign: 'left',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
};

const avatarStyle: React.CSSProperties = {
  width: '56px',
  height: '56px',
  backgroundColor: '#e0e7ff',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const infoStyle: React.CSSProperties = {
  flex: 1,
};

const nameStyle: React.CSSProperties = {
  color: '#0f172a',
  fontSize: '18px',
  fontWeight: 700,
  lineHeight: '1.2',
};

const detailStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: '13px',
  marginTop: '4px',
};

const footerBoxStyle: React.CSSProperties = {
  marginTop: '28px',
  fontSize: '12px',
  color: 'rgba(255, 255, 255, 0.8)',
  fontStyle: 'italic',
};
