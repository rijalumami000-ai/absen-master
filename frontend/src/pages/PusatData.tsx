import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Fingerprint, 
  Info,
  Calendar, 
  Users,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { academicYearService, santriService, fingerprintService, attendanceService } from '../services/api';

export const PusatData: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'santri' | 'tahun'>('santri');

  // Academic Year State
  const [years, setYears] = useState<any[]>([]);
  const [newYearName, setNewYearName] = useState('');
  
  // Santri State
  const [santriList, setSantriList] = useState<any[]>([]);
  const [rooms, setRooms] = useState<string[]>([]);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState('');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    gender: 'Putra',
    room: '',
    parent_phone: '',
    academic_year_id: '',
  });

  // Fingerprint Registration Modal
  const [enrollModal, setEnrollModal] = useState<{ isOpen: boolean; santriId?: number; name?: string; status: 'waiting' | 'success' | 'failed' }>({
    isOpen: false,
    status: 'waiting'
  });

  // Load Initial Data
  const loadAcademicYears = async () => {
    try {
      const data = await academicYearService.getAll();
      setYears(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadSantri = async () => {
    try {
      const activeYear = years.find(y => y.is_active)?.id;
      const data = await santriService.getAll({
        gender: selectedGenderFilter || undefined,
        room: selectedRoomFilter || undefined,
        academic_year_id: activeYear
      });
      setSantriList(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadRooms = async () => {
    try {
      const data = await santriService.getRooms();
      setRooms(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAcademicYears();
    loadRooms();
  }, []);

  useEffect(() => {
    if (years.length > 0) {
      loadSantri();
    }
  }, [years, selectedRoomFilter, selectedGenderFilter]);

  // SSE Listener for Enrollment
  useEffect(() => {
    if (!enrollModal.isOpen) return;

    const eventSource = new EventSource(attendanceService.getStreamUrl());
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'enroll_success' && data.santri_id === enrollModal.santriId) {
          setEnrollModal(prev => ({ ...prev, status: 'success' }));
          loadSantri(); // Refresh table
        }
      } catch (err) {
        console.error(err);
      }
    };

    return () => eventSource.close();
  }, [enrollModal.isOpen, enrollModal.santriId]);

  // Academic Year Handlers
  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYearName.trim()) return;
    try {
      await academicYearService.create(newYearName);
      setNewYearName('');
      loadAcademicYears();
    } catch (err: any) {
      if (!err.response) {
        alert("Gagal menambah tahun ajaran: Tidak dapat terhubung ke server Backend. Pastikan server backend sudah dijalankan di port 8000!");
      } else {
        alert(err.response.data?.detail || "Gagal menambah tahun ajaran");
      }
    }
  };

  const handleActivateYear = async (id: number) => {
    try {
      await academicYearService.activate(id);
      loadAcademicYears();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteYear = async (id: number) => {
    if (!window.confirm("Hapus tahun ajaran ini?")) return;
    try {
      await academicYearService.delete(id);
      loadAcademicYears();
    } catch (err: any) {
      if (!err.response) {
        alert("Gagal menghapus tahun ajaran: Tidak dapat terhubung ke server Backend. Pastikan server backend sudah dijalankan!");
      } else {
        alert(err.response.data?.detail || "Gagal menghapus tahun ajaran");
      }
    }
  };

  // Santri Handlers
  const handleOpenAddForm = () => {
    setEditingId(null);
    const activeYear = years.find(y => y.is_active)?.id || '';
    setFormData({
      name: '',
      gender: 'Putra',
      room: '',
      parent_phone: '',
      academic_year_id: String(activeYear),
    });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (santri: any) => {
    setEditingId(santri.id);
    setFormData({
      name: santri.name,
      gender: santri.gender,
      room: santri.room,
      parent_phone: santri.parent_phone,
      academic_year_id: String(santri.academic_year_id || ''),
    });
    setIsFormOpen(true);
  };

  const handleSaveSantri = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        academic_year_id: formData.academic_year_id ? Number(formData.academic_year_id) : undefined
      };
      if (editingId) {
        await santriService.update(editingId, payload);
      } else {
        await santriService.create(payload as any);
      }
      setIsFormOpen(false);
      loadSantri();
      loadRooms();
    } catch (err: any) {
      if (!err.response) {
        alert("Gagal menyimpan data santri: Tidak dapat terhubung ke server Backend. Pastikan server backend sudah dijalankan!");
      } else {
        alert(err.response.data?.detail || "Gagal menyimpan data santri");
      }
    }
  };

  const handleDeleteSantri = async (id: number, name: string) => {
    if (!window.confirm(`Hapus data santri '${name}'? Semua data absensi terkait juga akan terhapus.`)) return;
    try {
      await santriService.delete(id);
      loadSantri();
      loadRooms();
    } catch (err) {
      console.error(err);
    }
  };

  // Fingerprint Enrollment triggers
  const handleStartEnroll = async (id: number, name: string) => {
    try {
      await fingerprintService.startEnroll(id);
      setEnrollModal({
        isOpen: true,
        santriId: id,
        name: name,
        status: 'waiting'
      });
    } catch (err: any) {
      if (!err.response) {
        alert("Gagal memulai sesi pendaftaran: Tidak dapat terhubung ke server Backend. Pastikan server backend sudah dijalankan!");
      } else {
        alert(err.response.data?.detail || "Gagal memulai sesi pendaftaran");
      }
    }
  };

  const handleCancelEnroll = async () => {
    try {
      await fingerprintService.cancelEnroll();
      setEnrollModal(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredSantri = santriList.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.room.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-slide">
      <div className="page-header">
        <div className="page-title">
          <h1>Pusat Data</h1>
          <p>Kelola data santri, konfigurasi tahun ajaran aktif, dan registrasi biometrik sidik jari.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '8px' }}>
          <button 
            className="btn" 
            style={{ 
              padding: '6px 12px', 
              fontSize: '13px', 
              backgroundColor: activeSubTab === 'santri' ? 'white' : 'transparent',
              color: activeSubTab === 'santri' ? 'var(--text-main)' : 'var(--text-muted)',
              boxShadow: activeSubTab === 'santri' ? 'var(--shadow-sm)' : 'none',
            }}
            onClick={() => setActiveSubTab('santri')}
          >
            <Users size={16} />
            Data Santri
          </button>
          <button 
            className="btn" 
            style={{ 
              padding: '6px 12px', 
              fontSize: '13px', 
              backgroundColor: activeSubTab === 'tahun' ? 'white' : 'transparent',
              color: activeSubTab === 'tahun' ? 'var(--text-main)' : 'var(--text-muted)',
              boxShadow: activeSubTab === 'tahun' ? 'var(--shadow-sm)' : 'none',
            }}
            onClick={() => setActiveSubTab('tahun')}
          >
            <Calendar size={16} />
            Tahun Ajaran
          </button>
        </div>
      </div>

      {activeSubTab === 'tahun' ? (
        <div className="grid-2">
          {/* Add Year */}
          <div className="card">
            <h3 className="card-title">
              <Calendar size={18} color="var(--accent-primary)" />
              Tambah Tahun Ajaran Baru
            </h3>
            <form onSubmit={handleAddYear} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Nama Tahun Ajaran</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: 2025/2026"
                  value={newYearName}
                  onChange={(e) => setNewYearName(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <Plus size={16} />
                Tambah Tahun Ajaran
              </button>
            </form>
          </div>

          {/* List Years */}
          <div className="card">
            <h3 className="card-title">Daftar Tahun Ajaran</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tahun Ajaran</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map((y) => (
                    <tr key={y.id}>
                      <td style={{ fontWeight: 600 }}>Tahun Ajaran {y.name}</td>
                      <td>
                        {y.is_active ? (
                          <span className="badge badge-hadir">Aktif</span>
                        ) : (
                          <span className="badge badge-istihadhoh">Inaktif</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {!y.is_active && (
                            <button 
                              onClick={() => handleActivateYear(y.id)} 
                              className="btn btn-primary" 
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                            >
                              Aktifkan
                            </button>
                          )}
                          {!y.is_active && (
                            <button 
                              onClick={() => handleDeleteYear(y.id)} 
                              className="btn btn-danger" 
                              style={{ padding: '4px 6px', display: 'flex', alignItems: 'center' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Santri Management Tab */
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '300px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Cari nama atau kamar santri..." 
                  style={{ paddingLeft: '36px' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <select 
                className="form-control" 
                style={{ width: '130px' }}
                value={selectedGenderFilter}
                onChange={(e) => setSelectedGenderFilter(e.target.value)}
              >
                <option value="">Semua Gender</option>
                <option value="Putra">Putra</option>
                <option value="Putri">Putri</option>
              </select>

              <select 
                className="form-control" 
                style={{ width: '140px' }}
                value={selectedRoomFilter}
                onChange={(e) => setSelectedRoomFilter(e.target.value)}
              >
                <option value="">Semua Kamar</option>
                {rooms.map(room => (
                  <option key={room} value={room}>{room}</option>
                ))}
              </select>
            </div>

            <button onClick={handleOpenAddForm} className="btn btn-primary">
              <Plus size={16} />
              Tambah Santri
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nama Lengkap</th>
                  <th>Gender</th>
                  <th>Kamar</th>
                  <th>WhatsApp Wali</th>
                  <th>Sidik Jari</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredSantri.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                      Tidak ada data santri ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredSantri.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>{s.gender}</td>
                      <td>{s.room}</td>
                      <td>{s.parent_phone}</td>
                      <td>
                        {s.has_fingerprint ? (
                          <span className="badge badge-hadir">
                            <Fingerprint size={12} />
                            Terdaftar ({s.fingerprint_id})
                          </span>
                        ) : (
                          <span className="badge badge-alfa">
                            <Fingerprint size={12} />
                            Belum
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => handleStartEnroll(s.id, s.name)} 
                            className="btn btn-secondary" 
                            style={{ 
                              padding: '6px 10px', 
                              fontSize: '12px',
                              borderColor: s.has_fingerprint ? 'var(--border-color)' : '#d946ef',
                              color: s.has_fingerprint ? 'var(--text-muted)' : '#d946ef'
                            }}
                          >
                            <Fingerprint size={14} />
                            Daftar Jari
                          </button>
                          <button 
                            onClick={() => handleOpenEditForm(s)} 
                            className="btn btn-secondary" 
                            style={{ padding: '6px' }}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteSantri(s.id, s.name)} 
                            className="btn btn-danger" 
                            style={{ padding: '6px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Santri Add/Edit Drawer/Modal */}
      {isFormOpen && createPortal(
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle} className="animate-slide">
            <h3 style={{ fontSize: '20px', fontWeight: 700, borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} color="var(--accent-primary)" />
              {editingId ? 'Edit Data Santri' : 'Tambah Santri Baru'}
            </h3>
            <form onSubmit={handleSaveSantri}>
              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Jenis Kelamin</label>
                <select
                  className="form-control"
                  value={formData.gender}
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                  required
                >
                  <option value="Putra">Putra</option>
                  <option value="Putri">Putri</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Kamar</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: Gaza"
                  value={formData.room}
                  onChange={(e) => setFormData(prev => ({ ...prev, room: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">WhatsApp Wali Santri</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: 628123456789"
                  value={formData.parent_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, parent_phone: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tahun Ajaran</label>
                <select
                  className="form-control"
                  value={formData.academic_year_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, academic_year_id: e.target.value }))}
                  required
                >
                  <option value="">Pilih Tahun Ajaran</option>
                  {years.map(y => (
                    <option key={y.id} value={y.id}>{y.name} {y.is_active ? '(Aktif)' : ''}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
                <button type="button" onClick={() => setIsFormOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Fingerprint Enrollment Progress Modal */}
      {enrollModal.isOpen && createPortal(
        <div style={modalOverlayStyle}>
          <div style={enrollModalContentStyle} className="animate-slide">
            {enrollModal.status === 'waiting' && (
              <>
                <div style={enrollGlowStyle} className="pulse-icon">
                  <Fingerprint size={48} color="#d946ef" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginTop: '20px' }}>Menunggu Sidik Jari</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px', lineHeight: '1.5' }}>
                  Silakan tempelkan jari santri <strong style={{ color: '#0f172a' }}>{enrollModal.name}</strong> sebanyak 3 kali di alat pemindai sidik jari.
                </p>
                <div style={{ marginTop: '24px', width: '100%' }}>
                  <button onClick={handleCancelEnroll} className="btn btn-secondary" style={{ width: '100%' }}>
                    Batal / Hentikan
                  </button>
                </div>
              </>
            )}

            {enrollModal.status === 'success' && (
              <>
                <div style={successGlowStyle}>
                  <CheckCircle size={48} color="#10b981" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginTop: '20px' }}>Pendaftaran Berhasil!</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>
                  Sidik jari berhasil direkam dan dikaitkan dengan profil {enrollModal.name}.
                </p>
                <div style={{ marginTop: '24px', width: '100%' }}>
                  <button onClick={() => setEnrollModal(prev => ({ ...prev, isOpen: false }))} className="btn btn-primary" style={{ width: '100%' }}>
                    Selesai
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

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
  borderRadius: '20px',
  width: '480px',
  padding: '32px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  border: '1px solid #e2e8f0',
};

const enrollModalContentStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '24px',
  width: '380px',
  padding: '36px 30px',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
  border: '1px solid #e2e8f0',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
};

const enrollGlowStyle: React.CSSProperties = {
  width: '80px',
  height: '80px',
  borderRadius: '50%',
  backgroundColor: '#fae8ff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const successGlowStyle: React.CSSProperties = {
  width: '80px',
  height: '80px',
  borderRadius: '50%',
  backgroundColor: '#d1fae5',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
