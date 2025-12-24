import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Trash2, Save, Filter, MessageCircle, CheckCircle2 } from 'lucide-react';

const Refleksi: React.FC = () => {
  const { 
    user, students, classes, 
    reflectionQuestions, reflectionAnswers, 
    addReflectionQuestion, deleteReflectionQuestion, upsertReflectionAnswer, 
    confirmAction 
  } = useApp();
  
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [parentAnswers, setParentAnswers] = useState<Record<string, string>>({});

  const filteredStudents = selectedClassId 
    ? students.filter(s => String(s.classId) === String(selectedClassId))
    : [];

  const classQuestions = reflectionQuestions.filter(q => String(q.classId) === String(selectedClassId));

  const handleAddQuestion = () => {
    if (!selectedClassId) { alert("Pilih kelas dulu!"); return; }
    if (!newQuestion) { alert("Tuliskan pertanyaan!"); return; }
    
    addReflectionQuestion({
        id: Date.now().toString(),
        classId: selectedClassId,
        question: newQuestion,
        active: true
    });
    setNewQuestion('');
  };

  const handleDeleteQuestion = async (id: string) => {
    const isConfirmed = await confirmAction("Hapus pertanyaan ini? Jawaban orang tua yang sudah ada mungkin akan ikut terhapus.");
    if (isConfirmed) {
        deleteReflectionQuestion(id);
    }
  };

  const handleAnswerChange = (qId: string, val: string) => {
      setParentAnswers(prev => ({ ...prev, [qId]: val }));
  };

  const handleParentSave = () => {
      if (!selectedStudentId) { alert("Pilih nama anak Anda terlebih dahulu."); return; }
      
      Object.entries(parentAnswers).forEach(([qId, ans]) => {
          const answerText = String(ans);
          if (answerText && answerText.trim()) {
            upsertReflectionAnswer({
                id: `${selectedStudentId}-${qId}`,
                questionId: qId,
                studentId: selectedStudentId,
                answer: answerText
            });
          }
      });
      alert("Jawaban refleksi berhasil disimpan! Terima kasih Bunda/Ayah.");
  };

  const handleStudentSelect = (studentId: string) => {
      setSelectedStudentId(studentId);
      const existing = reflectionAnswers.filter(a => String(a.studentId) === String(studentId));
      const map: Record<string, string> = {};
      existing.forEach(a => {
          map[a.questionId] = a.answer;
      });
      setParentAnswers(map);
  };

  // --- TAMPILAN ORANG TUA ---
  if (user?.role === 'orangtua') {
    return (
        <div className="max-w-2xl mx-auto">
             <div className="bg-indigo-600 text-white p-6 rounded-t-xl shadow-lg mb-6">
                 <h2 className="text-2xl font-bold flex items-center gap-2"><MessageCircle size={28}/> Refleksi Orang Tua</h2>
                 <p className="text-indigo-100 mt-2">Mohon kesediaan Ayah/Bunda untuk menjawab beberapa pertanyaan terkait perkembangan Ananda.</p>
             </div>

             <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">1. Identitas Anak</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Kelas Ananda</label>
                            <select className="w-full p-3 border rounded-lg bg-white text-slate-800" value={selectedClassId} onChange={e => { setSelectedClassId(e.target.value); setSelectedStudentId(''); }}>
                                <option value="">-- Pilih Kelas --</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Ananda</label>
                            <select className="w-full p-3 border rounded-lg bg-white text-slate-800 disabled:bg-slate-100" value={selectedStudentId} onChange={e => handleStudentSelect(e.target.value)} disabled={!selectedClassId}>
                                <option value="">-- Cari Nama Anak --</option>
                                {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {selectedStudentId && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4 duration-500">
                        <h3 className="font-bold text-slate-800 mb-6 border-b pb-2">2. Pertanyaan Refleksi</h3>
                        
                        {classQuestions.length > 0 ? (
                            <div className="space-y-6">
                                {classQuestions.map((q, idx) => (
                                    <div key={q.id}>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            {idx + 1}. {q.question}
                                        </label>
                                        <textarea 
                                            className="w-full p-3 border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                                            rows={3}
                                            placeholder="Tuliskan jawaban Ayah/Bunda disini..."
                                            value={parentAnswers[q.id] || ''}
                                            onChange={e => handleAnswerChange(q.id, e.target.value)}
                                        />
                                    </div>
                                ))}
                                
                                <div className="pt-4 flex justify-end">
                                    <button onClick={handleParentSave} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg flex items-center gap-2 transform active:scale-95 transition-all">
                                        <Save size={20}/> Simpan Jawaban
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center p-8 bg-slate-50 rounded-lg text-slate-500">
                                <CheckCircle2 size={40} className="mx-auto mb-2 text-green-500"/>
                                <p>Belum ada pertanyaan refleksi dari Guru untuk kelas ini.</p>
                            </div>
                        )}
                    </div>
                )}
             </div>
        </div>
    );
  }

  // --- TAMPILAN GURU / ADMIN ---
  return (
    <div>
        <div className="flex justify-between items-center mb-6">
           <h1 className="text-2xl font-bold text-slate-800">Manajemen Refleksi Orang Tua</h1>
        </div>
        
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                 <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Filter size={20}/> Pilih Kelas</h2>
                 <select className="w-full md:w-1/2 p-2.5 border rounded-lg bg-white text-slate-800" value={selectedClassId} onChange={e => { setSelectedClassId(e.target.value); setSelectedStudentId(''); }}>
                    <option value="">-- Pilih Kelas --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {selectedClassId && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Daftar Pertanyaan Refleksi ({classes.find(c => c.id === selectedClassId)?.name})</h2>
                    
                    <div className="flex gap-2 mb-6">
                        <input 
                            className="flex-1 p-3 border rounded-lg bg-slate-50 text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                            placeholder="Tuliskan pertanyaan baru untuk orang tua di kelas ini..."
                            value={newQuestion}
                            onChange={e => setNewQuestion(e.target.value)}
                        />
                        <button onClick={handleAddQuestion} className="bg-teal-600 text-white px-6 rounded-lg font-bold hover:bg-teal-700 flex items-center gap-2"><Plus size={18}/> Tambah</button>
                    </div>

                    <div className="space-y-3">
                        {classQuestions.length > 0 ? classQuestions.map((q, idx) => (
                            <div key={q.id} className="p-4 border rounded-xl flex justify-between items-center hover:bg-slate-50 transition-colors">
                                <div className="flex gap-3">
                                    <span className="font-bold text-slate-400">{idx + 1}.</span>
                                    <span className="font-medium text-slate-800">{q.question}</span>
                                </div>
                                <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"><Trash2 size={18}/></button>
                            </div>
                        )) : (
                            <div className="text-center p-8 text-slate-400 bg-slate-50 border border-dashed rounded-lg">Belum ada pertanyaan untuk kelas ini.</div>
                        )}
                    </div>

                    <div className="mt-8 pt-8 border-t">
                        <h3 className="text-md font-bold text-slate-700 mb-4">Lihat Jawaban Orang Tua</h3>
                        <select className="w-full md:w-1/3 p-2 border rounded-lg bg-white text-slate-800 mb-4" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
                            <option value="">-- Pilih Nama Siswa --</option>
                            {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        
                        {selectedStudentId && (
                             <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                 {classQuestions.map(q => {
                                     const ans = reflectionAnswers.find(a => String(a.questionId) === String(q.id) && String(a.studentId) === String(selectedStudentId));
                                     return (
                                         <div key={q.id} className="mb-4 last:mb-0">
                                             <p className="text-sm font-bold text-slate-700 mb-1">{q.question}</p>
                                             <p className="text-sm text-slate-600 italic bg-white p-2 rounded border border-slate-200">"{ans?.answer || 'Belum dijawab'}"</p>
                                         </div>
                                     );
                                 })}
                             </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default Refleksi;