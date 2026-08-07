import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  Sparkles,
  UserCheck
} from 'lucide-react';
import { faceService } from '../services/api';

interface FaceEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  santri: {
    id: number;
    name: string;
    room: string;
    has_face_registered?: boolean;
    photo_url?: string;
  } | null;
  onSuccess: () => void;
}

export const FaceEnrollModal: React.FC<FaceEnrollModalProps> = ({
  isOpen,
  onClose,
  santri,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize WebCam stream when modal opens
  useEffect(() => {
    if (!isOpen || activeTab !== 'camera') return;

    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        setErrorMessage(null);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: 'user' },
            audio: false
          });
        } catch (e1) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraActive(true);
        }
      } catch (err) {
        console.error('Camera access error:', err);
        setErrorMessage('Gagal membuka kamera web. Gunakan opsi unggah foto.');
        setCameraActive(false);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setCameraActive(false);
    };
  }, [isOpen, activeTab]);

  if (!isOpen || !santri) return null;

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
      setCapturedImage(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Pilih file gambar JPEG atau PNG yang valid.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCapturedImage(event.target.result as string);
        setErrorMessage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEnrollment = async () => {
    if (!capturedImage) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await faceService.register(santri.id, capturedImage);
      setSuccessMessage(res.message || 'Wajah santri berhasil terdaftar!');
      onSuccess();

      setTimeout(() => {
        onClose();
        setCapturedImage(null);
        setSuccessMessage(null);
      }, 1500);
    } catch (err: any) {
      console.error('Error saving face enrollment:', err);
      const detail = err.response?.data?.detail || 'Gagal mengekstrak fitur wajah. Pastikan foto wajah terlihat jelas.';
      setErrorMessage(detail);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnregister = async () => {
    if (!confirm(`Hapus data pendaftaran wajah untuk ${santri.name}?`)) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await faceService.unregister(santri.id);
      setSuccessMessage(res.message || 'Data wajah berhasil dihapus.');
      onSuccess();

      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
      }, 1200);
    } catch (err: any) {
      setErrorMessage('Gagal menghapus data wajah santri.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        maxWidth: '560px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: '#e0e7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={20} color="#4f46e5" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Pendaftaran Wajah Santri
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                {santri.name} • Kamar {santri.room}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '6px',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content Body */}
        <div style={{ padding: '24px' }}>
          
          {/* Status Badge */}
          {santri.has_face_registered && (
            <div style={{
              marginBottom: '20px',
              padding: '12px 16px',
              borderRadius: '14px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={20} color="#10b981" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#065f46' }}>
                  Wajah Sudah Terdaftar
                </span>
              </div>
              <button
                onClick={handleUnregister}
                disabled={isLoading}
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Trash2 size={13} /> Hapus
              </button>
            </div>
          )}

          {/* Option Selector Tabs */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px',
            backgroundColor: '#f1f5f9',
            padding: '4px',
            borderRadius: '12px'
          }}>
            <button
              onClick={() => { setActiveTab('camera'); setCapturedImage(null); }}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'camera' ? '#ffffff' : 'transparent',
                fontWeight: activeTab === 'camera' ? 700 : 600,
                color: activeTab === 'camera' ? '#4f46e5' : '#64748b',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: activeTab === 'camera' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Camera size={16} /> Ambil dari WebCam
            </button>
            <button
              onClick={() => { setActiveTab('upload'); setCapturedImage(null); }}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'upload' ? '#ffffff' : 'transparent',
                fontWeight: activeTab === 'upload' ? 700 : 600,
                color: activeTab === 'upload' ? '#4f46e5' : '#64748b',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: activeTab === 'upload' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Upload size={16} /> Unggah File Foto
            </button>
          </div>

          {/* View Container */}
          {capturedImage ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '100%',
                height: '280px',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '2px solid #6366f1',
                backgroundColor: '#0f172a',
                marginBottom: '16px'
              }}>
                <img
                  src={capturedImage}
                  alt="Hasil Capture Wajah"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <button
                onClick={() => setCapturedImage(null)}
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Ambil Ulang Foto
              </button>
            </div>
          ) : activeTab === 'camera' ? (
            <div>
              <div style={{
                position: 'relative',
                width: '100%',
                height: '280px',
                backgroundColor: '#0f172a',
                borderRadius: '16px',
                overflow: 'hidden',
                marginBottom: '16px'
              }}>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)'
                  }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '160px',
                  height: '210px',
                  borderRadius: '50%',
                  border: '2px dashed rgba(255, 255, 255, 0.6)',
                  pointerEvents: 'none'
                }} />
              </div>

              <button
                onClick={handleCapture}
                disabled={!cameraActive}
                style={{
                  width: '100%',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '14px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Camera size={18} /> Tangkap Foto Wajah
              </button>
            </div>
          ) : (
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '16px',
                  padding: '40px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#f8fafc',
                  marginBottom: '16px'
                }}
              >
                <Upload size={36} color="#94a3b8" style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: 600, color: '#334155', fontSize: '14px' }}>
                  Klik di sini untuk memilih foto santri
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  Format JPG, JPEG, PNG (Maksimal 5MB)
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          )}

          {/* Feedback Messages */}
          {errorMessage && (
            <div style={{
              marginTop: '16px',
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} /> {errorMessage}
            </div>
          )}

          {successMessage && (
            <div style={{
              marginTop: '16px',
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: '#ecfdf5',
              color: '#065f46',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={16} /> {successMessage}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          backgroundColor: '#f8fafc'
        }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Batal
          </button>

          {capturedImage && (
            <button
              onClick={handleSaveEnrollment}
              disabled={isLoading}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#10b981',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
              }}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="spin-icon" /> Memproses AI...
                </>
              ) : (
                <>
                  <UserCheck size={16} /> Simpan Data Wajah
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
