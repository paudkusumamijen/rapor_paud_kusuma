
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { SchoolSettings } from '../types';
import { SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY } from '../constants';
import { resetSupabaseClient, sheetService } from '../services/sheetService';
import { Save, Database, RefreshCw, Upload, Image as ImageIcon, Trash2, Lock, Flame, CheckCircle2, Sparkles, Key, AlertCircle, Cpu, ShieldCheck, Edit, Loader2, Download, RefreshCcw, FileUp, Smartphone, Printer, ShieldAlert, UserCheck, Calendar, Wifi, WifiOff, Eye, EyeOff, Edit3, CheckCircle, Tag } from 'lucide-react';

const Pengaturan: React.FC = () => {
  const { settings, setSettings, refreshData, isLoading, isOnline, handleBackup, handleRestore, handleResetSystem, confirmAction, cleanupOrphanData } = useApp();
  const [formData, setFormData] = useState<SchoolSettings>(settings);
  
  const [sbUrl, setSbUrl] = useState('');
  const [sbKey, setSbKey] = useState('');
  const [connStatus, setConnStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isUploadingAppLogo, setIsUploadingAppLogo] = useState(false);
  const [isUploadingReportLogo, setIsUploadingReportLogo] = useState(false);
  
  const [showDbConfig, setShowDbConfig] = useState(false);
  
  const [isEditingAi, setIsEditingAi] = useState(false);
  const [isEditingDb, setIsEditingDb] = useState(false);
  
  const appLogoInputRef = useRef<HTMLInputElement>(null);
  const reportLogoInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const isHardcodedSb = !!SUPABASE_URL && !!SUPABASE_KEY;
  const isDbConfigured = isHardcodedSb || (!!sbUrl && !!sbKey);
  const isAiConfigured = true;

  useEffect(() => { setFormData(settings); }, [settings]);
  
  useEffect(() => {
    if (isHardcodedSb) {
        setSbUrl(SUPABASE_URL); setSbKey(SUPABASE_KEY);
    } else {
        setSbUrl(localStorage.getItem('supabase_url') || '');
        setSbKey(localStorage.getItem('supabase_key') || '');
    }
  }, [isHardcodedSb]);

  const handleChange = (field: keyof SchoolSettings, value: any) => { setFormData(prev => ({ ...prev, [field]: value })); };

  const handleGenericLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, targetField: 'appLogoUrl' | 'reportLogoUrl') => {
    const file = e.target.files?.[0];
    const isApp = targetField === 'appLogoUrl';
    const setUploading = isApp ? setIsUploadingAppLogo : setIsUploadingReportLogo;
    if (file) {
      if (file.size > 2 * 1024 * 1024) { alert("Ukuran file maksimal 2MB"); return; }
      setUploading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
             const img = new Image(); img.src = event.target.result as string;
             img.onload = async () => {
                 const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
                 const maxSize = 300; let width = img.width; let height = img.height;
                 if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } } 
                 else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
                 canvas.width = width; canvas.height = height; ctx?.drawImage(img, 0, 0, width, height);
                 const base64Url = canvas.toDataURL('image/jpeg', 0.8);
                 if (isOnline) {
                     canvas.toBlob(async (blob) => {
                         if (blob) {
                             const prefix = isApp ? 'app_logo' : 'report_logo';
                             const publicUrl = await sheetService.uploadImage(blob, 'school', `${prefix}_${Date.now()}.jpg`);
                             setFormData(prev => ({ ...prev, [targetField]: publicUrl || base64Url }));
                             setUploading(false);
                         }
                     }, 'image/jpeg', 0.8);
                 } else { setFormData(prev => ({ ...prev, [targetField]: base64Url })); setUploading(false); }
             };
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if (file) handleRestore(file);
      if (backupInputRef.current) backupInputRef.current.value = '';
  };

  const onResetClick = async () => {
      const isConfirmed = await confirmAction("PERINGATAN BAHAYA!\n\nAnda akan menghapus SELURUH DATA untuk memulai Tahun Ajaran Baru. Lanjutkan?");
      if (isConfirmed) {
           const keepTPs = window.confirm("Tetap simpan Data TP?");
           handleResetSystem(keepTPs);
      }
  };

  const handleSaveSettings = async () => {
    const legacyLogo = formData.reportLogoUrl || formData.appLogoUrl || formData.logoUrl;
    await setSettings({ ...formData, logoUrl: legacyLogo });
    setIsEditingAi(false);
    alert("Pengaturan disimpan!");
  };

  const handleSaveDbConfig = async () => {
      if (isHardcodedSb) return;
      localStorage.setItem('supabase_url', sbUrl); localStorage.setItem('supabase_key', sbKey);
      resetSupabaseClient(); 
      setIsEditingDb(false);
      alert("Konfigurasi Database disimpan!"); 
      await testConnection();
  };

  const testConnection = async () => {
      setConnStatus('idle');
      try { await refreshData(); setConnStatus('success'); alert("Koneksi Berhasil!"); } 
      catch (e) { setConnStatus('error'); alert("Gagal terhubung!"); }
  };

  return (
    <div className="pb-12">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Pengaturan Aplikasi</h1>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Database size={20} className="text-indigo-600"/> Identitas Sekolah</h2>
                <div className="space-y-4">
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Nama Satuan PAUD</label><input className="w-full p-2 border rounded bg-white text-slate-800" value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} /></div>
                    <div className="flex gap-4">
                        <div className="w-1/2"><label className="block text-sm font-medium text-slate-700 mb-1">NPSN</label><input className="w-full p-2 border rounded bg-white text-slate-800" value={formData.npsn || ''} onChange={e => handleChange('npsn', e.target.value)} /></div>
                        <div className="w-1/2"><label className="block text-sm font-medium text-slate-700 mb-1">Kode Pos</label><input className="w-full p-2 border rounded bg-white text-slate-800" value={formData.postalCode || ''} onChange={e => handleChange('postalCode', e.target.value)} /></div>
                    </div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Alamat Lengkap</label><textarea className="w-full p-2 border rounded bg-white text-slate-800" rows={2} value={formData.address || ''} onChange={e => handleChange('address', e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Kelurahan</label><input className="w-full p-2 border rounded bg-white text-slate-800" value={formData.village || ''} onChange={e => handleChange('village', e.target.value)} /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Kecamatan</label><input className="w-full p-2 border rounded bg-white text-slate-800" value={formData.district || ''} onChange={e => handleChange('district', e.target.value)} /></div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><UserCheck size={20} className="text-teal-600"/> Penandatangan Rapor</h2>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Kepala Sekolah</label>
                            <input className="w-full p-2 border rounded bg-white text-slate-800" placeholder="Lengkap dengan gelar" value={formData.headmaster || ''} onChange={e => handleChange('headmaster', e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tempat Penerbitan</label>
                            <input className="w-full p-2 border rounded bg-white text-slate-800" placeholder="Contoh: Jakarta" value={formData.reportPlace || ''} onChange={e => handleChange('reportPlace', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1"><Calendar size={14}/> Tanggal Rapor</label>
                            <input type="date" className="w-full p-2 border rounded bg-white text-slate-800" value={formData.reportDate || ''} onChange={e => handleChange('reportDate', e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Semester Aktif</label>
                            <select className="w-full p-2 border rounded bg-white text-slate-800" value={formData.semester || ''} onChange={e => handleChange('semester', e.target.value)}>
                                <option value="1 (Ganjil)">1 (Ganjil)</option>
                                <option value="2 (Genap)">2 (Genap)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Pelajaran</label>
                            <input className="w-full p-2 border rounded bg-white text-slate-800" placeholder="Contoh: 2024/2025" value={formData.academicYear || ''} onChange={e => handleChange('academicYear', e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

            <button onClick={handleSaveSettings} className="w-full bg-teal-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-teal-700 transition-all transform active:scale-95">
                Simpan Seluruh Konfigurasi
            </button>
        </div>

        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><ImageIcon size={20} className="text-pink-600"/> Pengaturan Logo</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col items-center p-4 border rounded-xl bg-slate-50">
                        <span className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Smartphone size={14}/> Logo App</span>
                        <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-white overflow-hidden relative mb-3">
                            {isUploadingAppLogo && <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10"><Loader2 className="animate-spin text-white" /></div>}
                            {(formData.appLogoUrl || formData.logoUrl) ? <img src={formData.appLogoUrl || formData.logoUrl} className="w-full h-full object-contain" /> : <span className="text-xs text-slate-400">No Logo</span>}
                        </div>
                        <input type="file" ref={appLogoInputRef} className="hidden" accept="image/*" onChange={(e) => handleGenericLogoUpload(e, 'appLogoUrl')} />
                        <button onClick={() => appLogoInputRef.current?.click()} className="px-3 py-1.5 bg-white border rounded text-xs">Upload</button>
                    </div>
                    <div className="flex flex-col items-center p-4 border rounded-xl bg-slate-50">
                        <span className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Printer size={14}/> Logo Rapor</span>
                        <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-white overflow-hidden relative mb-3">
                            {isUploadingReportLogo && <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10"><Loader2 className="animate-spin text-white" /></div>}
                            {(formData.reportLogoUrl || formData.logoUrl) ? <img src={formData.reportLogoUrl || formData.logoUrl} className="w-full h-full object-contain" /> : <span className="text-xs text-slate-400">No Logo</span>}
                        </div>
                        <input type="file" ref={reportLogoInputRef} className="hidden" accept="image/*" onChange={(e) => handleGenericLogoUpload(e, 'reportLogoUrl')} />
                        <button onClick={() => reportLogoInputRef.current?.click()} className="px-3 py-1.5 bg-white border rounded text-xs">Upload</button>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Sparkles size={20} className="text-purple-500"/> Konfigurasi Layanan Penulisan</h2>
                {(isAiConfigured && !isEditingAi) ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4 animate-in fade-in duration-300 relative group">
                        <div className="p-2 bg-white rounded-full border border-emerald-100 shadow-sm">
                            <div className="bg-emerald-500 p-2 rounded-full text-white"><ShieldCheck size={20} /></div>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-emerald-800 text-lg">Layanan Siap Digunakan</h3>
                            <p className="text-emerald-700 text-sm font-semibold uppercase tracking-wider">Tipe Server: {formData.aiProvider === 'groq' ? 'SERVER B (GROQ)' : 'SERVER A (GEMINI)'}</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex gap-2">
                            <button onClick={() => setFormData(prev => ({...prev, aiProvider: 'groq'}))} className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all ${formData.aiProvider === 'groq' ? 'bg-orange-600 text-white shadow-md' : 'bg-white text-slate-600'}`}>Groq (Server B)</button>
                            <button onClick={() => setFormData(prev => ({...prev, aiProvider: 'gemini'}))} className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all ${formData.aiProvider === 'gemini' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600'}`}>Server A</button>
                        </div>
                        <div className="flex gap-2"><button onClick={handleSaveSettings} className="w-full bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-slate-900">Simpan Konfigurasi</button></div>
                    </div>
                )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Flame size={20} className="text-orange-500"/> Koneksi Database</h2>
                {(isDbConfigured && !isEditingDb) ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4 animate-in fade-in duration-300 relative group">
                        <div className="p-2 bg-white rounded-full border border-emerald-100 shadow-sm">
                            <div className="bg-emerald-500 p-2 rounded-full text-white"><CheckCircle size={20} /></div>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-emerald-800 text-lg">Database Terhubung</h3>
                            <p className="text-emerald-700 text-sm font-semibold uppercase tracking-wider">Status: Online</p>
                        </div>
                        <button onClick={() => setIsEditingDb(true)} className="p-2 text-slate-400 hover:text-orange-600 transition-colors"><Edit3 size={20} /></button>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="relative"><input className="w-full p-2.5 border rounded-lg bg-slate-50 text-xs font-mono focus:bg-white outline-none focus:ring-2 focus:ring-orange-500" placeholder="URL Database" value={sbUrl} onChange={e => setSbUrl(e.target.value)} type={showDbConfig ? "text" : "password"} /><button onClick={() => setShowDbConfig(!showDbConfig)} className="absolute right-3 top-2.5 text-slate-300 hover:text-slate-500">{showDbConfig ? <EyeOff size={14}/> : <Eye size={14}/>}</button></div>
                        <div className="relative"><input className="w-full p-2.5 border rounded-lg bg-slate-50 text-xs font-mono focus:bg-white outline-none focus:ring-2 focus:ring-orange-500" placeholder="Anon Key" value={sbKey} onChange={e => setSbKey(e.target.value)} type={showDbConfig ? "text" : "password"} /><button onClick={() => setShowDbConfig(!showDbConfig)} className="absolute right-3 top-2.5 text-slate-300 hover:text-slate-500">{showDbConfig ? <EyeOff size={14}/> : <Eye size={14}/>}</button></div>
                        <div className="flex gap-2"><button onClick={handleSaveDbConfig} className="bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex-1 shadow-md hover:bg-slate-900">Hubungkan</button><button onClick={testConnection} className="bg-white border-2 border-slate-200 px-4 py-2.5 rounded-lg text-slate-600 font-bold hover:bg-slate-50"><RefreshCw size={18}/></button></div>
                    </div>
                )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4"><ShieldAlert size={20} className="text-orange-500"/> Pemeliharaan</h2>
                <button onClick={cleanupOrphanData} className="w-full bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg text-sm font-bold hover:bg-orange-100 flex items-center justify-center gap-2 transition-all"><RefreshCw size={18} className={isLoading ? 'animate-spin' : ''}/>Bersihkan Data Yatim</button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4"><RefreshCcw size={20} className="text-blue-500"/> Manajemen Data</h2>
                <div className="flex flex-col gap-3">
                    <div className="flex gap-2"><button onClick={handleBackup} className="flex-1 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold border border-slate-200 shadow-sm flex items-center justify-center gap-2 hover:bg-slate-200"><Download size={16}/> Backup</button><input type="file" ref={backupInputRef} className="hidden" accept=".json" onChange={handleRestoreFile} /><button onClick={() => backupInputRef.current?.click()} className="flex-1 bg-white border text-slate-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center justify-center gap-2 hover:bg-slate-50"><FileUp size={16}/> Restore</button></div>
                    <button onClick={onResetClick} className="w-full bg-rose-50 border border-rose-200 text-rose-600 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-rose-100 flex items-center justify-center gap-2"><Trash2 size={16}/> Reset Seluruh Sistem</button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Pengaturan;
