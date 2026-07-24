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

  useEffect(() => {
    if (isOpen) {
      setImgError(false);

      // Play Indonesian Text-to-Speech (TTS) Voice Announcement
      // Format: "Rijal Umami sudah absen sholat subuh"
      const speechText = `${santriName} sudah absen sholat ${prayerTime}`;
      
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel(); // Stop previous voice
          const utterance = new SpeechSynthesisUtterance(speechText);
          utterance.lang = 'id-ID';
          utterance.rate = 0.95;
          utterance.pitch = 1.0;

          // Select Indonesian voice if available
          const voices = window.speechSynthesis.getVoices();
          const idVoice = voices.find(v => v.lang.toLowerCase().includes('id'));
          if (idVoice) utterance.voice = idVoice;

          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.error('Speech synthesis error:', err);
        }
      } else {
        // Fallback to Google Translate TTS Audio
        try {
          const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(speechText)}&tl=id&client=tw-ob`;
          const audio = new Audio(ttsUrl);
          audio.play().catch(() => {});
        } catch (err) {}
      }

      const timer = setTimeout(() => {
        onClose();
      }, 3500); // Auto close after 3.5 seconds
      return () => clearTimeout(timer);
    }
  }, [isOpen, santriName, prayerTime, onClose]);

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
            {photoUrl && !imgError ? (
              <img 
                src={photoUrl} 
                alt={santriName} 
                style={{ width: '100%', height: '100%', borderRadius: '14px', objectFit: 'cover' }} 
                onError={() => setImgError(true)}
              />
            ) : (
              <User size={36} color="#4f46e5" />
            )}
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
