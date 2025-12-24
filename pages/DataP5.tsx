
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { P5Criteria } from '../types';
import { Plus, Edit2, Trash2, Save, Filter, Archive, X, Star, Settings, Tag, Check, Trash } from 'lucide-react';

const DataP5: React.FC = () => {
  const { p5Criteria, addP5Criteria, updateP5Criteria, deleteP5Criteria, classes, confirmAction, settings, setSettings } = useApp();
  
  const [selectedClassId, setSelectedClassId] = useState('');
  
  // Dynamic P5 Labels
  const p5Labels = settings.p5Labels || ["MB", "BSH", "SB"];

  // MODAL STATE for Criteria
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<P5Criteria>>({});
  
  // MODAL STATE for Label Management
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [editingLabels, setEditingLabels] = useState<string[]>([...p5Labels]);

  // Filter Criteria by Selected Class
  const filteredCriteria = selectedClassId ? p5Criteria.filter(c => String(c.classId) === String(selectedClassId)) : [];

  const handleOpenModal = (crit?: P5Criteria) => {
    if (!selectedClassId) { alert("Pilih kelas terlebih dahulu untuk menambahkan data."); return; }
    
    if (crit) {
        setIsEditing(crit.id);
        // Ensure levelDescriptions exists
        const levelDescriptions = crit.levelDescriptions || {};
        // Migration: If old fields exist but no levelDescriptions, populate them
        if (Object.keys(levelDescriptions).length === 0) {
            if (crit.descBerkembang) levelDescriptions[1] = crit.descBerkembang;
            if (crit.descCakap) levelDescriptions[2] = crit.descCakap;
            if (crit.descMahir) levelDescriptions[3] = crit.descMahir;
        }
        setFormData({ ...crit, levelDescriptions });
    } else {
        setIsEditing(null);
        setFormData({ 
            classId: selectedClassId,
            levelDescriptions: {}
        });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(null);
    setFormData({});
  };

  const handleSave = () => {
    if (!formData.subDimension) { alert("Nama Sub Dimensi wajib diisi"); return; }
    
    const dataToSave = {
        ...formData,
        classId: selectedClassId,
        levelDescriptions: formData.levelDescriptions || {}
    };
    
    if (isEditing) { updateP5Criteria({ ...dataToSave, id: isEditing } as P5Criteria); } 
    else { addP5Criteria({ ...dataToSave, id: Date.now().toString() } as P5Criteria); }
    
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    const subDimensionName = p5Criteria.find(c => c.id === id)?.subDimension || "Sub Dimensi ini";
    const isConfirmed = await confirmAction(`Apakah Anda yakin ingin menghapus "${subDimensionName}"?`);
    if (isConfirmed) { deleteP5Criteria(String(id)); }
  };

  // Label Management Logic
  const handleSaveLabels = async () => {
      if (editingLabels.some(l => !l.trim())) {
          alert("Label tidak boleh kosong.");
          return;
      }
      await setSettings({ ...settings, p5Labels: editingLabels });
      setIsLabelModalOpen(false);
      alert("Label penilaian Kokurikuler berhasil diperbarui.");
  };

  const addLabel = () => {
      setEditingLabels([...editingLabels, "Label Baru"]);
  };

  const removeLabel = (index: number) => {
      if (editingLabels.length <= 1) {
          alert("Minimal harus ada satu label penilaian.");
          return;
      }
      const updated = editingLabels.filter((_, i) => i !== index);
      setEditingLabels(updated);
  };

  const updateLabelText = (index: number, text: string) => {
      const updated = [...editingLabels];
      updated[index] = text;
      setEditingLabels(updated);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
             <Star className="text-orange-500" size={28} />
             <div>
                <h1 className="text-2xl font-bold text-slate-800">Data Kokurikuler</h1>
                <p className="text-sm text-slate-500">Kelola indikator penilaian P5/Kokurikuler.</p>
             </div>
        </div>
        <button 
            onClick={() => { setEditingLabels([...p5Labels]); setIsLabelModalOpen(true); }}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-900 shadow-sm font-medium text-sm transition-all"
        >
            <Tag size={18}/> Kelola Label Nilai
        </button>
      </div>

      <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                     <div className="w-full md:w-1/2">
                         <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                             <Filter size={16} /> Pilih Kelas
                         </label>
                         <select 
                            className="w-full p-2.5 border rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                            value={selectedClassId}
                            onChange={e => { setSelectedClassId(e.target.value); }}
                         >
                             <option value="">-- Pilih Kelas untuk Mengelola Data --</option>
                             {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </select>
                     </div>
                     {selectedClassId && (
                         <button 
                            onClick={() => handleOpenModal()}
                            className="bg-teal-600 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-teal-700 shadow-sm font-medium text-sm transition-all"
                         >
                             <Plus size={18}/> Tambah Sub Dimensi
                         </button>
                     )}
                </div>
            </div>

            {selectedClassId ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="p-4 text-slate-600 w-1/3">Sub Dimensi / Elemen</th>
                                <th className="p-4 text-slate-600">Deskripsi Capaian Default</th>
                                <th className="p-4 text-slate-600 w-24 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-700">
                            {filteredCriteria.map(c => {
                                const levelDescs = c.levelDescriptions || {};
                                return (
                                    <tr key={c.id} className="border-b hover:bg-slate-50 last:border-0 transition-colors">
                                        <td className="p-4 font-bold text-slate-800 align-top">{c.subDimension}</td>
                                        <td className="p-4 text-xs text-slate-500 align-top">
                                          <div className="space-y-2">
                                            {p5Labels.map((label, idx) => {
                                                const levelIdx = idx + 1;
                                                const desc = levelDescs[levelIdx] || (levelIdx === 1 ? c.descBerkembang : levelIdx === 2 ? c.descCakap : levelIdx === 3 ? c.descMahir : "");
                                                return desc ? (
                                                    <div key={idx} className="flex gap-2">
                                                        <span className="font-black text-slate-400 min-w-[40px]">{label}:</span>
                                                        <span className="flex-1">{desc}</span>
                                                    </div>
                                                ) : null;
                                            })}
                                          </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex justify-center gap-2">
                                                <button type="button" onClick={() => handleOpenModal(c)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"><Edit2 size={16}/></button>
                                                <button type="button" onClick={() => handleDelete(c.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredCriteria.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="p-16 text-center text-slate-400">
                                        <div className="flex flex-col items-center">
                                            <Archive size={48} className="mb-4 opacity-10"/>
                                            <p className="text-lg font-medium">Belum ada data sub dimensi</p>
                                            <p className="text-sm">Klik tombol "Tambah" untuk membuat indikator baru.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 text-slate-400">
                     <Filter size={64} className="mb-4 opacity-10"/>
                     <p className="text-xl font-bold">Pilih Kelas Terlebih Dahulu</p>
                     <p>Pilih kelas dari dropdown di atas untuk mengelola data Kokurikuler.</p>
                </div>
            )}
      </div>

      {/* MODAL FORM CRITERIA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center p-6 border-b">
                 <h2 className="text-xl font-bold text-slate-800">{isEditing ? "Edit Sub Dimensi" : "Tambah Sub Dimensi"}</h2>
                 <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"><X size={24}/></button>
             </div>
             <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                 <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-700 font-medium">
                    Kelas: {classes.find(c => c.id === selectedClassId)?.name}
                 </div>

                 <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1.5">Nama Sub Dimensi / Elemen</label>
                     <input 
                        className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none shadow-sm transition-all" 
                        placeholder="Contoh: Kemandirian, Akhlak Beragama..." 
                        value={formData.subDimension || ''} 
                        onChange={e => setFormData({...formData, subDimension: e.target.value})} 
                     />
                 </div>

                 <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-1">Deskripsi per Tingkat Capaian</p>
                    {p5Labels.map((label, idx) => {
                        const levelIdx = idx + 1;
                        return (
                            <div key={idx}>
                                <label className="block text-xs font-bold text-slate-600 mb-1">
                                    Label: <span className="text-teal-600">{label}</span>
                                </label>
                                <textarea 
                                    className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none shadow-sm transition-all" 
                                    rows={2} 
                                    placeholder={`Deskripsi untuk capaian ${label}...`}
                                    value={formData.levelDescriptions?.[levelIdx] || ""} 
                                    onChange={e => {
                                        const updated = { ...(formData.levelDescriptions || {}) };
                                        updated[levelIdx] = e.target.value;
                                        setFormData({ ...formData, levelDescriptions: updated });
                                    }} 
                                />
                            </div>
                        );
                    })}
                 </div>
             </div>
             <div className="p-6 border-t bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                 <button onClick={handleCloseModal} className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 font-bold text-sm transition-all">Batal</button>
                 <button onClick={handleSave} className="bg-teal-600 text-white px-6 py-2.5 rounded-xl hover:bg-teal-700 font-bold text-sm shadow-md flex items-center gap-2 transform active:scale-95 transition-all">
                    <Save size={18}/> Simpan Data
                 </button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL LABEL MANAGEMENT */}
      {isLabelModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Tag size={24} className="text-teal-600"/> Kelola Label Nilai</h2>
                    <button onClick={() => setIsLabelModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-xs text-slate-500 italic">Urutan label di bawah akan menentukan tingkat pencapaian (1, 2, 3, dst). Anda bisa menambahkan label baru (misal: BB, MB, BSH, BSB).</p>
                    
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                        {editingLabels.map((label, idx) => (
                            <div key={idx} className="flex gap-2 animate-in slide-in-from-left-2 duration-200">
                                <div className="bg-slate-100 w-10 flex items-center justify-center font-bold text-slate-400 rounded-lg border">{idx + 1}</div>
                                <input 
                                    className="flex-1 p-2.5 border rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none font-bold"
                                    value={label}
                                    onChange={e => updateLabelText(idx, e.target.value)}
                                />
                                <button 
                                    onClick={() => removeLabel(idx)}
                                    className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Hapus Label"
                                >
                                    <Trash size={18}/>
                                </button>
                            </div>
                        ))}
                    </div>

                    <button 
                        onClick={addLabel}
                        className="w-full py-2.5 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={18}/> Tambah Level Baru
                    </button>
                </div>
                <div className="p-6 border-t bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                    <button onClick={() => setIsLabelModalOpen(false)} className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 font-bold text-sm">Batal</button>
                    <button onClick={handleSaveLabels} className="bg-slate-800 text-white px-6 py-2.5 rounded-xl hover:bg-slate-900 font-bold text-sm shadow-md flex items-center gap-2 transition-all">
                        <Check size={18}/> Simpan Perubahan
                    </button>
                </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default DataP5;
