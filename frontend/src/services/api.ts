import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '');

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const academicYearService = {
  getAll: () => api.get('/api/academic-years').then(r => r.data),
  create: (name: string) => api.post('/api/academic-years', { name }).then(r => r.data),
  activate: (id: number) => api.put(`/api/academic-years/${id}/activate`).then(r => r.data),
  delete: (id: number) => api.delete(`/api/academic-years/${id}`).then(r => r.data),
};

export const santriService = {
  getAll: (filters?: { gender?: string; room?: string; academic_year_id?: number }) => 
    api.get('/api/santri', { params: filters }).then(r => r.data),
  create: (data: { name: string; gender: string; room: string; parent_phone: string; academic_year_id?: number; mother_name?: string; photo_url?: string }) => 
    api.post('/api/santri', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/api/santri/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/api/santri/${id}`).then(r => r.data),
  getRooms: () => api.get('/api/santri/rooms').then(r => r.data),
  syncSekolahInfo: () => api.post('/api/santri/sync-sekolah-info').then(r => r.data),
  uploadPhoto: (id: number, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/api/santri/${id}/upload-photo`, fd, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }).then(r => r.data);
  }
};

export const fingerprintService = {
  getTemplates: () => api.get('/api/fingerprint/templates').then(r => r.data),
  startEnroll: (santriId: number) => api.post('/api/fingerprint/start-enroll', { santri_id: santriId }).then(r => r.data),
  cancelEnroll: () => api.post('/api/fingerprint/cancel-enroll').then(r => r.data),
  getEnrollStatus: () => api.get('/api/fingerprint/enroll-status').then(r => r.data),
};

export const attendanceService = {
  getToday: (prayerTime?: string) => api.get('/api/attendance/today', { params: { prayer_time: prayerTime } }).then(r => r.data),
  saveManual: (data: { prayer_time: string; date?: string; items: Array<{ santri_id: number; status: string }> }) => 
    api.post('/api/attendance/manual', data).then(r => r.data),
  getStreamUrl: () => `${API_BASE}/api/attendance/stream`,
};

export const rekapService = {
  getRekap: (filters: {
    date?: string;
    prayer_time?: string;
    status?: string;
    month?: number;
    year?: number;
    room?: string;
    gender?: string;
    academic_year_id?: number;
  }) => api.get('/api/rekap', { params: filters }).then(r => r.data),
  
  getSummary: (filters: {
    date?: string;
    prayer_time?: string;
    month?: number;
    year?: number;
    room?: string;
    gender?: string;
    academic_year_id?: number;
  }) => api.get('/api/rekap/summary', { params: filters }).then(r => r.data),
};

export const waService = {
  getTemplate: () => api.get('/api/wa/template').then(r => r.data),
  updateTemplate: (template: string) => api.put('/api/wa/template', { template }).then(r => r.data),
  getPlaceholders: () => api.get('/api/wa/placeholders').then(r => r.data),
  preview: (data: { santri_id: number; prayer_time: string; date?: string }) => 
    api.post('/api/wa/preview', data).then(r => r.data),
  send: (data: { santri_ids: number[]; prayer_time: string; date?: string }) => 
    api.post('/api/wa/send', data).then(r => r.data),
};

export const settingsService = {
  getAll: () => api.get('/api/settings').then(r => r.data),
  update: (key: string, value: string) => api.put(`/api/settings/${key}`, { value }).then(r => r.data),
  verifyPassword: (password: string) => api.post('/api/settings/verify-password', { password }).then(r => r.data),
  getFingerprintLogs: () => api.get('/api/settings/fingerprint-logs').then(r => r.data),
};

export default api;
