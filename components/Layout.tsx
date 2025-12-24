
import React, { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import { useApp } from '../context/AppContext';
import { Loader2, Menu } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isLoading } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Mobile Header */}
        <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between md:hidden z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
            <span className="font-bold text-slate-800 text-lg">Rapor Merdeka</span>
          </div>
          {isLoading && <Loader2 className="animate-spin text-teal-600" size={20} />}
        </header>

        {/* Main Scrollable Content */}
        <main className="flex-1 overflow-y-auto relative bg-gray-50">
          {isLoading && (
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-100 z-50">
                  <div className="h-full bg-blue-600 animate-pulse"></div>
              </div>
          )}
          
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>

          {/* Desktop Loading Indicator (Bottom Right) */}
          {isLoading && (
               <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-50 text-sm hidden md:flex">
                  <Loader2 className="animate-spin" size={16} /> Menyinkronkan data...
               </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Layout;
