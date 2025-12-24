
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Save } from 'lucide-react';

const Catatan: React.FC = () => {
  const { students, classes, notes, upsertNote } = useApp();
  
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [noteContent, setNoteContent] = useState('');

  const filteredStudents = selectedClassId 
    ? students.filter(s => String(s.classId) === String(selectedClassId))
    : [];

  useEffect(() => {
    if (selectedStudentId) {
        const existing = notes.find(n => String(n.studentId) === String(selectedStudentId));
        setNoteContent(existing ? existing.note : '');
    } else {
        setNoteContent('');
    }
  }, [selectedStudentId, notes]);

  const handleSave = () => {
    if (!selectedStudentId) return;
    upsertNote({
        id: Date.now().toString(), // ID doesn't matter much for upsert
        studentId: selectedStudentId,
        note: noteContent
    });
    alert("Catatan tersimpan!");
  };

  return (
    <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Catatan Perkembangan Anak</h1>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Filter Kelas</label>
                    <select className="w-full p-2 border rounded-lg bg-white text-slate-800" value={selectedClassId} onChange={e => { setSelectedClassId(e.target.value); setSelectedStudentId(''); }}>
                        <option value="">-- Pilih Kelas --</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Siswa</label>
                    <select 
                        className="w-full p-2 border rounded-lg bg-white text-slate-800 disabled:bg-slate-100" 
                        value={selectedStudentId} 
                        onChange={e => setSelectedStudentId(e.target.value)}
                        disabled={!selectedClassId}
                    >
                        <option value="">-- Pilih Siswa --</option>
                        {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            </div>
        </div>

        {selectedStudentId ? (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <label className="block text-lg font-bold text-slate-800 mb-2">Isi Perkembangan Siswa</label>
                <textarea 
                    className="w-full p-4 border rounded-xl text-slate-800 bg-white leading-relaxed focus:ring-2 focus:ring-indigo-200 outline-none"
                    rows={8}
                    placeholder="Tuliskan catatan perkembangan anak di sini..."
                    value={noteContent}
                    onChange={e => setNoteContent(e.target.value)}
                />
                <div className="mt-4 flex justify-end">
                    <button onClick={handleSave} className="bg-teal-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-700">
                        <Save size={18}/> Simpan Catatan
                    </button>
                </div>
            </div>
        ) : (
             <div className="text-center p-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-400">Silakan pilih siswa untuk mengisi catatan.</p>
             </div>
        )}
    </div>
  );
};

export default Catatan;
