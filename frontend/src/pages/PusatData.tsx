import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Fingerprint, 
  Users, 
  Search, 
  CheckCircle, 
  User
} from 'lucide-react';
import { academicYearService, santriService, fingerprintService, attendanceService } from '../services/api';

export const PusatData: React.FC = () => {
  // Academic Year State
  const [years, setYears] = useState<any[]>([]);
  
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
    mother_name: '',
    photo_url: '',
    sekolah_info_santri_id: null as number | null,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);

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

  // Santri Handlers
  const handleOpenAddForm = () => {
    setEditingId(null);
    setPhotoFile(null);
    const activeYear = years.find(y => y.is_active)?.id || '';
    setFormData({
      name: '',
      gender: 'Putra',
      room: '',
      parent_phone: '',
      academic_year_id: String(activeYear),
      mother_name: '',
      photo_url: '',
      sekolah_info_santri_id: null,
    });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (santri: any) => {
    setEditingId(santri.id);
    setPhotoFile(null);
    setFormData({
      name: santri.name,
      gender: santri.gender,
      room: santri.room,
      parent_phone: santri.parent_phone,
      academic_year_id: String(santri.academic_year_id || ''),
      mother_name: santri.mother_name || '',
      photo_url: santri.photo_url || '',
      sekolah_info_santri_id: santri.sekolah_info_santri_id || null,
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
      
      let savedSantri;
      if (editingId) {
        savedSantri = await santriService.update(editingId, payload);
      } else {
        savedSantri = await santriService.create(payload as any);
      }

      // If photo file is selected for upload, proceed with upload
      if (photoFile && savedSantri && savedSantri.id) {
        await santriService.uploadPhoto(savedSantri.id, photoFile);
      }

      setIsFormOpen(false);
      setPhotoFile(null);
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

  // Helper to resolve student photo url dynamically
  const getPhotoUrl = (s: any) => {
    if (!s.photo_url) return null;
    const base = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    if (s.sekolah_info_santri_id) {
      // Served by school-info mounted directory on fastapi
      return `${base}/sekolah-info-static${s.photo_url}`;
    }
    // Served locally by uploads static folder
    return `${base}${s.photo_url}`;
  };

  return (
    <div className="animate-slide">
      <div className="page-header">
        <div className="page-title">
          <h1>Pusat Data</h1>
          <p>Kelola data santri, konfigurasi tahun ajaran aktif, dan registrasi biometrik sidik jari.</p>
        </div>
      </div>

      {/* Santri Management Card */}
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

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleOpenAddForm} className="btn btn-primary">
              <Plus size={16} />
              Tambah Santri
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Foto</th>
                <th>Nama Lengkap</th>
                <th>Gender</th>
                <th>Kamar</th>
                <th>Nama Ibu</th>
                <th>WhatsApp Wali</th>
                <th>Sidik Jari</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredSantri.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    Tidak ada data santri ditemukan.
                  </td>
                </tr>
              ) : (
                filteredSantri.map((s) => {
                  const studentPhoto = getPhotoUrl(s);
                  return (
                    <tr key={s.id}>
                      {/* Student Photo */}
                      <td>
                        {studentPhoto ? (
                          <img 
                            src={studentPhoto} 
                            alt={s.name} 
                            style={{ 
                              width: '36px', 
                              height: '36px', 
                              borderRadius: '50%', 
                              objectFit: 'cover',
                              border: '2px solid rgba(0,0,0,0.06)'
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '';
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div style={{ 
                            width: '36px', 
                            height: '36px', 
                            borderRadius: '50%', 
                            backgroundColor: '#e2e8f0', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: '#64748b',
                            border: '1.5px dashed #cbd5e1'
                          }}>
                            <User size={16} />
                          </div>
                        )}
                      </td>

                      {/* Name */}
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{s.name}</span>
                      </td>
                      <td>{s.gender}</td>
                      <td>{s.room}</td>
                      <td>{s.mother_name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>-</span>}</td>
                      <td>{s.parent_phone || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>-</span>}</td>
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
                          
                          {/* Show edit and delete actions only for manually added students */}
                          {!s.sekolah_info_santri_id && (
                            <>
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
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                  disabled={!!formData.sekolah_info_santri_id} // Disable name edit if synced
                />
              </div>

              <div className="form-group">
                <label className="form-label">Jenis Kelamin</label>
                <select
                  className="form-control"
                  value={formData.gender}
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                  required
                  disabled={!!formData.sekolah_info_santri_id}
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
                <label className="form-label">Nama Ibu Kandung</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: Siti Aminah"
                  value={formData.mother_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, mother_name: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">WhatsApp Wali Santri / Nomor Ibu</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: 628123456789"
                  value={formData.parent_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, parent_phone: e.target.value }))}
                  required
                />
              </div>

              {/* Photo upload field for manual santri */}
              <div className="form-group">
                <label className="form-label">Upload Foto Santri</label>
                <input
                  type="file"
                  accept="image/*"
                  className="form-control"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                />
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Format yang didukung: JPG, PNG, WEBP. Maks 2MB.
                </p>
                {formData.photo_url && (
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img 
                      src={getPhotoUrl(formData) || ''} 
                      alt="Santri Preview" 
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Foto saat ini</span>
                  </div>
                )}
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
  maxHeight: '90vh',
  overflowY: 'auto',
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
