
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TP_CATEGORIES, DEFAULT_LOGO_URL } from '../constants';
import { Eye, BookOpen } from 'lucide-react';

const formatDateIndo = (dateStr: string) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const RaporAnak: React.FC = () => {
  const { students, assessments, categoryResults, settings, classes, tps, p5Criteria, p5Assessments, notes, attendance } = useApp();
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  const selectedStudent = students.find(s => String(s.id) === String(selectedStudentId));
  const studentClass = classes.find(c => String(c.id) === String(selectedStudent?.classId));
  const reportLogo = settings.reportLogoUrl || settings.logoUrl || DEFAULT_LOGO_URL;

  const activeCategories = settings.assessmentCategories && settings.assessmentCategories.length > 0 ? settings.assessmentCategories : TP_CATEGORIES;
  const p5Labels = settings.p5Labels || ["MB", "BSH", "SB"];

  const filteredStudents = selectedClassId ? students.filter(s => String(s.classId) === String(selectedClassId)) : [];
  const studentNote = notes.find(n => String(n.studentId) === String(selectedStudentId));
  const studentAttendance = attendance.find(a => String(a.studentId) === String(selectedStudentId)) || { sick: 0, permission: 0, alpha: 0 };

  const studentP5Criteria = selectedStudent ? p5Criteria.filter(c => {
      const isClassMatch = String(c.classId) === String(selectedStudent.classId);
      const hasAssessment = p5Assessments.some(a => String(a.studentId) === String(selectedStudentId) && String(a.criteriaId) === String(c.id));
      return isClassMatch && hasAssessment;
  }) : [];

  const getBadgeContent = (score: number, isP5: boolean = false) => {
      if (score === 0) return "-";
      if (isP5) {
          const label = p5Labels[score - 1] || "MB";
          return <span className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-black">{label}</span>;
      }
      switch (score) {
          case 1: return <span className="inline-block px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200 text-[10px] font-black">BERKEMBANG</span>;
          case 2: return <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-black">CAKAP</span>;
          case 3: return <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-800 border border-green-200 text-[10px] font-black">MAHIR</span>;
          default: return "-";
      }
  };

  return (
    <div className="h-full flex flex-col">
      <style>{`
        .report-table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; font-size: 13px; }
        .report-table th, .report-table td { border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 10px; }
        .report-table th { background-color: #f8fafc; font-weight: bold; }
        .report-table tr:last-child td { border-bottom: none; }
        .report-table td:last-child { border-right: none; }
        .description-box { border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; background-color: #f8fafc; margin-top: 10px; }
      `}</style>

      <div className="bg-indigo-600 p-6 rounded-xl shadow-lg mb-6 text-white">
        <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen size={28}/> Lihat Rapor Ananda</h1>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
             <select className="p-2.5 border rounded-lg text-slate-800 bg-white min-w-[200px]" value={selectedClassId} onChange={e => { setSelectedClassId(e.target.value); setSelectedStudentId(''); }}><option value="">-- Kelas --</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
             <select className="p-2.5 border rounded-lg text-slate-800 bg-white min-w-[250px] disabled:opacity-50" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} disabled={!selectedClassId}><option value="">-- Nama Anak --</option>{filteredStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        </div>
      </div>
      
      <div className="flex-1 bg-slate-50 overflow-auto p-4 md:p-8 flex justify-center rounded-xl border relative shadow-inner">
        {selectedStudent ? (
            <div className="w-full max-w-4xl bg-white shadow-2xl p-10 rounded-2xl">
                <div className="flex flex-col items-center mb-10 pb-10 border-b">
                    <img src={reportLogo} alt="Logo" className="w-32 h-32 mb-4 object-contain" />
                    <h1 className="text-2xl font-black uppercase text-center">{settings.name}</h1>
                    <p className="text-slate-500 uppercase font-bold text-sm tracking-widest">Laporan Perkembangan Peserta Didik</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nama Peserta Didik</p>
                        <p className="text-xl font-black uppercase text-indigo-900">{selectedStudent.name}</p>
                        <p className="text-sm font-bold text-slate-500">NISN: {selectedStudent.nisn}</p>
                    </div>
                    <div className="space-y-2 text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tahun Pelajaran</p>
                        <p className="text-xl font-black text-slate-800">{settings.academicYear}</p>
                        <p className="text-sm font-bold text-slate-500">Semester: {settings.semester}</p>
                    </div>
                </div>

                <div className="space-y-10">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
                            <div className="w-2 h-8 bg-indigo-600 rounded-full"></div> Intrakurikuler
                        </h3>
                        {activeCategories.map(category => {
                            const catTps = tps.filter(t => t.category === category && String(t.classId) === String(selectedStudent.classId));
                            if (catTps.length === 0) return null;
                            const catAssessments = assessments.filter(a => String(a.studentId) === String(selectedStudent.id) && catTps.some(t => String(t.id) === String(a.tpId)));
                            const catResult = categoryResults.find(r => String(r.studentId) === String(selectedStudent.id) && r.category === category);
                            return (
                                <div key={category} className="mb-8">
                                    <h4 className="font-bold text-sm text-indigo-700 bg-indigo-50 px-4 py-2 rounded-lg mb-3 uppercase tracking-wide">{category}</h4>
                                    <table className="report-table">
                                        <thead><tr><th>Tujuan Pembelajaran</th><th className="w-28 text-center">Capaian</th></tr></thead>
                                        <tbody>
                                            {catTps.map((tp) => {
                                                const ass = catAssessments.find(a => String(a.tpId) === String(tp.id));
                                                return <tr key={tp.id}><td><p className="font-bold mb-1">{tp.description}</p><p className="text-xs text-slate-500 italic">{tp.activity}</p></td><td className="text-center">{getBadgeContent(ass?.score || 0)}</td></tr>;
                                            })}
                                        </tbody>
                                    </table>
                                    <div className="description-box"><p className="text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">Narasi Perkembangan</p><p className="text-sm leading-relaxed text-slate-800 text-justify whitespace-pre-wrap">{catResult?.generatedDescription || "-"}</p></div>
                                </div>
                            );
                        })}
                    </div>

                    {studentP5Criteria.length > 0 && (
                        <div>
                            <h3 className="text-lg font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
                                <div className="w-2 h-8 bg-orange-500 rounded-full"></div> Kokurikuler
                            </h3>
                            <table className="report-table">
                                <thead><tr><th className="w-1/3">Aspek Projek</th><th>Capaian & Narasi</th></tr></thead>
                                <tbody>
                                    {studentP5Criteria.map((c) => {
                                        const assessment = p5Assessments.find(a => String(a.studentId) === String(selectedStudentId) && String(a.criteriaId) === String(c.id));
                                        const score = assessment?.score || 0;
                                        let desc = assessment?.generatedDescription || (c.levelDescriptions?.[score] || "-");
                                        return <tr key={c.id}><td className="font-bold align-top text-slate-700">{c.subDimension}</td><td className="align-top"><div className="mb-2">{getBadgeContent(score, true)}</div><div className="text-sm text-slate-700 leading-relaxed text-justify">{desc}</div></td></tr>;
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        ) : <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white m-4 rounded-xl border border-dashed"><Eye size={64} className="mb-4 text-slate-200"/><p className="text-lg font-medium">Pilih Ananda untuk Melihat Rapor</p></div>}
      </div>
    </div>
  );
};

export default RaporAnak;
