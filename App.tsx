
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DataKelas from './pages/DataKelas';
import DataSiswa from './pages/DataSiswa';
import InputTP from './pages/InputTP';
import InputNilai from './pages/InputNilai';
import DataP5 from './pages/DataP5';
import InputP5 from './pages/InputP5';
import Refleksi from './pages/Refleksi';
import Catatan from './pages/Catatan';
import Kehadiran from './pages/Kehadiran';
import Cetak from './pages/Cetak';
import RaporAnak from './pages/RaporAnak';
import Pengaturan from './pages/Pengaturan';
import Login from './pages/Login';
import ConfirmationModal from './components/ConfirmationModal';
import { DEFAULT_LOGO_URL } from './constants';

const AppContent: React.FC = () => {
  const { 
    user, 
    settings,
    isConfirmModalOpen, 
    confirmModalMessage, 
    confirmModalTitle, 
    confirmModalBtnText, 
    confirmModalVariant,
    handleConfirmModalConfirm, 
    handleConfirmModalCancel 
  } = useApp();

  // Efek untuk memperbarui Title dan Favicon secara dinamis
  useEffect(() => {
    if (settings) {
      // 1. Update Judul Halaman (Tab Browser)
      const schoolName = settings.name || "Rapor PAUD";
      document.title = schoolName;

      // 2. Update Favicon (Ikon Browser)
      const faviconUrl = settings.appLogoUrl || settings.logoUrl || DEFAULT_LOGO_URL;
      
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      
      link.href = faviconUrl;
    }
  }, [settings?.name, settings?.appLogoUrl, settings?.logoUrl]);

  // Protect Routes
  if (!user) {
      return <Login />;
  }

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={user.role === 'orangtua' ? <Navigate to="/rapor-anak" replace /> : <Dashboard />} />
          
          {/* Protected Routes for ADMIN ONLY */}
          {user.role === 'admin' && (
             <>
                <Route path="/kelas" element={<DataKelas />} />
                <Route path="/tp" element={<InputTP />} />
                <Route path="/data-p5" element={<DataP5 />} />
                <Route path="/pengaturan" element={<Pengaturan />} />
             </>
          )}

          {/* Shared Routes (Admin & Guru) */}
          {(user.role === 'admin' || user.role === 'guru') && (
            <Route path="/siswa" element={<DataSiswa />} />
          )}

          {/* Shared Routes (All Staff) */}
          {(user.role === 'admin' || user.role === 'guru') && (
            <>
              <Route path="/nilai" element={<InputNilai />} />
              <Route path="/nilai-p5" element={<InputP5 />} />
              <Route path="/refleksi" element={<Refleksi />} />
              <Route path="/catatan" element={<Catatan />} />
              <Route path="/kehadiran" element={<Kehadiran />} />
              <Route path="/cetak" element={<Cetak />} />
            </>
          )}

          {/* Parent Route */}
          <Route path="/rapor-anak" element={<RaporAnak />} />
          
          {/* Redirect unauthorized access to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        message={confirmModalMessage}
        title={confirmModalTitle}
        confirmText={confirmModalBtnText}
        variant={confirmModalVariant}
        onConfirm={handleConfirmModalConfirm}
        onCancel={handleConfirmModalCancel}
      />
    </>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <AppContent />
      </Router>
    </AppProvider>
  );
};

export default App;
