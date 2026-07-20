import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  HelpCircle, 
  RefreshCw, 
  Check, 
  AlertCircle,
  Copy,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { waService, santriService, rekapService } from '../services/api';

export const KirimLaporan: React.FC = () => {
  const getActiveSholat = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 6) return 'Subuh';
    if (hour >= 11 && hour < 14) return 'Dzuhur';
    if (hour >= 15 && hour < 17) return 'Ashar';
    if (hour >= 17 && hour < 19) return 'Maghrib';
    if (hour >= 19 && hour < 22) return 'Isya';
    return 'Subuh';
  };

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [prayerTime, setPrayerTime] = useState(getActiveSholat());
  const [statusFilter, setStatusFilter] = useState('Alfa'); // Default Alfa (Absent) is what teachers report
  const [genderFilter, setGenderFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [rooms, setRooms] = useState<string[]>([]);

  // Template State
  const [templateText, setTemplateText] = useState('');
  const [placeholders, setPlaceholders] = useState<any[]>([]);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // List of Santri
  const [list, setList] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const [loadingList, setLoadingList] = useState(false);

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
    setPreviews({});
    try {
      // 1. Get attendance records matching filters
      const records = await rekapService.getRekap({
        date,
        prayer_time: prayerTime,
        status: statusFilter || undefined,
        room: roomFilter || undefined,
        gender: genderFilter || undefined
      });
      
      setList(records);
      
      // Auto-select all by default
      setSelectedIds(records.map((r: any) => r.santri_id));

      // 2. Fetch previews
      for (const rec of records) {
        try {
          const res = await waService.preview({
            santri_id: rec.santri_id,
            prayer_time: prayerTime,
            date: date
          });
          setPreviews(prev => ({
            ...prev,
            [rec.santri_id]: res.message
          }));
        } catch (err) {
          console.error(err);
        }
      }

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
  }, [date, prayerTime, statusFilter, genderFilter, roomFilter]);

  const handleSaveTemplate = async () => {
    setIsSavingTemplate(true);
    try {
      await waService.updateTemplate(templateText);
      alert("Template pesan berhasil diperbarui!");
      // Reload previews
      loadList();
    } catch (err) {
      console.error(err);
      alert("Gagal memperbarui template");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(list.map(r => r.santri_id));
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
    if (selectedIds.length === 0) {
      alert("Silakan pilih minimal satu santri!");
      return;
    }

    if (!window.confirm(`Kirim laporan ke ${selectedIds.length} wali santri terpilih?`)) return;

    setSendingState({
      isSending: true,
      total: selectedIds.length,
      current: 0,
      results: {}
    });

    // Send sequentially to prevent API rate-limit and update progress correctly
    let sentCount = 0;
    const newResults: Record<number, { success: boolean; error?: string }> = {};

    for (const sId of selectedIds) {
      try {
        const res = await waService.send({
          santri_ids: [sId],
          prayer_time: prayerTime,
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

    alert(`Proses pengiriman selesai! ${Object.values(newResults).filter(r => r.success).length} sukses, ${Object.values(newResults).filter(r => !r.success).length} gagal.`);
  };

  return (
    <div className="animate-slide">
      <div className="page-header">
        <div className="page-title">
          <h1>Kirim Laporan WA</h1>
          <p>Kirimkan laporan absensi sholat santri secara massal ke no WhatsApp wali santri.</p>
        </div>
      </div>

      <div className="grid-main-sidebar">
        {/* Left Column: Filter + List */}
        <div>
          {/* Filters */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ margin: 0, width: '150px' }}>
                <label className="form-label">Tanggal</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0, width: '120px' }}>
                <label className="form-label">Waktu Sholat</label>
                <select className="form-control" value={prayerTime} onChange={(e) => setPrayerTime(e.target.value)}>
                  <option value="Subuh">Subuh</option>
                  <option value="Dzuhur">Dzuhur</option>
                  <option value="Ashar">Ashar</option>
                  <option value="Maghrib">Maghrib</option>
                  <option value="Isya">Isya</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0, width: '130px' }}>
                <label className="form-label">Status Kehadiran</label>
                <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">Semua Status</option>
                  <option value="Hadir">Hadir</option>
                  <option value="Sakit">Sakit</option>
                  <option value="Izin">Izin</option>
                  <option value="Alfa">Alfa</option>
                  <option value="Masbuq">Masbuq</option>
                  <option value="Haid">Haid</option>
                  <option value="Istihadhoh">Istihadhoh</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0, width: '130px' }}>
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

          {/* Sending Progress Indicator */}
          {sendingState.isSending && (
            <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)', padding: '20px' }}>
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
                disabled={selectedIds.length === 0 || sendingState.isSending}
              >
                <Send size={14} />
                Kirim Laporan ({selectedIds.length} Terpilih)
              </button>
            </div>

            {loadingList ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                <RefreshCw size={32} className="pulse-icon" style={{ margin: '0 auto 10px auto' }} />
                <p>Memuat antrian laporan...</p>
              </div>
            ) : list.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <Info size={32} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
                <p>Tidak ada santri yang cocok untuk dilaporkan.</p>
              </div>
            ) : (
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={list.length > 0 && selectedIds.length === list.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th>Santri</th>
                      <th>Detail Kehadiran</th>
                      <th>Pratinjau Pesan</th>
                      <th>Status Kirim</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((rec) => {
                      const isSelected = selectedIds.includes(rec.santri_id);
                      const sendResult = sendingState.results[rec.santri_id];

                      return (
                        <tr key={rec.id}>
                          <td style={{ textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => handleSelectOne(rec.santri_id)}
                            />
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{rec.santri_name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              WA: {rec.parent_phone}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '13px' }}>{rec.prayer_time}</div>
                            <div style={{ marginTop: '4px' }}>
                              <span className={`badge badge-${rec.status.toLowerCase()}`} style={{ fontSize: '10px' }}>
                                {rec.status}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div style={previewBoxStyle}>
                              {previews[rec.santri_id] || 'Loading preview...'}
                            </div>
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
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Ready</span>
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
                rows={10}
                style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5' }}
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
                      setTemplateText(prev => prev + p.key);
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
  );
};

const previewBoxStyle: React.CSSProperties = {
  fontSize: '11px',
  backgroundColor: '#f1f5f9',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '8px 12px',
  whiteSpace: 'pre-wrap',
  maxWidth: '220px',
  maxHeight: '100px',
  overflowY: 'auto',
  color: '#475569'
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
