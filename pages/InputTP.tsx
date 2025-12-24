import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { LearningObjective, TPType } from '../types';
import { TP_CATEGORIES } from '../constants';
import { Trash2, Edit2, Plus, Filter, X, Save, ChevronDown, ChevronRight, BookOpen, AlertTriangle, Settings, Check, Download, Upload, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

const InputTP: React.FC = () => {
  const { tps, classes, settings, setSettings, addTp, updateTp, deleteTp, confirmAction } = useApp();
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  
  // -- STATES FOR TP MODAL --
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<LearningObjective>>({ category: TPType.QURAN });

  // -- STATES FOR CATEGORY MANAGEMENT --
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCatName, setEditingCatName] = useState<string | null>(null);
  const [tempCatName, setTempCatName] = useState('');

  // -- IMPORT/EXPORT REFS --
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use Dynamic Categories from Settings, Fallback to Constants
  const activeCategories = settings.assessmentCategories && settings.assessmentCategories.length > 0 
    ? settings.assessmentCategories 
    : TP_CATEGORIES;

  // State untuk mengontrol Accordion (key: nama kategori, value: boolean true/false)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const filteredTps = selectedClassId 
    ? tps.filter(t => String(t.classId) === String(selectedClassId))
    : [];

  // --- LOGIC TP MANAGEMENT ---

  const handleOpenModal = (tp?: LearningObjective) => {
    if (!selectedClassId) { alert("Pilih kelas terlebih dahulu!"); return; }
    
    if (tp) {
      setIsEditing(tp.id);
      setFormData({ ...tp });
    } else {
      setIsEditing(null);
      setFormData({ category: activeCategories[0] || TPType.QURAN, description: '', activity: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
      setIsModalOpen(false);
      setIsEditing(null);
      setFormData({ category: activeCategories[0] || TPType.QURAN, description: '', activity: '' });
  };

  const handleSave = () => {
    if (!selectedClassId) { alert("Pilih kelas terlebih dahulu!"); return; }
    if (!formData.description || !formData.activity) { alert("Deskripsi TP dan Aktivitas wajib diisi"); return; }
    if (!formData.category) { alert("Pilih Kategori terlebih dahulu"); return; }

    const dataToSave = { ...formData, classId: selectedClassId } as LearningObjective;

    if (isEditing) {
      updateTp({ ...dataToSave, id: isEditing });
    } else {
      addTp({ ...dataToSave, id: Date.now().toString() });
    }
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    const targetTp = tps.find(t => t.id === id);
    const tpName = targetTp ? targetTp.description.substring(0, 50) + "..." : "Item ini";
    const isConfirmed = await confirmAction(
        `Apakah Anda yakin ingin menghapus TP: "${tpName}"?\n\nPERINGATAN: Menghapus TP akan MENGHAPUS SEMUA NILAI SISWA yang sudah terhubung dengan TP ini.`,
        "Hapus Tujuan Pembelajaran",
        "Ya, Hapus TP",
        "danger"
    );
    if (isConfirmed) { deleteTp(String(id)); }
  };

  const toggleCategory = (category: string) => {
      setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  // --- LOGIC CATEGORY MANAGEMENT ---
  
  const handleAddCategory = async () => {
      if (!newCatName.trim()) return;
      if (activeCategories.includes(newCatName.trim())) { alert("Kategori sudah ada!"); return; }
      
      const updated = [...activeCategories, newCatName.trim()];
      await setSettings({ ...settings, assessmentCategories: updated });
      setNewCatName('');
  };

  const handleDeleteCategory = async (catName: string) => {
      const tpsUsingCat = tps.filter(t => t.category === catName);
      let warning = `Apakah Anda yakin ingin menghapus Kategori Aspek "${catName}"?`;
      
      if (tpsUsingCat.length > 0) {
          warning += `\n\nPERINGATAN: Ada ${tpsUsingCat.length} TP yang menggunakan kategori ini. TP tersebut TIDAK akan dihapus, tetapi mungkin tidak muncul di Rapor sampai Anda mengubah kategorinya manual.`;
      }

      const isConfirmed = await confirmAction(warning, "Hapus Kategori", "Ya, Hapus", "danger");
      
      if (isConfirmed) {
          const updated = activeCategories.filter(c => c !== catName);
          await setSettings({ ...settings, assessmentCategories: updated });
      }
  };

  const startEditCategory = (catName: string) => {
      setEditingCatName(catName);
      setTempCatName(catName);
  };

  const saveEditCategory = async () => {
      if (!tempCatName.trim() || !editingCatName) return;
      if (tempCatName !== editingCatName && activeCategories.includes(tempCatName.trim())) {
          alert("Nama kategori sudah digunakan!");
          return;
      }

      const isConfirmed = await confirmAction(
          `Anda akan mengubah nama kategori dari "${editingCatName}" menjadi "${tempCatName}".\n\nSistem akan otomatis memperbarui data TP yang terkait. Lanjutkan?`,
          "Ubah Nama Kategori",
          "Ya, Ubah",
          "primary"
      );

      if (isConfirmed) {
          // 1. Update List di Settings
          const updatedCats = activeCategories.map(c => c === editingCatName ? tempCatName : c);
          await setSettings({ ...settings, assessmentCategories: updatedCats });

          // 2. Update Semua TP yang pake nama lama (Migrasi Data)
          const relatedTps = tps.filter(t => t.category === editingCatName);
          for (const tp of relatedTps) {
              await updateTp({ ...tp, category: tempCatName });
          }
          
          setEditingCatName(null);
          setTempCatName('');
      }
  };

  // --- IMPORT / EXPORT LOGIC ---

  const handleDownloadTemplate = () => {
      // Sheet 1: Template Kosong
      const headers = ["Kategori", "Deskripsi TP", "Aktivitas / Metode"];
      const exampleRow = [activeCategories[0], "Contoh: Mampu menghafal Surah Al-Fatihah", "Melalui metode talaqqi"];
      
      const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
      
      // Sheet 2: Referensi Kategori (Agar user tidak salah ketik)
      const catHeaders = ["Daftar Kategori Valid (Copy dari sini)"];
      const catRows = activeCategories.map(c => [c]);
      const wsCats = XLSX.utils.aoa_to_sheet([catHeaders, ...catRows]);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template Input TP");
      XLSX.utils.book_append_sheet(wb, wsCats, "Referensi Kategori");

      XLSX.writeFile(wb, `Template_TP_PAUD.xlsx`);
  };

  const triggerImport = () => {
      if (!selectedClassId) { alert("Pilih kelas terlebih dahulu! TP yang diimport akan dimasukkan ke kelas yang sedang dipilih."); return; }
      fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const data = new Uint8Array(event.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array' });
              
              // Ambil Sheet Pertama
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              
              // Convert ke JSON
              const json = XLSX.utils.sheet_to_json(worksheet) as any[];

              if (json.length === 0) {
                  alert("File kosong atau format salah.");
                  return;
              }

              let successCount = 0;
              let failCount = 0;

              json.forEach((row) => {
                  const kategori = row["Kategori"];
                  const deskripsi = row["Deskripsi TP"];
                  const aktivitas = row["Aktivitas / Metode"];

                  // Validasi sederhana
                  if (kategori && deskripsi && aktivitas) {
                      // Cek apakah kategori valid (opsional: bisa di-add otomatis, tapi demi kerapian kita biarkan masuk apa adanya, user bisa edit nanti)
                      addTp({
                          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                          classId: selectedClassId,
                          category: String(kategori).trim(),
                          description: String(deskripsi).trim(),
                          activity: String(aktivitas).trim()
                      });
                      successCount++;
                  } else {
                      failCount++;
                  }
              });

              alert(`Proses Selesai.\nBerhasil import: ${successCount} TP\nGagal/Dilewati: ${failCount} baris (data tidak lengkap).`);
              
              // Reset input
              if (fileInputRef.current) fileInputRef.current.value = '';
          } catch (error) {
              console.error(error);
              alert("Gagal membaca file Excel. Pastikan format sesuai template.");
          }
      };
      reader.readAsArrayBuffer(file);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-3">
              <BookOpen className="text-teal-600" size={28} />
              <div>
                  <h1 className="text-2xl font-bold text-slate-800">Daftar Tujuan Pembelajaran (TP)</h1>
                  <p className="text-sm text-slate-500">Kelola target belajar dan aktivitas untuk penilaian rapor.</p>
              </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
                onClick={() => setIsCatModalOpen(true)}
                className="bg-slate-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 shadow-sm font-medium text-sm transition-colors"
                title="Atur Kategori Penilaian"
            >
                <Settings size={16} /> Kelola Kategori
            </button>
            <button 
                onClick={handleDownloadTemplate}
                className="bg-indigo-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 shadow-sm font-medium text-sm transition-colors"
                title="Download Template Excel"
            >
                <Download size={16} /> Template
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleImportFile} />
            <button 
                onClick={triggerImport}
                className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 shadow-sm font-medium text-sm transition-colors"
                title="Import TP dari Excel ke Kelas yang dipilih"
            >
                <Upload size={16} /> Import
            </button>
          </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-1/2">
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Filter size={18} /> Filter Berdasarkan Kelas
            </label>
            <select 
                className="w-full p-2.5 border rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                value={selectedClassId}
                onChange={e => { setSelectedClassId(e.target.value); }}
            >
                <option value="">-- Pilih Kelas untuk Mengelola TP --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          
          {selectedClassId && (
            <button 
                onClick={() => handleOpenModal()} 
                className="bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-700 shadow-sm font-medium text-sm transition-colors w-full md:w-auto justify-center"
            >
                <Plus size={18} /> Tambah TP Manual
            </button>
          )}
      </div>

      {selectedClassId ? (
        <div className="space-y-4">
            {activeCategories.map(category => {
                const categoryTps = filteredTps.filter(t => t.category === category);
                const isOpen = expandedCategories[category];
                
                return (
                    <div key={category} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-200">
                        {/* Header Accordion */}
                        <div 
                            onClick={() => toggleCategory(category)}
                            className={`p-4 font-bold text-slate-700 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors ${isOpen ? 'bg-slate-50 border-b border-slate-200' : 'bg-white'}`}
                        >
                            <div className="flex items-center gap-3">
                                {isOpen ? <ChevronDown size={20} className="text-teal-600"/> : <ChevronRight size={20} className="text-slate-400"/>}
                                <span className="text-base">{category}</span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full border font-bold ${categoryTps.length > 0 ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-slate-100 text-slate-500'}`}>
                                {categoryTps.length} TP
                            </span>
                        </div>

                        {/* Content Accordion */}
                        {isOpen && (
                            <div className="animate-in slide-in-from-top-2 duration-200">
                                {categoryTps.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="border-b bg-slate-50/50">
                                                <tr>
                                                    <th className="p-3 font-semibold text-slate-600 w-5/12">Deskripsi Tujuan Pembelajaran</th>
                                                    <th className="p-3 font-semibold text-slate-600 w-5/12">Aktivitas / Metode</th>
                                                    <th className="p-3 text-center font-semibold text-slate-600 w-2/12">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-slate-700">
                                                {categoryTps.map(tp => (
                                                    <tr key={tp.id} className="border-b last:border-0 hover:bg-slate-50 group transition-colors">
                                                        <td className="p-3 align-top font-medium text-slate-800 leading-relaxed">
                                                            {tp.description}
                                                        </td>
                                                        <td className="p-3 align-top text-slate-600 italic leading-relaxed bg-slate-50/30">
                                                            {tp.activity}
                                                        </td>
                                                        <td className="p-3 align-top">
                                                            <div className="flex justify-center gap-2">
                                                                <button 
                                                                    type="button" onClick={() => handleOpenModal(tp)} 
                                                                    className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all shadow-sm" title="Edit Data TP"
                                                                >
                                                                    <Edit2 size={16}/>
                                                                </button>
                                                                <button 
                                                                    type="button" onClick={() => handleDelete(tp.id)} 
                                                                    className="p-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all shadow-sm" title="Hapus Data TP"
                                                                >
                                                                    <Trash2 size={16}/>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-slate-400 italic text-sm border-t border-slate-100 bg-slate-50">
                                        <p className="mb-3">Belum ada TP untuk aspek ini.</p>
                                        <button 
                                            onClick={() => {
                                                setFormData({ category: category, description: '', activity: '' });
                                                setIsEditing(null);
                                                setIsModalOpen(true);
                                            }}
                                            className="bg-white border border-teal-200 text-teal-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-teal-50 shadow-sm"
                                        >
                                            + Tambah TP {category}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
      ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400 min-h-[300px]">
             <AlertTriangle size={48} className="mb-4 opacity-20"/>
             <h3 className="text-lg font-bold text-slate-600">Kelas Belum Dipilih</h3>
             <p className="text-sm">Silakan pilih kelas pada dropdown di atas untuk melihat dan mengelola Tujuan Pembelajaran.</p>
          </div>
      )}

      {/* MODAL FORM TAMBAH/EDIT TP */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${isEditing ? 'bg-blue-100 text-blue-600' : 'bg-teal-100 text-teal-600'}`}>
                      {isEditing ? <Edit2 size={20}/> : <Plus size={20}/>}
                  </div>
                  <div>
                      <h2 className="text-lg font-bold text-slate-800">{isEditing ? "Edit Tujuan Pembelajaran" : "Tambah TP Baru"}</h2>
                  </div>
              </div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"><X size={24}/></button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Read Only Class Info */}
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-800 flex items-center gap-2">
                  <BookOpen size={16}/>
                  <span><strong>Kelas:</strong> {classes.find(c => c.id === selectedClassId)?.name}</span>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Kategori Aspek Perkembangan</label>
                <div className="relative">
                    <select 
                        className="w-full p-3 border border-slate-300 rounded-xl text-slate-800 bg-white focus:ring-2 focus:ring-teal-500 outline-none appearance-none font-medium"
                        value={formData.category} 
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                        {activeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={16}/>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Deskripsi Tujuan Pembelajaran (TP)</label>
                <textarea 
                    className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none transition-shadow text-sm"
                    rows={3} 
                    placeholder="Contoh: Mampu melafalkan Surah Al-Fatihah dengan lancar..."
                    value={formData.description || ''} 
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Aktivitas / Metode Pembelajaran</label>
                <input 
                    className="w-full p-3 border border-slate-300 rounded-xl text-slate-800 bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-shadow text-sm"
                    placeholder="Contoh: Melalui metode talaqqi dan pengulangan..."
                    value={formData.activity || ''} 
                    onChange={e => setFormData({ ...formData, activity: e.target.value })}
                />
              </div>
            </div>

            <div className="p-5 border-t bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                <button onClick={handleCloseModal} className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-bold text-sm transition-colors">Batal</button>
                <button onClick={handleSave} className="bg-teal-600 text-white px-6 py-2.5 rounded-xl hover:bg-teal-700 font-bold text-sm shadow-md flex items-center gap-2 transform active:scale-95 transition-all">
                    <Save size={18} /> Simpan Data
                </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KELOLA KATEGORI */}
      {isCatModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-5 border-b">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Settings size={20}/> Kelola Kategori Aspek</h2>
                    <button onClick={() => setIsCatModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                </div>
                
                <div className="p-4 flex-1 overflow-y-auto space-y-3">
                    <p className="text-xs text-slate-500 bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                        Tambahkan kategori baru atau edit kategori yang ada. Perubahan nama kategori akan otomatis memperbarui data TP terkait.
                    </p>

                    <div className="space-y-2">
                        {activeCategories.map((cat, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg group hover:bg-white hover:shadow-sm transition-all">
                                {editingCatName === cat ? (
                                    <div className="flex gap-2 flex-1 mr-2">
                                        <input 
                                            className="flex-1 p-1 border rounded text-sm bg-white text-slate-800" 
                                            value={tempCatName} 
                                            onChange={e => setTempCatName(e.target.value)}
                                            autoFocus
                                        />
                                        <button onClick={saveEditCategory} className="text-green-600 bg-green-100 p-1 rounded"><Check size={16}/></button>
                                        <button onClick={() => setEditingCatName(null)} className="text-red-600 bg-red-100 p-1 rounded"><X size={16}/></button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="font-medium text-slate-700 text-sm">{cat}</span>
                                        <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => startEditCategory(cat)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded" title="Ubah Nama"><Edit2 size={14}/></button>
                                            <button onClick={() => handleDeleteCategory(cat)} className="p-1.5 text-red-600 hover:bg-red-100 rounded" title="Hapus"><Trash2 size={14}/></button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 mt-4 border-t">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tambah Kategori Baru</label>
                        <div className="flex gap-2">
                            <input 
                                className="flex-1 p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800"
                                placeholder="Nama Kategori (misal: Bahasa Inggris)"
                                value={newCatName}
                                onChange={e => setNewCatName(e.target.value)}
                            />
                            <button onClick={handleAddCategory} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-1">
                                <Plus size={16}/> Tambah
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default InputTP;