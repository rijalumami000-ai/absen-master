import React from 'react';
import { 
  Activity, 
  Database, 
  FileText, 
  MessageSquare, 
  TrendingUp, 
  Settings as SettingsIcon 
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'scan', label: 'Absensi Scan', icon: Activity },
    { id: 'data', label: 'Pusat Data', icon: Database },
    { id: 'manual', label: 'Absensi Manual', icon: FileText },
    { id: 'laporan', label: 'Kirim Laporan WA', icon: MessageSquare },
    { id: 'rekap', label: 'Rekap Absensi', icon: TrendingUp },
    { id: 'settings', label: 'Pengaturan', icon: SettingsIcon },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          <Activity size={24} />
        </div>
        <div className="brand-info">
          <h2>ABSENSI SHOLAT</h2>
          <p>PP. Al-Hamid</p>
        </div>
      </div>
      
      <nav style={{ flex: 1 }}>
        <ul className="sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
                  style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        <p>© 2026 PP. Al-Hamid</p>
        <p style={{ marginTop: '2px', fontSize: '9px' }}>v1.0 - Sidik Jari</p>
      </div>
    </aside>
  );
};
