
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { DEFAULT_LOGO_URL } from '../constants';
import { 
  LayoutDashboard, Users, GraduationCap, BookOpen, PenTool, Printer, Settings, 
  Star, FileText, CalendarCheck, X, ChevronDown, ChevronRight, Database, ClipboardList, LogOut
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

type MenuItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  to?: string;
  children?: MenuItem[];
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { settings, user, logout, confirmAction } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  // Gunakan App Logo, fallback ke logo lama, fallback ke default
  const displayLogo = settings.appLogoUrl || settings.logoUrl || DEFAULT_LOGO_URL;

  const handleLogout = async () => {
    const isConfirmed = await confirmAction(
        "Apakah Anda yakin ingin keluar dari aplikasi?",
        "Konfirmasi Keluar",
        "Ya, Keluar Aplikasi",
        "logout"
    );

    if (isConfirmed) {
        logout();
        navigate('/');
    }
  };

  const menuStructure: MenuItem[] = [
    { 
      key: 'dashboard', 
      to: "/", 
      icon: <LayoutDashboard size={20} />, 
      label: "Dashboard" 
    },
    {
      key: 'master',
      label: "Data Master",
      icon: <Database size={20} />,
      children: [
        { key: 'kelas', to: "/kelas", icon: <Users size={18} />, label: "Data Kelas" },
        { key: 'siswa', to: "/siswa", icon: <GraduationCap size={18} />, label: "Data Siswa" },
        { key: 'tp', to: "/tp", icon: <BookOpen size={18} />, label: "IntraKurikuler" },
        { key: 'data_p5', to: "/data-p5", icon: <Star size={18} />, label: "Kokurikuler" },
      ]
    },
    {
      key: 'nilai',
      label: "Input Nilai",
      icon: <ClipboardList size={20} />,
      children: [
        { key: 'input_nilai', to: "/nilai", icon: <PenTool size={18} />, label: "IntraKurikuler" },
        { key: 'nilai_p5', to: "/nilai-p5", icon: <Star size={18} />, label: "Kokurikuler" },
        { key: 'catatan', to: "/catatan", icon: <FileText size={18} />, label: "Catatan Anak" },
        { key: 'kehadiran', to: "/kehadiran", icon: <CalendarCheck size={18} />, label: "Kehadiran" },
      ]
    },
    { 
      key: 'cetak', 
      to: "/cetak", 
      icon: <Printer size={20} />, 
      label: "Cetak Rapor" 
    },
    { 
      key: 'pengaturan', 
      to: "/pengaturan", 
      icon: <Settings size={20} />, 
      label: "Pengaturan" 
    },
  ];

  // FILTER MENU BASED ON ROLE
  const filteredMenu = menuStructure
    .filter(item => {
      if (!user) return false;
      if (user.role === 'admin') return true; 
      
      // Guru Restrictions
      if (user.role === 'guru') {
          // Guru has access to dashboard, master (filtered below), nilai, and cetak
          const allowedKeys = ['dashboard', 'master', 'nilai', 'cetak'];
          return allowedKeys.includes(item.key);
      }

      // Orang Tua Restrictions
      if (user.role === 'orangtua') {
        return false; 
      }
      return false;
    })
    .map(item => {
      // Specifically filter master data for Guru role
      if (user?.role === 'guru' && item.key === 'master' && item.children) {
        return {
          ...item,
          children: item.children.filter(child => child.key === 'siswa')
        };
      }
      return item;
    });

  // Custom Menu for Orang Tua
  const parentMenu: MenuItem[] = [
      { key: 'rapor_anak', to: "/rapor-anak", icon: <BookOpen size={20} />, label: "Lihat Rapor Ananda" }
  ];

  const finalMenu = user?.role === 'orangtua' ? parentMenu : filteredMenu;

  // Auto expand menu
  useEffect(() => {
    const newOpenState = { ...openMenus };
    let hasChange = false;

    finalMenu.forEach(item => {
      if (item.children) {
        const isChildActive = item.children.some(child => child.to === location.pathname);
        if (isChildActive && !newOpenState[item.key]) {
          newOpenState[item.key] = true;
          hasChange = true;
        }
      }
    });

    if (hasChange) setOpenMenus(newOpenState);
  }, [location.pathname, user?.role]);

  const toggleMenu = (key: string) => {
    setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <aside 
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out shadow-2xl
          md:translate-x-0 md:static md:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header Sidebar */}
          <div className="p-6 border-b border-slate-700 flex flex-col items-center text-center relative">
             <button 
              onClick={onClose}
              className="md:hidden absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="w-16 h-16 bg-white rounded-full p-1 mb-3 flex items-center justify-center overflow-hidden border-4 border-slate-600 shadow-lg">
                <img 
                    src={displayLogo} 
                    alt="Logo Sekolah" 
                    className="w-full h-full object-contain"
                />
            </div>
            
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">
                Rapor PAUD
              </h1>
              <p className="text-xs font-semibold text-teal-400 mt-1 uppercase tracking-wider">
                {user?.role === 'admin' ? 'Administrator' : user?.role === 'guru' ? 'Guru Kelas' : 'Orang Tua'}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
            {finalMenu.map((item) => (
              <div key={item.key} className="mb-1">
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleMenu(item.key)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors duration-200 text-slate-300 hover:bg-slate-800 hover:text-white ${openMenus[item.key] ? 'bg-slate-800 text-white' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span className="font-medium text-sm">{item.label}</span>
                      </div>
                      {openMenus[item.key] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    
                    {openMenus[item.key] && (
                      <div className="ml-4 pl-4 border-l border-slate-700 mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
                        {item.children.map(child => (
                          <NavLink
                            key={child.key}
                            to={child.to!}
                            onClick={onClose}
                            className={({ isActive }) =>
                              `flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm ${
                                isActive
                                  ? "bg-teal-600 text-white shadow-md"
                                  : "text-slate-400 hover:text-white hover:bg-slate-800"
                              }`
                            }
                          >
                            {child.icon}
                            <span>{child.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <NavLink
                    to={item.to!}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-teal-600 text-white shadow-lg"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`
                    }
                  >
                    {item.icon}
                    <span className="font-medium text-sm">{item.label}</span>
                  </NavLink>
                )}
              </div>
            ))}
          </nav>

          {/* Footer Sidebar (Logout) */}
          <div className="p-4 border-t border-slate-700 bg-slate-900">
             <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors text-sm font-bold shadow-md"
             >
                 <LogOut size={16} /> Keluar Aplikasi
             </button>
            <p className="text-[10px] text-slate-500 tracking-widest mt-3 text-center">Versi Aplikasi 1.0 &copy; 2025</p>
            <p className="text-xs font-semibold text-teal-400 mt-0 uppercase tracking-wider text-center">{settings.name || "TPA AL-HIDAYAH"}</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
