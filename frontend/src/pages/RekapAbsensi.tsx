import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Download, 
  Printer, 
  RefreshCw, 
  Search,
  Filter,
  CheckCircle,
  HelpCircle,
  Clock,
  Award
} from 'lucide-react';
import { academicYearService, santriService, rekapService } from '../services/api';

export const RekapAbsensi: React.FC = () => {
  // Filters State
  const now = new Date();
  const [years, setYears] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | ''>('');
  const [selectedMonth, setSelectedMonth] = useState<number | ''>(now.getMonth() + 1);
  const [selectedYearValue, setSelectedYearValue] = useState<number | ''>(now.getFullYear()); // Numeric calendar year
  const [selectedSholat, setSelectedSholat] = useState('Subuh');
  const [selectedStatus, setSelectedStatus] = useState('Hadir');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedGender, setSelectedGender] = useState('Putri');
  const [searchQuery, setSearchQuery] = useState('');

  const [rooms, setRooms] = useState<string[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    total: 0, hadir: 0, sakit: 0, izin: 0, alfa: 0, masbuq: 0, haid: 0, istihadhoh: 0
  });

  const [loading, setLoading] = useState(false);

  const months = [
    { label: 'Januari', value: 1 },
    { label: 'Februari', value: 2 },
    { label: 'Maret', value: 3 },
    { label: 'April', value: 4 },
    { label: 'Mei', value: 5 },
    { label: 'Juni', value: 6 },
    { label: 'Juli', value: 7 },
    { label: 'Agustus', value: 8 },
    { label: 'September', value: 9 },
    { label: 'Oktober', value: 10 },
    { label: 'November', value: 11 },
    { label: 'Desember', value: 12 },
  ];

  const loadFilterOptions = async () => {
    try {
      const yr = await academicYearService.getAll();
      setYears(yr);
      const active = yr.find((y: any) => y.is_active);
      if (active) {
        setSelectedYear(active.id);
      }

      const r = await santriService.getRooms();
      setRooms(r);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const filters = {
        prayer_time: selectedSholat || undefined,
        status: selectedStatus || undefined,
        month: selectedMonth || undefined,
        year: selectedYearValue || undefined,
        room: selectedRoom || undefined,
        gender: selectedGender || undefined,
        academic_year_id: selectedYear || undefined
      };

      // 1. Get logs
      const records = await rekapService.getRekap(filters);
      setLogs(records);

      // 2. Get summaries
      const sum = await rekapService.getSummary(filters);
      setSummary(sum);

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
    if (years.length > 0) {
      loadData();
    }
  }, [
    years,
    selectedYear,
    selectedMonth,
    selectedYearValue,
    selectedSholat,
    selectedStatus,
    selectedRoom,
    selectedGender
  ]);

  const filteredLogs = logs.filter(log =>
    log.santri_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.santri_room.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert("Tidak ada data untuk di-export");
      return;
    }

    const headers = ["Tanggal", "Nama Santri", "Gender", "Kamar", "Sholat", "Status", "Metode", "Waktu Scan"];
    const csvRows = [headers.join(",")];

    filteredLogs.forEach(log => {
      const row = [
        log.date,
        `"${log.santri_name.replace(/"/g, '""')}"`,
        log.santri_gender,
        log.santri_room,
        log.prayer_time,
        log.status,
        log.method,
        log.scanned_at ? new Date(log.scanned_at).toLocaleTimeString('id-ID', { hour12: false }) : '-'
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rekap_absensi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculate stats
  const hadirPercentage = summary.total > 0 
    ? Math.round(((summary.hadir + summary.masbuq) / summary.total) * 100) 
    : 0;

  return (
    <div className="animate-slide printable-area">
      <div className="page-header no-print">
        <div className="page-title">
          <h1>Rekap Absensi</h1>
          <p>Laporan kehadiran santri secara menyeluruh disertai diagram persentase kehadiran.</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleExportCSV} className="btn btn-secondary">
            <Download size={16} />
            Export CSV
          </button>
          <button onClick={handlePrint} className="btn btn-primary">
            <Printer size={16} />
            Cetak Laporan
          </button>
        </div>
      </div>

      {/* Filters (No Print) */}
      <div className="card no-print" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          <div className="form-group" style={{ margin: 0, flex: '1 1 180px' }}>
            <label className="form-label">Cari Santri / Kamar</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-control" 
                style={{ paddingLeft: '32px' }}
                placeholder="Cari nama..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0, flex: '1 1 150px' }}>
            <label className="form-label">Tahun Ajaran</label>
            <select className="form-control" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Semua Tahun Ajaran</option>
              {years.map(y => (
                <option key={y.id} value={y.id}>{y.name} {y.is_active ? '(Aktif)' : ''}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0, flex: '1 1 120px' }}>
            <label className="form-label">Bulan</label>
            <select className="form-control" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Semua Bulan</option>
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0, flex: '1 1 100px' }}>
            <label className="form-label">Tahun Kalender</label>
            <input 
              type="number" 
              className="form-control" 
              placeholder="Contoh: 2026"
              value={selectedYearValue}
              onChange={(e) => setSelectedYearValue(e.target.value ? Number(e.target.value) : '')}
            />
          </div>

          <div className="form-group" style={{ margin: 0, flex: '1 1 120px' }}>
            <label className="form-label">Waktu Sholat</label>
            <select className="form-control" value={selectedSholat} onChange={(e) => setSelectedSholat(e.target.value)}>
              <option value="">Semua Sholat</option>
              <option value="Subuh">Subuh</option>
              <option value="Dzuhur">Dzuhur</option>
              <option value="Ashar">Ashar</option>
              <option value="Maghrib">Maghrib</option>
              <option value="Isya">Isya</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0, flex: '1 1 120px' }}>
            <label className="form-label">Status Kehadiran</label>
            <select className="form-control" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
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

          <div className="form-group" style={{ margin: 0, flex: '1 1 120px' }}>
            <label className="form-label">Kamar</label>
            <select className="form-control" value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}>
              <option value="">Semua Kamar</option>
              {rooms.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0, flex: '1 1 100px' }}>
            <label className="form-label">Gender</label>
            <select className="form-control" value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)}>
              <option value="">Semua</option>
              <option value="Putra">Putra</option>
              <option value="Putri">Putri</option>
            </select>
          </div>

          <button onClick={loadData} className="btn btn-secondary" style={{ height: '38px', alignSelf: 'flex-end' }}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-3" style={{ marginBottom: '24px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
          <div style={{ ...sumIconBgStyle, backgroundColor: '#e0e7ff' }}>
            <Award size={24} color="#4f46e5" />
          </div>
          <div>
            <h4 style={sumTitleStyle}>Persentase Kehadiran</h4>
            <p style={sumValueStyle}>{hadirPercentage}%</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Target Ideal: &gt;95%
            </p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
          <div style={{ ...sumIconBgStyle, backgroundColor: '#d1fae5' }}>
            <CheckCircle size={24} color="#10b981" />
          </div>
          <div>
            <h4 style={sumTitleStyle}>Kehadiran / Masbuq</h4>
            <p style={sumValueStyle}>{summary.hadir} / {summary.masbuq}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Total Data: {summary.total} catatan
            </p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
          <div style={{ ...sumIconBgStyle, backgroundColor: '#fee2e2' }}>
            <Clock size={24} color="#ef4444" />
          </div>
          <div>
            <h4 style={sumTitleStyle}>Ketidakhadiran (Alfa)</h4>
            <p style={sumValueStyle}>{summary.alfa} Absen</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Sakit: {summary.sakit} | Izin: {summary.izin}
            </p>
          </div>
        </div>
      </div>

      {/* Detail logs table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            <TrendingUp size={18} color="var(--accent-primary)" />
            Rincian Riwayat Absensi
          </h3>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <RefreshCw size={32} className="pulse-icon" style={{ margin: '0 auto 10px auto' }} />
            <p>Memuat rekapitulasi data...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <HelpCircle size={32} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
            <p>Tidak ada data absensi yang sesuai dengan filter.</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Nama Santri</th>
                  <th>Gender / Kamar</th>
                  <th>Sholat</th>
                  <th>Status</th>
                  <th>Metode</th>
                  <th>Waktu Tapping</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontWeight: 600 }}>
                      {new Date(log.date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.santri_name}</td>
                    <td>{log.santri_gender} • Kamar {log.santri_room}</td>
                    <td>{log.prayer_time}</td>
                    <td>
                      <span className={`badge badge-${log.status.toLowerCase()}`}>
                        {log.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px' }}>{log.method}</span>
                    </td>
                    <td>
                      {log.scanned_at ? (
                        new Date(log.scanned_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
            color: black !important;
            padding: 0 !important;
          }
          .main-content {
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin-bottom: 30px !important;
          }
          .table-container {
            border: none !important;
          }
          .table th {
            background-color: #f1f5f9 !important;
            color: black !important;
            border-bottom: 2px solid black !important;
          }
          .table td {
            border-bottom: 1px solid #e2e8f0 !important;
          }
        }
      `}</style>
    </div>
  );
};

const sumIconBgStyle: React.CSSProperties = {
  width: '48px',
  height: '48px',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0
};

const sumTitleStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--text-muted)',
  fontWeight: 500
};

const sumValueStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: 'var(--text-main)',
  marginTop: '2px'
};
