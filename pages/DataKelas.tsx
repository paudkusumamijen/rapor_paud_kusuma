import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ClassData } from '../types';
import { Trash2, Edit2, Plus, X, School } from 'lucide-react';

const DataKelas: React.FC = () => {
  const { classes, addClass, updateClass, deleteClass, confirmAction } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ClassData>>({});

  const handleOpenModal = (cls?: ClassData) => {
    if (cls) {
      setIsEditing(cls.id);
      setFormData(cls);
    } else {
      setIsEditing(null);
      setFormData({});
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(null);
    setFormData({});
  };

  const handleSave = () => {
    if (!formData.name || !formData.teacherName) return alert("Nama Kelas dan Wali Kelas wajib diisi");
    
    if (isEditing) {
      updateClass({ ...formData, id: isEditing } as ClassData);
    } else {
      addClass({ ...formData, id: Date.now().toString() } as ClassData);
    }
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    const className = classes.find(c => c.id === id)?.name || "ini";
    const isConfirmed = await confirmAction(`Apakah Anda yakin ingin menghapus Kelas "${className}" ini? \nSemua data siswa di dalam kelas ini mungkin akan kehilangan referensi kelasnya.`);
    
    if (isConfirmed) {
        deleteClass(String(id));
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Data Kelas</h1>
        <button 
            onClick={() => handleOpenModal()} 
            className="bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-700 shadow-sm font-medium text-sm"
        >
            <Plus size={18} /> Tambah Kelas
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-slate-600">No</th>
              <th className="p-4 font-semibold text-slate-600">Kelas/Kelompok</th>
              <th className="p-4 font-semibold text-slate-600">Wali Kelas</th>
              <th className="p-4 font-semibold text-slate-600">NUPTK/GTY</th>
              <th className="p-4 font-semibold text-slate-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {classes.map((cls, idx) => (
              <tr key={cls.id} className="border-b hover:bg-slate-50">
                <td className="p-4">{idx + 1}</td>
                <td className="p-4 font-medium text-slate-900">{cls.name}</td>
                <td className="p-4">{cls.teacherName}</td>
                <td className="p-4">{cls.nuptk}</td>
                <td className="p-4 flex gap-2">
                  <button 
                    type="button"
                    onClick={() => handleOpenModal(cls)} 
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit2 size={16}/>
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleDelete(cls.id)} 
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Hapus Kelas"
                  >
                    <Trash2 size={16}/>
                  </button>
                </td>
              </tr>
            ))}
            {classes.length === 0 && (
                <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400">
                        <School size={48} className="mx-auto mb-2 opacity-20"/>
                        <p>Belum ada data kelas.</p>
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-lg font-bold text-slate-800">{isEditing ? "Edit Data Kelas" : "Tambah Kelas Baru"}</h2>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Kelas / Kelompok</label>
                <input
                    className="w-full p-2.5 border rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                    placeholder="Contoh: Kelompok A1"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Wali Kelas</label>
                <input
                    className="w-full p-2.5 border rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                    placeholder="Nama Lengkap & Gelar"
                    value={formData.teacherName || ''}
                    onChange={e => setFormData({ ...formData, teacherName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">NUPTK / GTY (Opsional)</label>
                <input
                    className="w-full p-2.5 border rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                    placeholder="Nomor Induk"
                    value={formData.nuptk || ''}
                    onChange={e => setFormData({ ...formData, nuptk: e.target.value })}
                />
              </div>
            </div>

            <div className="p-5 border-t bg-slate-50 rounded-b-xl flex justify-end gap-2">
                <button onClick={handleCloseModal} className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-200 font-medium text-sm">Batal</button>
                <button onClick={handleSave} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 font-medium text-sm shadow-sm flex items-center gap-2">
                    <SaveIcon /> Simpan
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Icon
const SaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
);

export default DataKelas;