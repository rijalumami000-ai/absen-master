import React, { useState, useEffect } from 'react';
import { 
  Database, 
  FileText, 
  MessageSquare, 
  TrendingUp, 
  Settings as SettingsIcon,
  Fingerprint,
  ChevronLeft,
  ChevronRight,
  Clock,
  ChevronDown,
  ChevronUp,
  Building,
  BookOpen,
  GraduationCap,
  Award
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenBridgeModal?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: {
    type: 'live' | 'wa';
    text: string;
  };
}

interface MenuGroup {
  name: string;
  icon: React.ElementType;
  isDummy?: boolean;
  items: MenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onOpenBridgeModal }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [bridgeStatus, setBridgeStatus] = useState<'online' | 'offline'>('offline');
  const [bridgeMode, setBridgeMode] = useState<'verify' | 'register'>('verify');
  
  // Track open/closed state of accordions. Pesantren is open by default.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'Pesantren': true,
    'Madrasah Diniyah': false,
    'Madrasah Tsanawiyah': false,
    'Madrasah Aliyah': false
  });

  // Live Timer & Bridge status checker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const checkBridgeStatus = async () => {
      try {
        const res = await fetch('/api/fingerprint/bridge-status');
        if (res.ok) {
          const json = await res.json();
          setBridgeStatus(json.status);
          setBridgeMode(json.mode);
        }
      } catch (e) {}
    };

    checkBridgeStatus();
    const bridgeTimer = setInterval(checkBridgeStatus, 3000);

    return () => {
      clearInterval(timer);
      clearInterval(bridgeTimer);
    };
  }, []);

  // Menu structure
  const menuGroups: MenuGroup[] = [
    {
      name: 'Pesantren',
      icon: Building,
      items: [
        { 
          id: 'scan', 
          label: 'Absensi Scan', 
          icon: Fingerprint,
          badge: { type: 'live', text: 'Live' }
        },
        { 
          id: 'manual', 
          label: 'Absensi Manual', 
          icon: FileText 
        },
        { 
          id: 'data', 
          label: 'Pusat Data', 
          icon: Database 
        },
        { 
          id: 'rekap', 
          label: 'Rekap Absensi', 
          icon: TrendingUp 
        },
        { 
          id: 'laporan', 
          label: 'Kirim Laporan WA', 
          icon: MessageSquare,
          badge: { type: 'wa', text: 'WA' }
        },
        { 
          id: 'settings', 
          label: 'Pengaturan', 
          icon: SettingsIcon 
        },
      ]
    },
    {
      name: 'Madrasah Diniyah',
      icon: BookOpen,
      isDummy: true,
      items: []
    },
    {
      name: 'Madrasah Tsanawiyah',
      icon: GraduationCap,
      isDummy: true,
      items: []
    },
    {
      name: 'Madrasah Aliyah',
      icon: Award,
      isDummy: true,
      items: []
    }
  ];

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Format date string in Indonesian
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="brand-logo" title="PP. Al-Hamid Absensi">
            <Fingerprint size={24} />
          </div>
          <div className="brand-info">
            <h2>ABSENSI SHOLAT</h2>
            <p>PP. Al-Hamid</p>
          </div>
        </div>

        <button 
          className="sidebar-toggle-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Perluas Sidebar' : 'Sembunyikan Sidebar'}
          aria-label="Toggle Sidebar"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="sidebar-nav">
        <div className="sidebar-group">
          <div className="sidebar-group-title">Instansi & Program</div>
          
          <ul className="sidebar-menu" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {menuGroups.map((group) => {
              const GroupIcon = group.icon;
              const isOpen = openGroups[group.name];
              
              return (
                <li key={group.name} style={{ display: 'flex', flexDirection: 'column' }}>
                  {/* Group Header Button */}
                  <button
                    className={`parent-menu-item ${isOpen ? 'open' : ''}`}
                    onClick={() => toggleGroup(group.name)}
                    title={isCollapsed ? group.name : undefined}
                  >
                    <span className="menu-item-icon">
                      <GroupIcon size={19} />
                    </span>
                    <span className="menu-item-text" style={{ fontWeight: 600 }}>
                      {group.name}
                    </span>
                    {isOpen ? <ChevronUp size={14} className="chevron-icon" /> : <ChevronDown size={14} className="chevron-icon" />}
                  </button>

                  {/* Group Submenu Items */}
                  {isOpen && (
                    <ul className="submenu-list">
                      {group.isDummy ? (
                        <li className="submenu-placeholder">
                          📌 Belum diaktifkan
                        </li>
                      ) : (
                        group.items.map((item) => {
                          const ItemIcon = item.icon;
                          const isActive = activeTab === item.id;
                          
                          return (
                            <li key={item.id}>
                              <button
                                onClick={() => setActiveTab(item.id)}
                                className={`submenu-item ${isActive ? 'active' : ''}`}
                                title={isCollapsed ? item.label : undefined}
                              >
                                <span className="menu-item-icon">
                                  <ItemIcon size={16} />
                                </span>
                                <span className="menu-item-text">
                                  {item.label}
                                </span>
                                {item.badge && (
                                  <span className={`menu-badge badge-${item.badge.type}`} style={{ fontSize: '8px', padding: '1px 5px' }}>
                                    {item.badge.type === 'live' && <span className="pulse-dot" />}
                                    {item.badge.text}
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Sidebar Live Status & Clock Widget */}
      <div className="sidebar-widget">
        <div className="widget-clock">
          <Clock size={16} className="widget-clock-icon" />
          <div className="widget-clock-details">
            <span className="widget-clock-time">{formatTime(currentTime)}</span>
            <span className="widget-clock-date">{formatDate(currentTime)}</span>
          </div>
        </div>

        <div 
          className="widget-status" 
          onClick={onOpenBridgeModal}
          style={{ cursor: 'pointer' }}
          title="Klik untuk membuka Pengendali & Status Sensor ZKFinger"
        >
          <span 
            className="status-indicator-dot" 
            style={{ 
              backgroundColor: bridgeStatus === 'online' ? '#10B981' : '#EF4444',
              boxShadow: bridgeStatus === 'online' ? '0 0 8px #10B981' : 'none'
            }} 
          />
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
            <span style={{ fontWeight: 600, fontSize: '11px' }}>
              {bridgeStatus === 'online' ? (bridgeMode === 'register' ? '📝 Mode Daftar' : '✅ Sensor Ready') : '❌ Sensor Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <p>© 2026 PP. Al-Hamid</p>
        <p style={{ marginTop: '2px', fontSize: '9px', opacity: 0.7 }}>v1.0 • Sidik Jari</p>
      </div>
    </aside>
  );
};
