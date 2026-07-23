import React, { useState, useEffect, useRef } from 'react';
import { 
  Fingerprint, Activity, RefreshCw, CheckCircle2, AlertCircle, X, Shield, Terminal, Smartphone
} from 'lucide-react';

interface BridgeControlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BridgeStatusData {
  mode: 'verify' | 'register';
  status: 'online' | 'offline';
  sensor_sn: string;
  templates_count: number;
  logs: string[];
  active_enroll_santri_id?: number;
}

export const BridgeControlModal: React.FC<BridgeControlModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<BridgeStatusData>({
    mode: 'verify',
    status: 'offline',
    sensor_sn: '-',
    templates_count: 0,
    logs: []
  });
  const [loadingCmd, setLoadingCmd] = useState<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Fetch status periodically or listen to SSE
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/fingerprint/bridge-status');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Error fetching bridge status:', e);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);

    // Listen to SSE events for real-time log updates
    const sse = new EventSource('/api/attendance/stream');
    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'bridge_status_update') {
          setData(prev => ({
            ...prev,
            mode: payload.data.mode,
            status: payload.data.status,
            sensor_sn: payload.data.sensor_sn,
            templates_count: payload.data.templates_count,
            logs: payload.data.latest_log 
              ? [...prev.logs.filter(l => l !== payload.data.latest_log), payload.data.latest_log].slice(-40)
              : prev.logs
          }));
        }
      } catch (err) {}
    };

    return () => {
      clearInterval(interval);
      sse.close();
    };
  }, [isOpen]);

  // Auto-scroll terminal log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [data.logs]);

  const handleSendCommand = async (command: 'set_verify' | 'set_register' | 'sync_templates') => {
    setLoadingCmd(command);
    try {
      const res = await fetch('/api/fingerprint/bridge-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      if (res.ok) {
        await fetchStatus();
      }
    } catch (e) {
      console.error('Error sending bridge command:', e);
    } finally {
      setLoadingCmd(null);
    }
  };

  if (!isOpen) return null;

  const isOnline = data.status === 'online';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-md">
              <Fingerprint className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Pengendali & Status Sensor ZKFinger</h3>
              <p className="text-xs text-indigo-100 opacity-90">Koneksi Bridge Windows & Realtime Dashboard</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Status Indicators Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Status Connection */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status Sensor</div>
              <div className="flex items-center space-x-2">
                <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className={`font-bold text-base ${isOnline ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 truncate">
                SN: <span className="font-mono text-slate-600 font-medium">{data.sensor_sn}</span>
              </div>
            </div>

            {/* Active Mode */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Mode Aktif Saat Ini</div>
              <div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                  data.mode === 'register' 
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}>
                  {data.mode === 'register' ? '📝 MODE DAFTAR' : '✅ MODE ABSENSI'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                {data.mode === 'register' ? 'Menanti tempelan 3x sampel jari' : 'Siap scan kehadiran harian'}
              </div>
            </div>

            {/* Template Count */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Sidik Jari Terdaftar</div>
              <div className="text-xl font-extrabold text-slate-800">
                {data.templates_count} <span className="text-xs font-normal text-slate-500">template</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                Tersimpan di memori cache local
              </div>
            </div>

          </div>

          {/* Action Remote Control Buttons */}
          <div>
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              <span>Pilihan Mode & Kontrol Bridge</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              <button
                onClick={() => handleSendCommand('set_verify')}
                disabled={loadingCmd !== null}
                className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-sm ${
                  data.mode === 'verify'
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-600/30'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {loadingCmd === 'set_verify' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>MODE ABSENSI</span>
              </button>

              <button
                onClick={() => handleSendCommand('set_register')}
                disabled={loadingCmd !== null}
                className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-sm ${
                  data.mode === 'register'
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-600/30'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {loadingCmd === 'set_register' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Fingerprint className="w-4 h-4" />
                )}
                <span>MODE DAFTAR</span>
              </button>

              <button
                onClick={() => handleSendCommand('sync_templates')}
                disabled={loadingCmd !== null}
                className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-bold text-sm bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-all shadow-sm"
              >
                {loadingCmd === 'sync_templates' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>SYNC TEMPLATE</span>
              </button>

            </div>
          </div>

          {/* Terminal Realtime Log Console */}
          <div>
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-slate-600" />
                <span>Log Aktivitas Realtime</span>
              </div>
              <span className="text-[11px] font-normal text-slate-400">Auto-sync 2 detik</span>
            </div>

            <div 
              ref={logContainerRef}
              className="bg-slate-900 text-slate-200 font-mono text-xs p-4 rounded-xl h-48 overflow-y-auto shadow-inner space-y-1"
            >
              {data.logs.length === 0 ? (
                <div className="text-slate-500 italic text-center py-12">Belum ada log aktivitas dari ZKFinger Bridge...</div>
              ) : (
                data.logs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed hover:bg-slate-800/60 px-1 rounded transition-colors">
                    <span className="text-emerald-400 select-none">&gt; </span>
                    <span>{log}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>ZKFinger SDK v10 • Mode Sentuh Web Aktif</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-sm transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
