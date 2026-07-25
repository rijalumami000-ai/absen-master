import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Calendar as CalendarIcon, 
  Check, 
  RefreshCw,
  SlidersHorizontal,
  Info,
  Search
} from 'lucide-react';
import { santriService, attendanceService, rekapService } from '../services/api';
import { AlertModal } from '../components/AlertModal';

export const AbsensiManual: React.FC = () => {
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
  
  // Filtering
  const [rooms, setRooms] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedGender, setSelectedGender] = useState('Putri');
  const [searchQuery, setSearchQuery] = useState('');

  // Data list
  const [santriList, setSantriList] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  const loadFilterOptions = async () => {
    try {
      const data = await santriService.getRooms();
      setRooms(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load Santri
      const santriData = await santriService.getAll({
        gender: selectedGender || undefined,
        room: selectedRoom || undefined,
      });
      setSantriList(santriData);

      // 2. Load Existing attendance for date & prayer
      const existing = await rekapService.getRekap({
        date,
        prayer_time: prayerTime,
        gender: selectedGender || undefined,
        room: selectedRoom || undefined,
      });

      // 3. Map attendance
      const map: Record<number, string> = {};
      existing.forEach((att: any) => {
        map[att.santri_id] = att.status;
      });

      // Initialize missing as 'Hadir' by default
      const updatedMap = { ...map };
      santriData.forEach((s: any) => {
        if (!updatedMap[s.id]) {
          updatedMap[s.id] = 'Hadir'; // Default status
        }
      });
      setAttendanceMap(updatedMap);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadData();
  }, [date, prayerTime, selectedRoom, selectedGender]);

  const filteredSantriList = santriList.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.room.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStatusChange = (santriId: number, status: string) => {
    setAttendanceMap(prev => ({
      ...prev,
      [santriId]: status
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const items = Object.entries(attendanceMap).map(([id, status]) => ({
        santri_id: Number(id),
        status
      }));

      // Filter only items that belong to the current filtered list
      const activeIds = new Set(santriList.map(s => s.id));
      const filteredItems = items.filter(item => activeIds.has(item.santri_id));

      await attendanceService.saveManual({
        prayer_time: prayerTime,
        date: date,
        items: filteredItems
      });

      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Absensi Disimpan',
        message: 'Data absensi manual santri berhasil disimpan ke database.',
      });
      loadData();
    } catch (err) {
      console.error(err);
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Gagal Menyimpan',
        message: 'Terjadi kesalahan saat menyimpan data absensi manual.',
      });
    } finally {
      setSaving(false);
    }
  };

  const statusOptions = [
    { label: 'Hadir', value: 'Hadir', className: 'badge-hadir' },
    { label: 'Sakit', value: 'Sakit', className: 'badge-sakit' },
    { label: 'Izin', value: 'Izin', className: 'badge-izin' },
    { label: 'Alfa', value: 'Alfa', className: 'badge-alfa' },
    { label: 'Masbuq', value: 'Masbuq', className: 'badge-masbuq' },
    { label: 'Haid', value: 'Haid', className: 'badge-haid' },
    { label: 'Istihadhoh', value: 'Istihadhoh', className: 'badge-istihadhoh' },
  ];

  return (
    <div className="animate-slide">
      <div className="page-header">
        <div className="page-title">
          <h1>Absensi Manual</h1>
          <p>Lakukan pencatatan atau koreksi kehadiran secara massal untuk santri.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0, width: '180px' }}>
            <label className="form-label">Cari Santri / Kamar</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-control" 
                style={{ paddingLeft: '32px' }}
                placeholder="Cari..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0, width: '160px' }}>
            <label className="form-label">Tanggal</label>
            <div style={{ position: 'relative' }}>
              <CalendarIcon size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="date" 
                className="form-control" 
                style={{ paddingLeft: '32px' }}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0, width: '130px' }}>
            <label className="form-label">Waktu Sholat</label>
            <select 
              className="form-control"
              value={prayerTime}
              onChange={(e) => setPrayerTime(e.target.value)}
            >
              <option value="Subuh">Subuh</option>
              <option value="Dzuhur">Dzuhur</option>
              <option value="Ashar">Ashar</option>
              <option value="Maghrib">Maghrib</option>
              <option value="Isya">Isya</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0, width: '130px' }}>
            <label className="form-label">Gender</label>
            <select 
              className="form-control"
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
            >
              <option value="">Semua</option>
              <option value="Putra">Putra</option>
              <option value="Putri">Putri</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0, width: '140px' }}>
            <label className="form-label">Kamar</label>
            <select 
              className="form-control"
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
            >
              <option value="">Semua Kamar</option>
              {rooms.map(room => (
                <option key={room} value={room}>{room}</option>
              ))}
            </select>
          </div>

          <button onClick={loadData} className="btn btn-secondary" style={{ height: '38px' }}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            <FileText size={18} color="var(--accent-primary)" />
            Pengisian Kehadiran Santri ({filteredSantriList.length} orang)
          </h3>
          
          <button 
            onClick={handleSave} 
            className="btn btn-primary" 
            disabled={saving || filteredSantriList.length === 0}
            style={{ padding: '8px 24px' }}
          >
            {saving ? 'Menyimpan...' : 'Simpan Absensi'}
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <RefreshCw size={32} className="pulse-icon" style={{ margin: '0 auto 10px auto' }} />
            <p>Memuat data santri dan status absensi...</p>
          </div>
        ) : filteredSantriList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <Info size={32} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
            <p>Tidak ada santri yang cocok dengan filter yang dipilih.</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Nama Santri</th>
                  <th>Kamar</th>
                  <th>Status Kehadiran</th>
                </tr>
              </thead>
              <tbody>
                {filteredSantriList.map((santri) => (
                  <tr key={santri.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{santri.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{santri.gender}</div>
                    </td>
                    <td>{santri.room}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {statusOptions.map((opt) => {
                          const isSelected = attendanceMap[santri.id] === opt.value;
                          
                          // Custom styles for active option selection
                          const btnStyle: React.CSSProperties = isSelected ? {
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '20px',
                            border: '1px solid transparent',
                            cursor: 'pointer'
                          } : {
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 500,
                            backgroundColor: '#f1f5f9',
                            color: '#64748b',
                            borderRadius: '20px',
                            border: '1px solid transparent',
                            cursor: 'pointer'
                          };

                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleStatusChange(santri.id, opt.value)}
                              className={isSelected ? opt.className : ''}
                              style={btnStyle}
                            >
                              {isSelected && <Check size={10} style={{ marginRight: '4px', display: 'inline' }} />}
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
