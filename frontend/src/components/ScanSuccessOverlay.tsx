import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, User } from 'lucide-react';

interface ScanSuccessOverlayProps {
  isOpen: boolean;
  santriName: string;
  room: string;
  gender: string;
  prayerTime: string;
  time: string;
  photoUrl?: string;
  onClose: () => void;
}

export const ScanSuccessOverlay: React.FC<ScanSuccessOverlayProps> = ({
  isOpen,
  santriName,
  room,
  gender,
  prayerTime,
  time,
  photoUrl,
  onClose,
}) => {
  const [imgError, setImgError] = React.useState(false);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const formatPhotoUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/uploads/')) return url;
    if (url.startsWith('uploads/')) return `/${url}`;
    if (url.startsWith('/static/')) return url;
    if (url.startsWith('static/')) return `/${url}`;
    if (url.startsWith('/sekolah-info-static/')) return url;
    if (url.startsWith('sekolah-info-static/')) return `/${url}`;
    if (url.startsWith('storage/')) return `/sekolah-info-static/${url.replace('storage/', '')}`;
    if (url.startsWith('/storage/')) return `/sekolah-info-static/${url.replace('/storage/', '')}`;
    if (url.startsWith('/')) return url;
    return `/static/uploads/${url}`;
  };

  useEffect(() => {
    if (isOpen) {
      setImgError(false);

      // Stop any existing playing audio to prevent double sound
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
        activeAudioRef.current = null;
      }

      // Play Google Text-to-Speech (TTS) Female Voice ONLY (Backend Proxy)
      const speechText = `${santriName} sudah absen sholat ${prayerTime}`;
      const ttsUrl = `/api/attendance/tts?text=${encodeURIComponent(speechText)}`;

      const audio = new Audio(ttsUrl);
      audio.volume = 1.0;
      activeAudioRef.current = audio;

      audio.play().catch((err) => {
        console.warn('Google TTS audio play blocked or failed:', err);
      });

      const timer = setTimeout(() => {
        onClose();
      }, 4000); // Auto close after 4 seconds

      return () => {
        clearTimeout(timer);
        if (activeAudioRef.current) {
          activeAudioRef.current.pause();
          activeAudioRef.current = null;
        }
      };
    }
  }, [isOpen, santriName, prayerTime, onClose]);

  const formattedPhoto = formatPhotoUrl(photoUrl);

  if (!isOpen) return null;

  return createPortal(
    <div style={overlayStyle}>
      <div style={cardStyle} className="animate-slide">
        <div style={checkmarkContainerStyle}>
          <CheckCircle2 size={54} color="#ffffff" />
        </div>
        
        <h2 style={statusTitleStyle}>ABSENSI BERHASIL</h2>
        <p style={{ color: '#d1fae5', fontSize: '15px', marginTop: '4px', fontWeight: 600 }}>
          Sholat {prayerTime} • {time}
        </p>

        {/* Large Profile Photo & Details Card */}
        <div style={profileBoxStyle}>
          <div style={avatarStyle}>
            {formattedPhoto && !imgError ? (
              <img 
                src={formattedPhoto} 
                alt={santriName} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                onError={() => setImgError(true)}
              />
            ) : (
              <User size={54} color="#4f46e5" />
            )}
          </div>

          <div style={infoStyle}>
            <h3 style={nameStyle}>{santriName}</h3>
            <div style={badgeContainerStyle}>
              <span style={badgeStyle}>Kamar: <strong>{room}</strong></span>
              <span style={badgeStyle}>Gender: <strong>{gender}</strong></span>
            </div>
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
  borderRadius: '28px',
  width: '480px',
  padding: '40px 32px',
  textAlign: 'center',
  boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.45)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
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
  margin: '0 auto 16px auto',
  border: '4px solid rgba(255, 255, 255, 0.35)',
};

const statusTitleStyle: React.CSSProperties = {
  fontFamily: 'Outfit, sans-serif',
  fontSize: '26px',
  fontWeight: 800,
  letterSpacing: '1px',
};

const profileBoxStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '20px',
  padding: '24px 20px',
  display: 'flex',
  alignItems: 'center',
  gap: '20px',
  marginTop: '24px',
  textAlign: 'left',
  boxShadow: '0 12px 25px -4px rgba(0, 0, 0, 0.15)',
};

const avatarStyle: React.CSSProperties = {
  width: '110px',
  height: '110px',
  backgroundColor: '#e0e7ff',
  borderRadius: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  overflow: 'hidden',
  border: '3px solid #f1f5f9',
  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
};

const infoStyle: React.CSSProperties = {
  flex: 1,
};

const nameStyle: React.CSSProperties = {
  color: '#0f172a',
  fontSize: '20px',
  fontWeight: 800,
  lineHeight: '1.25',
};

const badgeContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  marginTop: '10px',
};

const badgeStyle: React.CSSProperties = {
  color: '#475569',
  fontSize: '13px',
  backgroundColor: '#f1f5f9',
  padding: '4px 10px',
  borderRadius: '8px',
  display: 'inline-block',
  width: 'fit-content',
};

const footerBoxStyle: React.CSSProperties = {
  marginTop: '24px',
  fontSize: '13px',
  color: 'rgba(255, 255, 255, 0.85)',
  fontStyle: 'italic',
};
