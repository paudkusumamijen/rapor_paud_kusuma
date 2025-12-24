
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLocation } from 'react-router-dom';
import { AssessmentLevel, TPType } from '../types';
import { TP_CATEGORIES } from '../constants';
import { generateCategoryDescription } from '../services/geminiService';
import { Save, Loader2, Sparkles, Filter, Edit3, CheckCircle, AlertCircle } from 'lucide-react';

// Helper to clean HTML tags from string
const cleanHtml = (html: string) => {
    if (!html) return "";
    let text = html.replace(/<\/p>/gi, '\n').replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<[^>]+>/g, '');
    text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    return text.trim();
};

const InputNilai: React.FC = () => {
  const { students, classes, tps, assessments, categoryResults, upsertAssessment, upsertCategoryResult, settings } = useApp();
  const location = useLocation();
  
  const activeCategories = settings.assessmentCategories && settings.assessmentCategories.length > 0 
    ? settings.assessmentCategories 
    : TP_CATEGORIES;

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>(activeCategories[0] || TPType.QURAN);
  
  useEffect(() => {
      if (!activeCategories.includes(activeCategory)) {
          setActiveCategory(activeCategories[0] || '');
      }
  }, [activeCategories]);

  useEffect(() => {
      if (location.state) {
          const { classId, studentId } = location.state as { classId: string; studentId: string };
          if (classId) setSelectedClassId(String(classId));
          if (studentId) setSelectedStudentId(String(studentId));
          window.history.replaceState({}, document.title);
      }
  }, []);

  const [tempScores, setTempScores] = useState<Record<string, AssessmentLevel>>({});
  const [teacherKeywords, setTeacherKeywords] = useState('');
  const [finalDescription, setFinalDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const filteredStudents = selectedClassId 
    ? students.filter(s => String(s.classId) === String(selectedClassId)) 
    : [];

  const selectedStudent = students.find(s => String(s.id) === String(selectedStudentId));
  
  const categoryTps = (selectedClassId && activeCategory)
    ? tps.filter(t => String(t.category) === String(activeCategory) && String(t.classId) === String(selectedClassId))
    : [];

  useEffect(() => {
    setTempScores({});
    setTeacherKeywords('');
    setFinalDescription('');
    setValidationError(null);

    if (selectedStudentId && activeCategory) {
        const sid = String(selectedStudentId);
        const scores: Record<string, AssessmentLevel> = {};
        categoryTps.forEach(tp => {
            const existing = assessments.find(a => String(a.studentId) === sid && String(a.tpId) === String(tp.id));
            if (existing) scores[tp.id] = existing.score;
        });
        setTempScores(scores);

        const res = categoryResults.find(r => String(r.studentId) === sid && String(r.category) === String(activeCategory));
        if (res) {
            setTeacherKeywords(res.teacherNote || '');
            const desc = res.generatedDescription || '';
            setFinalDescription(desc.includes('<') ? cleanHtml(desc) : desc);
        }
    }
  }, [selectedStudentId, activeCategory, assessments.length, categoryResults.length]); 

  useEffect(() => {
      if (showToast) {
          const timer = setTimeout(() => setShowToast(false), 3000);
          return () => clearTimeout(timer);
      }
  }, [showToast]);

  const handleScoreChange = (tpId: string, score: AssessmentLevel) => {
      setTempScores(prev => ({ ...prev, [tpId]: score }));
      setValidationError(null);
  };

  const handleGenerateAI = async () => {
    if (!selectedStudent) return;
    
    const assessmentsPayload = categoryTps
        .filter(tp => tempScores[tp.id]) 
        .map(tp => ({
            tp: tp.description,
            activity: tp.activity,
            score: tempScores[tp.id]
        }));

    if (assessmentsPayload.length === 0) {
        setValidationError("Mohon isi nilai TP pada tabel di atas terlebih dahulu sebelum menyusun narasi.");
        return;
    }

    setIsGenerating(true);
    setValidationError(null);
    try {
        const result = await generateCategoryDescription(
            selectedStudent.name,
            activeCategory,
            assessmentsPayload,
            teacherKeywords,
            settings.aiApiKey || "",
            settings.aiProvider || 'groq'
        );
        setFinalDescription(result);
    } catch (e) {
        alert("Gagal menyusun narasi.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleGenerateTemplate = () => {
    if (!selectedStudent) return;
    const assessmentsPayload = categoryTps
        .filter(tp => tempScores[tp.id]) 
        .map(tp => ({
            tp: tp.description,
            activity: tp.activity,
            score: tempScores[tp.id]
        }));

    if (assessmentsPayload.length === 0) {
        setValidationError("Mohon isi nilai TP pada tabel di atas terlebih dahulu.");
        return;
    }

    setValidationError(null);
    import('../services/geminiService').then(module => {
        const result = module.generateTemplateDescription(selectedStudent.name, activeCategory, assessmentsPayload);
        setFinalDescription(result);
    });
  };

  const handleSaveAll = async () => {
      if (!selectedStudentId) return;

      const sid = String(selectedStudentId);
      const incompleteTPs = categoryTps.filter(tp => !tempScores[tp.id]);
      
      if (incompleteTPs.length > 0) {
          setValidationError(`Penilaian belum lengkap! Ada ${incompleteTPs.length} TP yang belum diberi nilai.`);
          const firstMissing = document.getElementById(`tp-row-${incompleteTPs[0].id}`);
          if (firstMissing) firstMissing.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
      }

      if (!finalDescription.trim()) {
          setValidationError("Deskripsi Narasi Rapor wajib diisi.");
          return;
      }

      setIsSaving(true);
      setValidationError(null);
      try {
          for (const tp of categoryTps) {
              const score = tempScores[tp.id];
              if (score) {
                  await upsertAssessment({
                      id: `${sid}-${tp.id}`,
                      studentId: sid,
                      tpId: String(tp.id),
                      score: score,
                      semester: settings.semester,
                      academicYear: settings.academicYear
                  });
              }
          }

          await upsertCategoryResult({
              id: `${sid}-${activeCategory}`,
              studentId: sid,
              category: activeCategory,
              teacherNote: teacherKeywords,
              generatedDescription: finalDescription,
              semester: settings.semester,
              academicYear: settings.academicYear
          });

          setShowToast(true);
      } catch (error) {
          alert("Gagal menyimpan data.");
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-4 gap-4">
          <h1 className="text-2xl font-bold text-slate-800">Input Nilai & Deskripsi</h1>
      </div>

      {showToast && (
          <div className="fixed top-20 right-4 z-50 bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 duration-300">
              <CheckCircle size={24} className="text-green-200" />
              <div><h4 className="font-bold text-lg">Berhasil!</h4><p className="text-green-100 text-sm">Data tersimpan.</p></div>
          </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2"><Filter size={16} /> Filter Kelas:</label>
                <select className="w-full p-2 border rounded-lg text-slate-800 bg-white" value={selectedClassId} onChange={e => { setSelectedClassId(e.target.value); setSelectedStudentId(''); }}>
                    <option value="">-- Pilih Kelas --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Pilih Siswa:</label>
                <select className="w-full p-2 border rounded-lg text-slate-800 bg-white disabled:bg-slate-100" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} disabled={!selectedClassId}>
                    <option value="">-- Pilih Siswa --</option>
                    {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
        </div>
      </div>

      {selectedStudentId ? (
        <div className="flex-1 flex flex-col">
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                {activeCategories.map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-colors ${activeCategory === cat ? 'bg-teal-600 text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{cat}</button>
                ))}
            </div>

            {validationError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertCircle size={20} className="shrink-0" />
                    <p className="font-bold text-sm">{validationError}</p>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex-1 overflow-auto">
                <div className="flex justify-between items-center mb-4 pb-2 border-b"><h2 className="text-xl font-bold text-slate-800">{activeCategory}</h2></div>
                {categoryTps.length === 0 ? (
                    <div className="text-center p-8 text-slate-400 bg-slate-50 rounded-lg"><p>Belum ada TP untuk kategori ini di kelas terpilih.</p></div>
                ) : (
                    <>
                        <div className="overflow-x-auto mb-8 border rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-xs">
                                    <tr>
                                        <th className="p-3 border-b border-r w-1/3">TP</th>
                                        <th className="p-3 border-b border-r w-1/3">Aktivitas</th>
                                        <th className="p-3 border-b text-center">Nilai <span className="text-red-500">*</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categoryTps.map(tp => (
                                        <tr key={tp.id} id={`tp-row-${tp.id}`} className={`border-b hover:bg-slate-50 transition-colors ${!tempScores[tp.id] && validationError ? 'bg-red-50/50' : ''}`}>
                                            <td className="p-3 border-r align-top">{tp.description}</td>
                                            <td className="p-3 border-r align-top text-slate-500">{tp.activity}</td>
                                            <td className="p-3 align-top">
                                                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                                                    {[1, 2, 3].map(val => (
                                                        <label key={val} className={`cursor-pointer px-3 py-2 rounded border text-xs font-bold text-center flex-1 transition-all ${tempScores[tp.id] === val ? 'bg-indigo-100 border-indigo-500 text-indigo-700 shadow-sm' : 'bg-white text-slate-500 hover:border-slate-300'} ${!tempScores[tp.id] && validationError ? 'border-red-300' : ''}`}>
                                                            <input type="radio" name={`tp-${tp.id}`} checked={tempScores[tp.id] === val} onChange={() => handleScoreChange(tp.id, val as AssessmentLevel)} className="hidden"/>
                                                            {val === 1 ? 'Berkembang' : val === 2 ? 'Cakap' : 'Mahir'}
                                                        </label>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center justify-between">
                                        <span>Kata Kunci Guru (Opsional)</span>
                                        <span className="text-[10px] font-normal text-slate-400">Gunakan untuk membantu AI</span>
                                    </label>
                                    <textarea className="w-full p-3 border rounded-lg bg-white h-32 text-sm focus:ring-2 focus:ring-teal-200 outline-none" placeholder="Contoh: Sangat aktif saat mewarnai, sudah berani tampil di depan..." value={teacherKeywords} onChange={e => setTeacherKeywords(e.target.value)} />
                                    <div className="mt-3 flex gap-2">
                                        <button onClick={handleGenerateAI} disabled={isGenerating} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm flex justify-center items-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-50">
                                            {isGenerating ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>} Susun Narasi
                                        </button>
                                        <button onClick={handleGenerateTemplate} className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors">Template</button>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Deskripsi Rapor <span className="text-red-500">*</span>
                                    </label>
                                    <textarea 
                                        value={finalDescription} 
                                        onChange={(e) => { setFinalDescription(e.target.value); setValidationError(null); }} 
                                        className={`w-full p-3 border rounded-lg bg-white h-64 text-sm resize-none focus:ring-2 focus:ring-teal-200 outline-none transition-colors ${!finalDescription.trim() && validationError ? 'border-red-300 bg-red-50/20' : 'border-slate-300'}`} 
                                        placeholder="Tulis atau susun narasi perkembangan siswa di sini..."
                                    />
                                    {!finalDescription.trim() && validationError && <p className="text-[11px] text-red-600 mt-1 font-bold">Harap lengkapi narasi deskripsi.</p>}
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end pt-4 border-t">
                            <button onClick={handleSaveAll} disabled={isSaving} className="bg-teal-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2 transform active:scale-95 transition-all">
                                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20}/>} Simpan Nilai & Narasi
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-300 rounded-xl m-4 bg-slate-50"><Edit3 size={48} className="mb-2 opacity-30"/><p>Pilih Siswa untuk Memulai Penilaian</p></div>
      )}
    </div>
  );
};

export default InputNilai;
