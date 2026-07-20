import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ScanAbsensi } from './pages/ScanAbsensi';
import { PusatData } from './pages/PusatData';
import { AbsensiManual } from './pages/AbsensiManual';
import { KirimLaporan } from './pages/KirimLaporan';
import { RekapAbsensi } from './pages/RekapAbsensi';
import { Pengaturan } from './pages/Pengaturan';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('scan');

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
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
