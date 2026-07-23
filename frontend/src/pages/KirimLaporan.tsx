import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  RefreshCw, 
  AlertCircle,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { waService, santriService } from '../services/api';
import { AlertModal } from '../components/AlertModal';

export const KirimLaporan: React.FC = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [genderFilter, setGenderFilter] = useState('Putri');
  const [roomFilter, setRoomFilter] = useState('');
  const [rooms, setRooms] = useState<string[]>([]);

  // Template State
  const [templateText, setTemplateText] = useState('');
  const [placeholders, setPlaceholders] = useState<any[]>([]);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // List of Santri
  const [list, setList] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; type: 'success' | 'error' | 'info'; title: string; message: string }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  // 24-Hour Day Completion Check
  const todayStr = new Date().toISOString().split('T')[0];
  const isLocked = date >= todayStr;

  // Sending progress state
  const [sendingState, setSendingState] = useState<{
    isSending: boolean;
    total: number;
    current: number;
    results: Record<number, { success: boolean; error?: string }>;
  }>({
    isSending: false,
    total: 0,
    current: 0,
    results: {}
  });

  const loadInitialSettings = async () => {
    try {
      const tpl = await waService.getTemplate();
      setTemplateText(tpl.template);

      const pl = await waService.getPlaceholders();
      setPlaceholders(pl.placeholders);

      const r = await santriService.getRooms();
      setRooms(r);
    } catch (err) {
      console.error(err);
    }
  };

  const loadList = async () => {
    setLoadingList(true);
    setSelectedIds([]);
    try {
      // Get all active santri matching Gender and Room filters
      const santriData = await santriService.getAll({
        gender: genderFilter || undefined,
        room: roomFilter || undefined
      });
      
      setList(santriData);
      
      // Auto-select santri who have valid parent phone numbers
      const selectable = santriData.filter((s: any) => s.parent_phone && s.parent_phone.trim());
      setSelectedIds(selectable.map((s: any) => s.id));

    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadInitialSettings();
  }, []);

  useEffect(() => {
    loadList();
  }, [date, genderFilter, roomFilter]);

  const handleSaveTemplate = async () => {
    setIsSavingTemplate(true);
    try {
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Template Diperbarui',
        message: 'Template pesan WhatsApp 24 jam berhasil disimpan.',
      });
      // Reload list
      loadList();
    } catch (err) {
      console.error(err);
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Gagal Menyimpan',
        message: 'Terjadi kesalahan saat memperbarui template.',
      });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const selectable = list.filter(s => s.parent_phone && s.parent_phone.trim());
      setSelectedIds(selectable.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSendBroadcast = async () => {
    if (isLocked) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Laporan Terkunci',
        message: 'Laporan 24 jam belum dapat dikirim karena hari ini belum selesai.',
      });
      return;
    }

    if (selectedIds.length === 0) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Pilih Santri',
        message: 'Silakan pilih minimal satu santri yang memiliki nomor HP wali!',
      });
      return;
    }

    if (!window.confirm(`Kirim laporan 24 jam ke ${selectedIds.length} wali santri terpilih?`)) return;

    setSendingState({
      isSending: true,
      total: selectedIds.length,
      current: 0,
      results: {}
    });

    let sentCount = 0;
    const newResults: Record<number, { success: boolean; error?: string }> = {};

    for (const sId of selectedIds) {
      try {
        const res = await waService.send({
          santri_ids: [sId],
          prayer_time: 'Subuh',
          date: date
        });
        
        const singleRes = res.results[0];
        newResults[sId] = {
          success: singleRes.success,
          error: singleRes.error
        };
      } catch (err: any) {
        newResults[sId] = {
          success: false,
          error: err.message || "Gagal menghubungi gateway"
        };
      }
      
      sentCount++;
      setSendingState(prev => ({
        ...prev,
        current: sentCount,
        results: { ...newResults }
      }));
    }

    const successCount = Object.values(newResults).filter(r => r.success).length;
    const failCount = Object.values(newResults).filter(r => !r.success).length;
    
    setAlertState({
      isOpen: true,
      type: failCount > 0 ? 'info' : 'success',
      title: 'Pengiriman Selesai',
      message: `Proses pengiriman selesai! ${successCount} laporan sukses terkirim, ${failCount} laporan gagal.`,
    });
  };

  const selectableList = list.filter(s => s.parent_phone && s.parent_phone.trim());

  return (
    <div className="animate-slide">
      <div className="page-header">
        <div className="page-title">
          <h1>Kirim Laporan WA</h1>
          <p>Kirimkan laporan harian absensi 24 jam sholat santri secara massal ke nomor WhatsApp wali santri.</p>
        </div>
      </div>

      <div className="grid-main-sidebar">
        {/* Left Column: Filter + List */}
        <div>
          {/* Filters */}
          <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ margin: 0, width: '160px' }}>
                <label className="form-label">Tanggal Laporan</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0, width: '130px' }}>
                <label className="form-label">Gender</label>
                <select className="form-control" value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
                  <option value="">Semua</option>
                  <option value="Putra">Putra</option>
                  <option value="Putri">Putri</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0, width: '140px' }}>
                <label className="form-label">Kamar</label>
                <select className="form-control" value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)}>
                  <option value="">Semua Kamar</option>
                  {rooms.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <button onClick={loadList} className="btn btn-secondary" style={{ height: '38px' }}>
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* 24-Hour Completion Lock Warning */}
          {isLocked && (
            <div className="card" style={{ borderLeft: '4px solid var(--warning)', backgroundColor: '#fffbeb', padding: '16px 20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertCircle size={24} color="var(--warning)" style={{ flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#92400e', margin: 0 }}>
                    Pengiriman Laporan 24 Jam Belum Terbuka
                  </h4>
                  <p style={{ fontSize: '12px', color: '#b45309', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                    Laporan harian untuk tanggal <strong>{date}</strong> belum dapat dikirim karena hari belum berakhir. Pengiriman laporan 24 jam penuh dibuka mulai pukul <strong>00:00 esok harinya</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sending Progress Indicator */}
          {sendingState.isSending && (
            <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>Mengirim Laporan WhatsApp...</span>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{sendingState.current} / {sendingState.total}</span>
              </div>
              
              <div style={progressBarContainerStyle}>
                <div style={{ 
                  ...progressBarFillStyle, 
                  width: `${(sendingState.current / sendingState.total) * 100}%` 
                }}></div>
              </div>
              
              {sendingState.current === sendingState.total && (
                <button 
                  onClick={() => setSendingState(prev => ({ ...prev, isSending: false }))} 
                  className="btn btn-secondary" 
                  style={{ marginTop: '14px', padding: '4px 12px', fontSize: '12px' }}
                >
                  Tutup Progress
                </button>
              )}
            </div>
          )}

          {/* List Section */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 className="card-title" style={{ margin: 0 }}>
                Daftar Pengiriman ({list.length} santri)
              </h3>
              
              <button 
                onClick={handleSendBroadcast} 
                className="btn btn-primary"
                disabled={selectedIds.length === 0 || sendingState.isSending || isLocked}
              >
                <Send size={14} />
                Kirim Laporan ({selectedIds.length} Terpilih)
              </button>
            </div>

            {loadingList ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                <RefreshCw size={32} className="pulse-icon" style={{ margin: '0 auto 10px auto' }} />
                <p>Memuat daftar santri dan preview laporan...</p>
              </div>
            ) : list.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <Info size={32} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
                <p>Tidak ada santri yang cocok dengan filter yang dipilih.</p>
              </div>
            ) : (
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          disabled={isLocked || selectableList.length === 0}
                          checked={selectableList.length > 0 && selectedIds.length === selectableList.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th>Santri & Kamar</th>
                      <th>No. WhatsApp Wali</th>
                      <th>Status Kirim</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((rec) => {
                      const hasPhone = rec.parent_phone && rec.parent_phone.trim();
                      const isSelected = selectedIds.includes(rec.id);
                      const sendResult = sendingState.results[rec.id];

                      return (
                        <tr key={rec.id}>
                          <td style={{ textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              disabled={!hasPhone || isLocked}
                              checked={isSelected}
                              onChange={() => handleSelectOne(rec.id)}
                            />
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{rec.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Kamar {rec.room} • {rec.gender}
                            </div>
                          </td>
                          <td>
                            {hasPhone ? (
                              <span style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a' }}>
                                {rec.parent_phone}
                              </span>
                            ) : (
                              <span className="badge badge-alfa" style={{ fontSize: '10px' }}>
                                Tanpa No. HP Wali
                              </span>
                            )}
                          </td>
                          <td>
                            {sendResult ? (
                              sendResult.success ? (
                                <span className="badge badge-hadir" style={{ gap: '2px' }}>
                                  <CheckCircle size={10} /> Sukses
                                </span>
                              ) : (
                                <span className="badge badge-alfa" title={sendResult.error} style={{ gap: '2px' }}>
                                  <XCircle size={10} /> Gagal
                                </span>
                              )
                            ) : (
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {hasPhone ? (isLocked ? 'Terkunci' : 'Ready') : 'Skipped'}
                              </span>
                            )}
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

        {/* Right Column: Template Editor */}
        <div>
          <div className="card">
            <h3 className="card-title">
              <MessageSquare size={18} color="var(--accent-primary)" />
              Template Pesan WA
            </h3>
            
            <div className="form-group">
              <textarea 
                className="form-control" 
                rows={12}
                style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.5' }}
                value={templateText}
                onChange={(e) => setTemplateText(e.target.value)}
              ></textarea>
            </div>

            <button 
              onClick={handleSaveTemplate} 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              disabled={isSavingTemplate}
            >
              {isSavingTemplate ? 'Menyimpan...' : 'Simpan Template'}
            </button>

            <div style={placeholdersContainerStyle}>
              <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
                Placeholder yang didukung:
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {placeholders.map(p => (
                  <button 
                    key={p.key}
                    onClick={() => {
                      setTemplateText(prev => prev + ' ' + p.key);
                    }}
                    style={placeholderBadgeStyle}
                    title={p.desc}
                  >
                    {p.key}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.4' }}>
                *Klik placeholder di atas untuk menyisipkannya langsung ke dalam kolom template.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
      <AlertModal 
        isOpen={alertState.isOpen} 
        type={alertState.type} 
        title={alertState.title} 
        message={alertState.message} 
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))} 
      />
    </div>
  );
};

const placeholdersContainerStyle: React.CSSProperties = {
  marginTop: '20px',
  borderTop: '1px solid var(--border-color)',
  paddingTop: '16px'
};

const placeholderBadgeStyle: React.CSSProperties = {
  backgroundColor: '#e0e7ff',
  color: '#4f46e5',
  border: 'none',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontFamily: 'monospace',
  cursor: 'pointer',
  fontWeight: 600
};

const progressBarContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '8px',
  backgroundColor: '#f1f5f9',
  borderRadius: '4px',
  overflow: 'hidden',
  marginTop: '4px'
};

const progressBarFillStyle: React.CSSProperties = {
  height: '100%',
  backgroundColor: 'var(--accent-primary)',
  borderRadius: '4px',
  transition: 'width 0.3s ease'
};
