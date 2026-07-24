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
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const lastPlayedKeyRef = useRef<string>('');

  const formatPhotoUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/sekolah-info-static/') || url.startsWith('/static/')) return url;
    if (url.startsWith('sekolah-info-static/')) return `/${url}`;
    if (url.startsWith('static/')) return `/${url}`;
    if (url.startsWith('/uploads/')) return `/sekolah-info-static${url}`;
    if (url.startsWith('uploads/')) return `/sekolah-info-static/${url}`;
    if (url.startsWith('storage/')) return `/sekolah-info-static/${url.replace('storage/', '')}`;
    if (url.startsWith('/storage/')) return `/sekolah-info-static/${url.replace('/storage/', '')}`;
    if (url.startsWith('/')) return url;
    return `/static/uploads/${url}`;
  };

  useEffect(() => {
    if (isOpen) {
      setImgError(false);

      const currentScanKey = `${santriName}_${prayerTime}_${time}`;

      // ONLY play audio once per unique scan event (ignore parent clock re-renders)
      if (lastPlayedKeyRef.current !== currentScanKey) {
        lastPlayedKeyRef.current = currentScanKey;

        // Clean up any ongoing previous audio
        if (activeAudioRef.current) {
          activeAudioRef.current.pause();
          activeAudioRef.current.currentTime = 0;
          activeAudioRef.current = null;
        }

        const speechText = `${santriName} sudah absen sholat ${prayerTime}`;
        const ttsUrl = `/api/attendance/tts?text=${encodeURIComponent(speechText)}`;

        let hasPlayedPrimary = false;

        const playWebSpeechFallback = () => {
          if (hasPlayedPrimary) return; // Prevent double playback if primary audio already started
          if ('speechSynthesis' in window) {
            try {
              window.speechSynthesis.cancel();
              if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
              }
              const utterance = new SpeechSynthesisUtterance(speechText);
              utterance.lang = 'id-ID';
              utterance.rate = 0.95;
              utterance.pitch = 1.2; // Female voice pitch
              utterance.volume = 1.0;

              utterance.onend = () => {
                setTimeout(() => onCloseRef.current(), 1000);
              };

              const voices = window.speechSynthesis.getVoices();
              const femaleVoice = voices.find(
                v => v.lang.toLowerCase().includes('id') &&
                (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('gadis') || v.name.toLowerCase().includes('indonesia') || v.name.toLowerCase().includes('zira'))
              ) || voices.find(v => v.lang.toLowerCase().includes('id'));
              if (femaleVoice) utterance.voice = femaleVoice;

              window.speechSynthesis.speak(utterance);
            } catch (e) {}
          }
        };

        const audio = new Audio(ttsUrl);
        audio.volume = 1.0;
        activeAudioRef.current = audio;

        audio.onplay = () => {
          hasPlayedPrimary = true;
        };

        // Close overlay smoothly 1.2s AFTER the spoken sentence finishes completely
        audio.onended = () => {
          setTimeout(() => {
            onCloseRef.current();
          }, 1200);
        };

        audio.play().catch((err) => {
          console.warn('Google TTS audio playback blocked or failed, using browser voice fallback:', err);
          playWebSpeechFallback();
        });
      }

      // Max safety fallback timer (6.5s) in case audio fails to load or play
      const maxSafetyTimer = setTimeout(() => {
        onCloseRef.current();
      }, 6500);

      return () => {
        clearTimeout(maxSafetyTimer);
      };
    } else {
      // Reset scan key when overlay closes
      lastPlayedKeyRef.current = '';
    }
  }, [isOpen, santriName, prayerTime, time]);

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
