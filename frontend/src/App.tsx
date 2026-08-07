import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { BridgeControlModal } from './components/BridgeControlModal';
import { ScanAbsensi } from './pages/ScanAbsensi';
import { AbsensiWajah } from './pages/AbsensiWajah';
import { PusatData } from './pages/PusatData';
import { AbsensiManual } from './pages/AbsensiManual';
import { KirimLaporan } from './pages/KirimLaporan';
import { RekapAbsensi } from './pages/RekapAbsensi';
import { Pengaturan } from './pages/Pengaturan';
import { Login } from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';

const AppContent: React.FC = () => {
  // Default to Absensi Wajah ('scan-wajah') when site opens
  const [activeTab, setActiveTab] = useState<string>('scan-wajah');
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState<boolean>(false);
  const { isLoggedIn, logout } = useAuth();

  // Pre-entry Authentication Gate: MUST login before entering website!
  if (!isLoggedIn) {
    return <Login onSuccess={() => setActiveTab('scan-wajah')} />;
  }

  const handleTabChange = (tab: string) => {
    if (tab === 'logout') {
      logout();
      return;
    }
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'scan-wajah':
        return <AbsensiWajah />;
      case 'scan':
        return <ScanAbsensi />;
      case 'data':
        return <PusatData />;
      case 'manual':
        return <AbsensiManual />;
      case 'laporan':
        return <KirimLaporan />;
      case 'rekap':
        return <RekapAbsensi />;
      case 'settings':
        return <Pengaturan />;
      case 'login':
        return <Login onSuccess={() => setActiveTab('scan-wajah')} />;
      default:
        return <AbsensiWajah />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange} 
        onOpenBridgeModal={() => setIsBridgeModalOpen(true)}
      />
      <main className="main-content">
        {renderContent()}
      </main>

      {/* Global ZKFinger Bridge Remote Controller Modal */}
      <BridgeControlModal 
        isOpen={isBridgeModalOpen} 
        onClose={() => setIsBridgeModalOpen(false)} 
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
