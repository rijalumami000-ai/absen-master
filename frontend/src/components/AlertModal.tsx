import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  onClose: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({ isOpen, type, title, message, onClose }) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <div style={iconWrapperStyle('#ecfdf5', '#10b981')}>
            <CheckCircle size={28} />
          </div>
        );
      case 'error':
        return (
          <div style={iconWrapperStyle('#fef2f2', '#ef4444')}>
            <XCircle size={28} />
          </div>
        );
      default:
        return (
          <div style={iconWrapperStyle('#eff6ff', '#3b82f6')}>
            <Info size={28} />
          </div>
        );
    }
  };

  return createPortal(
    <div style={overlayStyle}>
      <div style={contentStyle} className="animate-slide">
        <button onClick={onClose} style={closeButtonStyle}>
          <X size={18} />
        </button>
        
        <div style={bodyStyle}>
          {getIcon()}
          <h3 style={titleStyle}>{title}</h3>
          <p style={messageStyle}>{message}</p>
        </div>
        
        <div style={footerStyle}>
          <button onClick={onClose} className="btn btn-primary" style={buttonStyle}>
            Selesai
          </button>
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
  backgroundColor: 'rgba(15, 23, 42, 0.4)',
  backdropFilter: 'blur(6px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
};

const contentStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)',
  width: '100%',
  maxWidth: '400px',
  padding: '32px 24px 24px 24px',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
};

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '16px',
  right: '16px',
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  padding: '4px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.2s, color 0.2s',
};

const bodyStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
  width: '100%',
};

const iconWrapperStyle = (bg: string, color: string): React.CSSProperties => ({
  width: '56px',
  height: '56px',
  borderRadius: '50%',
  backgroundColor: bg,
  color: color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: `0 0 0 4px ${bg}`,
  marginBottom: '8px',
});

const titleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#0f172a',
  margin: 0,
};

const messageStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#64748b',
  margin: 0,
  lineHeight: '1.5',
};

const footerStyle: React.CSSProperties = {
  marginTop: '24px',
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  fontWeight: 600,
  borderRadius: '8px',
};
