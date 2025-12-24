import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DEFAULT_LOGO_URL } from '../constants';
import { LogIn, Lock, User } from 'lucide-react';

const Login: React.FC = () => {
  const { login, settings } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Gunakan App Logo, fallback ke logo lama, fallback ke default
  const displayLogo = settings.appLogoUrl || settings.logoUrl || DEFAULT_LOGO_URL;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
        setError("Harap isi username dan password");
        return;
    }
    
    const success = login(username, password);
    if (!success) {
        setError("Username atau Password salah!");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
          
        {/* Login Form */}
        <div className="w-full p-8 md:p-10">
          <div className="text-center mb-8">
             {/* Container Logo Diperbesar dan Background Putih agar Logo Jelas */}
             <div className="w-24 h-24 bg-white rounded-full p-2 flex items-center justify-center mx-auto mb-4 border-4 border-indigo-50 shadow-xl">
                <img 
                    src={displayLogo} 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                />
             </div>
             <h1 className="text-2xl font-extrabold text-slate-800">Rapor Merdeka</h1>
             <p className="text-sm text-slate-500 font-medium mt-1">{settings.name || "PAUD KUSUMA"}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 text-center font-medium animate-pulse">
                    {error}
                </div>
            )}
            
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Username</label>
                <div className="relative">
                    <User className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-800 bg-white"
                        placeholder="Masukkan username"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-800 bg-white"
                        placeholder="Masukkan password"
                    />
                </div>
            </div>

            <button 
                type="submit" 
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 mt-4"
            >
                <LogIn size={20} />
                Masuk Aplikasi
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-slate-400">
             <p>Versi 1.0 &copy; 2025 {settings.name || "PAUD KUSUMA"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;