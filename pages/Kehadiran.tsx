
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Save, Filter, CheckCircle } from 'lucide-react';

const Kehadiran: React.FC = () => {
  const { students, classes, attendance, upsertAttendance } = useApp();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [showToast, setShowToast] = useState(false);

  const filteredStudents = selectedClassId 
    ? students.filter(s => String(s.classId) === String(selectedClassId))
    : [];

  const handleInputChange = (studentId: string, field: 'sick'|'permission'|'alpha', value: string) => {
      const numVal = parseInt(value) || 0;
      const current = attendance.find(a => String(a.studentId) === String(studentId)) || {
          id: `${studentId}-att`,
          studentId: studentId,
          sick: 0, permission: 0, alpha: 0
      };
      
      upsertAttendance({
          ...current,
          [field]: numVal
      });
  };

  return (
    <div className="pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h1 className="text-2xl font-bold text-slate-800">Kehadiran Siswa</h1>
        </div>

        {showToast && (
            <div className="fixed top-20 right-4 z-50 bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 duration-300">
                <CheckCircle size={24} className="text-green-200" />
                <div>
                    <h4 className="font-bold text-lg">Update Berhasil!</h4>
                    <p className="text-green-100 text-sm">Data kehadiran telah diperbarui.</p>
                </div>
            </div>
        )}

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
            <div className="max-w-md">
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Filter size={16} className="text-teal-600" /> Pilih Kelas
                </label>
                <select 
                    className="w-full p-2.5 border rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none shadow-sm" 
                    value={selectedClassId} 
                    onChange={e => setSelectedClassId(e.target.value)}
                >
                    <option value="">-- Pilih Kelas --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
        </div>

        {selectedClassId ? (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden animate-in fade-in duration-300">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="p-4 font-bold text-slate-600 uppercase tracking-wider">Nama Siswa</th>
                                <th className="p-4 font-bold text-slate-600 w-32 text-center uppercase tracking-wider">Sakit</th>
                                <th className="p-4 font-bold text-slate-600 w-32 text-center uppercase tracking-wider">Izin</th>
                                <th className="p-4 font-bold text-slate-600 w-32 text-center uppercase tracking-wider">Tanpa Ket.</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-700 divide-y divide-slate-100">
                            {filteredStudents.map(s => {
                                const att = attendance.find(a => String(a.studentId) === String(s.id)) || { sick: 0, permission: 0, alpha: 0 };
                                return (
                                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800">{s.name}</div>
                                            <div className="text-xs text-slate-400 font-mono">{s.nisn}</div>
                                        </td>
                                        <td className="p-2 text-center">
                                            <input 
                                                type="number" 
                                                min="0"
                                                className="w-20 p-2.5 border rounded-lg text-center bg-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm font-bold"
                                                value={att.sick}
                                                onChange={e => handleInputChange(s.id, 'sick', e.target.value)}
                                            />
                                        </td>
                                        <td className="p-2 text-center">
                                            <input 
                                                type="number" 
                                                min="0"
                                                className="w-20 p-2.5 border rounded-lg text-center bg-white focus:ring-2 focus:ring-orange-500 outline-none shadow-sm font-bold"
                                                value={att.permission}
                                                onChange={e => handleInputChange(s.id, 'permission', e.target.value)}
                                            />
                                        </td>
                                        <td className="p-2 text-center">
                                            <input 
                                                type="number" 
                                                min="0"
                                                className="w-20 p-2.5 border rounded-lg text-center bg-white focus:ring-2 focus:ring-red-500 outline-none shadow-sm font-bold"
                                                value={att.alpha}
                                                onChange={e => handleInputChange(s.id, 'alpha', e.target.value)}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredStudents.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-slate-400 italic">
                                        Tidak ada siswa di kelas ini.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className="p-4 bg-slate-50 border-t flex justify-end">
                    <p className="text-xs text-slate-500 flex items-center gap-2 italic">
                        <CheckCircle size={14} className="text-teal-500" /> Perubahan disimpan secara otomatis saat Anda mengubah angka.
                    </p>
                </div>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center p-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 text-slate-400">
                <p className="text-lg font-medium">Pilih kelas untuk mengelola kehadiran</p>
            </div>
        )}
    </div>
  );
};

export default Kehadiran;
