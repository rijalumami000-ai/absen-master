import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { BridgeControlModal } from './components/BridgeControlModal';
import { ScanAbsensi } from './pages/ScanAbsensi';
import { PusatData } from './pages/PusatData';
import { AbsensiManual } from './pages/AbsensiManual';
import { KirimLaporan } from './pages/KirimLaporan';
import { RekapAbsensi } from './pages/RekapAbsensi';
import { Pengaturan } from './pages/Pengaturan';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('scan');
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState<boolean>(false);

  const renderContent = () => {
    switch (activeTab) {
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
      default:
        return <ScanAbsensi />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
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

export default App;
