
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLocation } from 'react-router-dom';
import { P5Criteria } from '../types';
import { generateP5Description } from '../services/geminiService';
import { Save, Filter, Sparkles, Loader2, X, CheckCircle, Info, AlertCircle } from 'lucide-react';

const cleanHtml = (html: string) => {
    if (!html) return "";
    let text = html.replace(/<\/p>/gi, '\n').replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<[^>]+>/g, '');
    text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    return text.trim();
};

export default function InputP5() {
  const { p5Criteria, students, classes, p5Assessments, upsertP5Assessment, settings } = useApp();
  const location = useLocation();
  
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [activeCritId, setActiveCritId] = useState<string | null>(null);
  
  const [currentScore, setCurrentScore] = useState<number>(1);
  const [teacherNote, setTeacherNote] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Dynamic P5 Labels from Master Settings
  const p5Labels = settings.p5Labels || ["MB", "BSH", "SB"];

  useEffect(() => {
      if (location.state) {
          const { classId, studentId } = location.state as { classId: string; studentId: string };
          if (classId) setSelectedClassId(classId);
          if (studentId) setSelectedStudentId(studentId);
          window.history.replaceState({}, document.title);
      }
  }, []);

  useEffect(() => {
      if (showToast) {
          const timer = setTimeout(() => setShowToast(false), 3000);
          return () => clearTimeout(timer);
      }
  }, [showToast]);

  const filteredStudents = selectedClassId ? students.filter(s => String(s.classId) === String(selectedClassId)) : [];
  const selectedStudent = students.find(s => String(s.id) === String(selectedStudentId));
  
  const assessmentCriteria = selectedClassId ? p5Criteria.filter(c => String(c.classId) === String(selectedClassId)) : [];

  const handleOpenAssessment = (crit: P5Criteria) => {
    setActiveCritId(crit.id);
    setValidationError(null);
    const existing = p5Assessments.find(a => String(a.studentId) === String(selectedStudentId) && String(a.criteriaId) === String(crit.id));
    if (existing) { 
        setCurrentScore(existing.score); 
        setTeacherNote(existing.teacherNote || ''); 
        setDescription(existing.generatedDescription || ''); 
    } else { 
        setCurrentScore(1); 
        setTeacherNote(''); 
        setDescription(''); 
    }
  };

  const handleGenerateAI = async (subDimension: string) => {
      if (!selectedStudent) return;
      setIsGenerating(true);
      setValidationError(null);
      try {
          const res = await generateP5Description(
              selectedStudent.name, 
              subDimension, 
              currentScore, 
              teacherNote,
              settings.aiApiKey || "",
              settings.aiProvider || 'groq'
          );
          if (res.startsWith("Error")) { alert(res); } else { setDescription(res); }
      } catch (e) { alert("Gagal menghubungi AI."); } finally { setIsGenerating(false); }
  };

  const handleGenerateTemplate = (subDimension: string) => {
      if (!selectedStudent) return;
      const labelText = p5Labels[currentScore - 1] || "MB";
      const res = `Ananda ${selectedStudent.name} menunjukkan capaian ${labelText} dalam ${subDimension}.${teacherNote ? ' ' + teacherNote : ''}`;
      setDescription(res);
      setValidationError(null);
  };

  const handleSaveAssessment = async () => {
    if (!selectedStudentId || !activeCritId) return;

    if (!description.trim()) {
        setValidationError("Deskripsi narasi capaian wajib diisi.");
        return;
    }

    setIsSaving(true);
    setValidationError(null);
    try {
        await upsertP5Assessment({
            id: `${selectedStudentId}-${activeCritId}`, 
            studentId: selectedStudentId, 
            criteriaId: activeCritId, 
            score: currentScore, 
            teacherNote: teacherNote, 
            generatedDescription: description
        });
        setShowToast(true);
        setActiveCritId(null);
    } catch (error) {
        alert("Gagal menyimpan.");
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="relative h-full">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Input Nilai Kokurikuler</h1>
      </div>

      {showToast && (
          <div className="fixed top-20 right-4 z-50 bg-purple-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 duration-300">
              <CheckCircle size={24} className="text-purple-200" />
              <div><h4 className="font-bold text-lg">Berhasil Disimpan!</h4><p className="text-purple-100 text-sm">Nilai Kokurikuler tersimpan.</p></div>
          </div>
      )}

      <div className="space-y-6">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2"><Filter size={16}/> Filter Kelas</label>
                        <select className="w-full p-2 border rounded-lg bg-white text-slate-800" value={selectedClassId} onChange={e => { setSelectedClassId(e.target.value); setSelectedStudentId(''); setActiveCritId(null); }}>
                            <option value="">-- Pilih Kelas --</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Pilih Siswa</label>
                        <select className="w-full p-2 border rounded-lg bg-white text-slate-800 disabled:bg-slate-100" value={selectedStudentId} onChange={e => { setSelectedStudentId(e.target.value); setActiveCritId(null); }} disabled={!selectedClassId}>
                            <option value="">-- Pilih Siswa --</option>
                            {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                 </div>
             </div>
             
             {selectedStudentId ? (
                 <div className="space-y-4">
                    <h3 className="font-bold text-lg text-slate-800 border-b pb-2">Daftar Sub Dimensi Kokurikuler ({classes.find(c => c.id === selectedClassId)?.name})</h3>
                    {assessmentCriteria.length > 0 ? (
                        assessmentCriteria.map(c => {
                            const isEditingThis = activeCritId === c.id;
                            const existing = p5Assessments.find(a => String(a.studentId) === String(selectedStudentId) && String(a.criteriaId) === String(c.id));
                            if (!isEditingThis) {
                                return (
                                    <div key={c.id} className={`bg-white rounded-xl border shadow-sm p-5 flex justify-between items-center transition-all ${existing ? 'border-l-4 border-l-purple-500' : 'border-slate-200'}`}>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-lg">{c.subDimension}</h4>
                                            {existing ? (
                                                <div className="mt-2 text-sm text-slate-600">
                                                    <span className="inline-block bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-bold mr-2">{p5Labels[existing.score - 1] || "MB"}</span>
                                                    <span className="italic">"{existing.generatedDescription?.substring(0, 60)}..."</span>
                                                </div>
                                            ) : <p className="text-sm text-slate-400 mt-1">Belum dinilai</p>}
                                        </div>
                                        <button type="button" onClick={() => handleOpenAssessment(c)} className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${existing ? 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50' : 'bg-indigo-600 text-white border-transparent hover:bg-indigo-700'}`}>{existing ? 'Edit Nilai' : 'Input Nilai'}</button>
                                    </div>
                                );
                            }

                            // Get Dynamic Description for current selected score
                            const activeLevelDesc = c.levelDescriptions?.[currentScore] || 
                                (currentScore === 1 ? c.descBerkembang : currentScore === 2 ? c.descCakap : currentScore === 3 ? c.descMahir : "");

                            return (
                                <div key={c.id} className="bg-white rounded-xl border-2 border-indigo-500 shadow-lg p-6 relative animate-in fade-in zoom-in-95 duration-200">
                                    <button type="button" onClick={() => setActiveCritId(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={24}/></button>
                                    <h4 className="font-bold text-xl text-indigo-700 mb-6">{c.subDimension}</h4>
                                    
                                    {validationError && (
                                        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-bold flex items-center gap-2">
                                            <AlertCircle size={18} />
                                            {validationError}
                                        </div>
                                    )}

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">1. Pilih Tingkat Pencapaian <span className="text-red-500">*</span></label>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                                {p5Labels.map((label, idx) => {
                                                    const val = idx + 1;
                                                    return (
                                                        <button key={val} type="button" onClick={() => { setCurrentScore(val); setValidationError(null); }} className={`py-3 px-2 rounded-xl border-2 text-xs font-bold transition-all ${currentScore === val ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-inner' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-300'}`}>{label}</button>
                                                    );
                                                })}
                                            </div>

                                            {/* DISPLAY INDICATOR DESCRIPTION */}
                                            {activeLevelDesc && (
                                                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3 animate-in slide-in-from-top-1 duration-200">
                                                    <Info className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                                                    <div>
                                                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Indikator Capaian {p5Labels[currentScore-1]}:</p>
                                                        <p className="text-sm text-indigo-800 leading-relaxed italic">"{activeLevelDesc}"</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">2. Kata Kunci / Perilaku (Opsional)</label>
                                            <input className="w-full p-3 border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Contoh: mau berbagi mainan, sudah bisa antre..." value={teacherNote} onChange={e => setTeacherNote(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">3. Buat Deskripsi</label>
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => handleGenerateAI(c.subDimension)} disabled={isGenerating} className="flex-1 py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-white shadow-md transition-all bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50">{isGenerating ? <Loader2 size={18} className="animate-spin"/> : <Sparkles size={18}/>} {isGenerating ? 'Menyusun...' : 'AI Narasi'}</button>
                                                <button type="button" onClick={() => handleGenerateTemplate(c.subDimension)} className="px-4 py-3 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 text-sm transition-colors">Template</button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">4. Hasil Deskripsi (Bisa Diedit) <span className="text-red-500">*</span></label>
                                            <textarea 
                                                className={`w-full p-3 border rounded-lg bg-white text-slate-800 h-32 leading-relaxed focus:ring-2 focus:ring-teal-500 outline-none transition-colors ${!description.trim() && validationError ? 'border-red-300 bg-red-50/20' : 'border-slate-300'}`} 
                                                value={description} 
                                                onChange={e => { setDescription(e.target.value); setValidationError(null); }} 
                                                placeholder="Hasil narasi akan muncul di sini..." 
                                            />
                                        </div>
                                        <div className="flex justify-end pt-4 border-t border-slate-100"><button type="button" onClick={handleSaveAssessment} disabled={isSaving} className="bg-teal-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-teal-700 shadow-lg flex items-center gap-2 transform active:scale-95 transition-all disabled:opacity-50">{isSaving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} Simpan Capaian</button></div>
                                    </div>
                                </div>
                            );
                        })
                    ) : <div className="text-center p-8 bg-orange-50 rounded-xl border border-orange-200"><p className="text-orange-800 font-medium">Belum ada data Sub Dimensi.</p></div>}
                 </div>
             ) : <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 text-slate-400"><Filter size={48} className="mb-4 opacity-30"/><p className="text-lg font-medium">Pilih Siswa</p></div>}
      </div>
    </div>
  );
}
