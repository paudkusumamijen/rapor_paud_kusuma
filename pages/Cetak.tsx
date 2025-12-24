
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TP_CATEGORIES, DEFAULT_LOGO_URL } from '../constants';
import { Printer, Eye } from 'lucide-react';
import { AssessmentLevel } from '../types';

const formatDateIndo = (dateStr: string) => {
  if (!dateStr) return "-";
  
  // Penanganan manual untuk format yyyy-mm-dd agar tidak bergeser karena timezone
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parts[2].padStart(2, '0');
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${months[monthIndex]} ${year}`;
    }
  }
  
  // Fallback jika format berbeda
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const day = String(date.getDate()).padStart(2, '0');
  const monthIndex = date.getMonth();
  const year = date.getFullYear();
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  
  return `${day} ${months[monthIndex]} ${year}`;
};

const Cetak: React.FC = () => {
  const { students, assessments, categoryResults, settings, classes, tps, p5Criteria, p5Assessments, notes, attendance } = useApp();
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  // FIX: Pastikan ID dibandingkan sebagai String untuk menghindari mismatch tipe data (number vs string)
  const selectedStudent = students.find(s => String(s.id) === String(selectedStudentId));
  const studentClass = classes.find(c => String(c.id) === String(selectedStudent?.classId));

  // Gunakan Report Logo, fallback ke logo lama, fallback ke default
  const reportLogo = settings.reportLogoUrl || settings.logoUrl || DEFAULT_LOGO_URL;

  // Gunakan Kategori Dinamis dari Settings, Fallback ke Konstanta Default
  const activeCategories = settings.assessmentCategories && settings.assessmentCategories.length > 0 
    ? settings.assessmentCategories 
    : TP_CATEGORIES;

  // Filter Data for Selected Student
  const filteredStudents = selectedClassId 
    ? students.filter(s => String(s.classId) === String(selectedClassId))
    : [];

  const studentNote = notes.find(n => String(n.studentId) === String(selectedStudentId));
  const studentAttendance = attendance.find(a => String(a.studentId) === String(selectedStudentId)) || { sick: 0, permission: 0, alpha: 0 };

  // --- LOGIKA BARU P5: Hanya ambil kriteria kelas siswa YANG SUDAH DINILAI ---
  const studentP5Criteria = selectedStudent ? p5Criteria.filter(c => {
      // 1. Cek apakah kriteria milik kelas siswa ini
      const isClassMatch = String(c.classId) === String(selectedStudent.classId);
      
      // 2. Cek apakah ada penilaian untuk kriteria ini
      const hasAssessment = p5Assessments.some(a => 
          String(a.studentId) === String(selectedStudentId) && 
          String(a.criteriaId) === String(c.id)
      );

      return isClassMatch && hasAssessment;
  }) : [];

  const getBadgeLabel = (score: number) => {
     switch (score) {
         case 1: return "BERKEMBANG";
         case 2: return "CAKAP";
         case 3: return "MAHIR";
         default: return "-";
     }
  };

  const getBadgeColor = (score: number) => {
    switch (score) {
        case 1: return "#fef08a"; // Yellow
        case 2: return "#bfdbfe"; // Blue
        case 3: return "#bbf7d0"; // Green
        default: return "#ffffff";
    }
  };

  // --- HANDLER PRINT PDF (BROWSER NATIVE) ---
  const handlePrint = () => {
    if (!selectedStudent) { alert("Pilih siswa terlebih dahulu."); return; }

    const contentElement = document.getElementById('print-area-all');
    if (!contentElement) return;

    const title = `Rapor - ${selectedStudent.name}`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert("Pop-up diblokir. Izinkan pop-up untuk mencetak."); return; }

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Inter', sans-serif; background: white; color: black; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                
                /* ATURAN MARGIN HALAMAN CETAK (2cm) */
                @page { 
                    size: A4; 
                    margin: 20mm; /* Margin 2cm di semua sisi */
                }
                
                /* Reset Container saat dicetak agar mengikuti margin @page */
                .sheet { 
                    width: 100% !important;
                    min-height: auto !important; 
                    padding: 0 !important; 
                    margin: 0 !important; 
                    box-shadow: none !important;
                    page-break-after: always; 
                }

                /* TABEL DENGAN SUDUT MELENGKUNG */
                .report-table { 
                    width: 100%; 
                    border-collapse: separate; 
                    border-spacing: 0; 
                    border: 1px solid #000; 
                    border-radius: 12px; /* Rounded Table */
                    overflow: hidden;
                    font-size: 13px; 
                    margin-bottom: 10px; 
                }
                .report-table th, .report-table td { 
                    border-right: 1px solid #000; 
                    border-bottom: 1px solid #000; 
                    padding: 6px 8px; 
                }
                .report-table tr:last-child td {
                    border-bottom: none;
                }
                .report-table th:last-child, .report-table td:last-child {
                    border-right: none;
                }
                .report-table th { background-color: #e2e8f0 !important; font-weight: bold; text-transform: uppercase; text-align: center; }
                
                .no-border-table td { border: none !important; padding: 2px 4px; }
                .whitespace-pre-wrap { white-space: pre-wrap; }
                
                /* CSS untuk mencegah pemotongan konten saat pindah halaman */
                .break-inside-avoid {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }

                /* CSS KHUSUS UNTUK DESKRIPSI AGAR BINGKAI TIDAK TERPOTONG DAN MELENGKUNG */
                .description-box {
                    border: 1px solid black;
                    padding: 12px;
                    border-radius: 12px; /* Rounded Box */
                    background-color: white;
                    /* Properti Ajaib: Mengkloning border pada setiap pecahan halaman */
                    -webkit-box-decoration-break: clone;
                    box-decoration-break: clone;
                    display: block;
                }
            </style>
        </head>
        <body>
            ${contentElement.innerHTML}
            <script>setTimeout(() => { window.print(); }, 1000);</script>
        </body>
        </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const getBadgeContent = (score: number) => {
      switch (score) {
          case 1: 
              return (
                  <span className="inline-block px-3 py-1 rounded-full bg-yellow-200 text-black border border-yellow-400 text-[9px] font-black tracking-wider uppercase shadow-sm whitespace-nowrap">
                      BERKEMBANG
                  </span>
              );
          case 2: 
              return (
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-200 text-black border border-blue-400 text-[9px] font-black tracking-wider uppercase shadow-sm whitespace-nowrap">
                      CAKAP
                  </span>
              );
          case 3: 
              return (
                  <span className="inline-block px-3 py-1 rounded-full bg-green-200 text-black border border-green-400 text-[9px] font-black tracking-wider uppercase shadow-sm whitespace-nowrap">
                      MAHIR
                  </span>
              );
          default: 
              return "-";
      }
  };

  return (
    <div className="h-full flex flex-col">
      {/* INJECT STYLES FOR PREVIEW CONSISTENCY */}
      <style>{`
        /* FIX: Tabel Melengkung di Preview */
        .report-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid #000000;
            border-radius: 12px; /* Rounded */
            overflow: hidden;
            font-size: 13px;
            margin-bottom: 8px;
        }
        .report-table th, .report-table td {
            border-right: 1px solid #000000;
            border-bottom: 1px solid #000000;
            padding: 6px 8px;
        }
        .report-table tr:last-child td {
            border-bottom: none;
        }
        .report-table th:last-child, .report-table td:last-child {
            border-right: none;
        }
        .report-table th {
            background-color: #e2e8f0;
            color: #000000;
            font-weight: bold;
            text-transform: uppercase;
            text-align: center;
        }
        
        /* CSS KHUSUS UNTUK BOX DECORATION BREAK (Untuk Tampilan Preview) */
        .description-box {
            border: 1px solid black;
            padding: 12px;
            border-radius: 12px; /* Rounded Box */
            background-color: white;
            -webkit-box-decoration-break: clone;
            box-decoration-break: clone;
            display: block;
        }

        /* CSS untuk cetak agar tidak terpotong */
        @media print {
            .break-inside-avoid {
                page-break-inside: avoid;
                break-inside: avoid;
            }
        }
      `}</style>

      <div className="flex flex-col xl:flex-row justify-between items-center mb-6 gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Cetak Rapor</h1>
            <p className="text-sm text-slate-500">Preview ukuran kertas A4. Klik tombol cetak untuk membuka dokumen PDF.</p>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-3 w-full xl:w-auto">
             <select
                className="p-2.5 border rounded-lg text-slate-800 bg-white min-w-[200px] shadow-sm focus:ring-2 focus:ring-teal-500 outline-none"
                value={selectedClassId}
                onChange={e => { setSelectedClassId(e.target.value); setSelectedStudentId(''); }}
             >
                <option value="">-- Pilih Kelas --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>

             <select 
                className="p-2.5 border rounded-lg text-slate-800 bg-white min-w-[250px] shadow-sm focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                disabled={!selectedClassId}
            >
                <option value="">-- Pilih Siswa --</option>
                {filteredStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
            
            <button 
                onClick={handlePrint} 
                disabled={!selectedStudentId}
                className="bg-teal-600 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-lg font-bold text-sm"
            >
                <Printer size={18} /> Cetak / PDF
            </button>
        </div>
      </div>
      
      {/* Tambahkan padding-bottom yang besar (pb-24) agar konten preview tidak terpotong di bagian bawah layar */}
      <div className="flex-1 bg-slate-700 overflow-auto p-8 flex justify-center rounded-xl border border-slate-600 relative shadow-inner">
        {selectedStudent ? (
            // WRAPPER FOR ALL PAGES
            <div id="print-area-all" className="transform scale-[0.6] md:scale-[0.85] origin-top transition-transform pb-24">
                
                {/* ================= SHEET 1: COVER ================= */}
                {/* Padding 20mm (2cm) pada Preview */}
                <div className="sheet bg-white shadow-2xl mb-8 mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '20mm' }}>
                     {/* Perhitungan minHeight dikurangi total padding 40mm (20mm atas + 20mm bawah) */}
                     <div className="w-full h-full border-[3px] border-double border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-between" style={{ minHeight: 'calc(297mm - 40mm)' }}>
                        <div className="mt-10 text-center">
                            <img 
                                src={reportLogo} 
                                alt="Logo Sekolah" 
                                crossOrigin="anonymous"
                                className="w-40 h-40 mb-8 object-contain mx-auto"
                            />
                            
                            <h1 className="text-3xl font-extrabold uppercase tracking-wide text-slate-900 mb-2">
                                Laporan Hasil
                            </h1>
                            <h2 className="text-xl font-bold uppercase text-slate-700">
                                Capaian Perkembangan Peserta Didik<br/>
                                TAMAN PENITIPAN ANAK (TPA)
                            </h2>
                        </div>

                        <div className="w-full text-center">
                            <p className="text-sm font-semibold text-slate-500 uppercase mb-2 tracking-widest">Nama Peserta Didik</p>
                            <div className="border-2 border-slate-800 rounded-xl py-4 px-8 bg-slate-50 inline-block w-4/5">
                                <h3 className="text-2xl font-bold uppercase">{selectedStudent.name}</h3>
                            </div>
                        </div>

                        <div className="mb-10 text-center">
                            <p className="text-sm font-semibold text-slate-500 uppercase mb-1 tracking-widest">NISN</p>
                            <p className="text-xl font-bold">{selectedStudent.nisn}</p>
                        </div>

                        <div className="mb-10 w-full border-t-2 border-slate-200 pt-8 text-center">
                            <h3 className="text-xl font-bold uppercase mb-1">{settings.name}</h3>
                                <h3 className="text-xl font-bold uppercase mb-1"> NPSN: {settings.npsn}</h3>
                            <p className="text-sm font-medium text-slate-600 uppercase">
                                {settings.address}, {settings.village}, {settings.district}<br/>
                                {settings.regency}, {settings.province} {settings.postalCode}<br/>
                            </p>
                        </div>
                     </div>
                </div>

                {/* ================= SHEET 2: IDENTITY ================= */}
                <div className="sheet bg-white shadow-2xl mb-8 mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '20mm' }}>
                    <div className="text-center mb-8">
                        <div className="inline-block bg-red-600 text-white px-6 py-1.5 rounded-full mb-4 font-bold tracking-widest uppercase text-xs">
                            PAUD MERDEKA
                        </div>
                        <h1 className="text-xl font-black uppercase text-slate-800 tracking-wide underline underline-offset-4 decoration-2 decoration-teal-500">
                            Keterangan Diri Anak Didik
                        </h1>
                    </div>

                    <table className="w-full no-border-table text-sm leading-loose">
                        <tbody>
                            <tr><td className="w-6 font-bold text-slate-400">1.</td><td className="w-48 font-semibold">Nama Lengkap</td><td className="w-4">:</td><td className="uppercase font-bold text-slate-900">{selectedStudent.name}</td></tr>
                            <tr><td className="font-bold text-slate-400">2.</td><td className="font-semibold">NISN</td><td>:</td><td>{selectedStudent.nisn}</td></tr>
                            <tr><td className="font-bold text-slate-400">3.</td><td className="font-semibold">Tempat, Tanggal Lahir</td><td>:</td><td className="uppercase">{selectedStudent.pob}, {formatDateIndo(selectedStudent.dob)}</td></tr>
                            <tr><td className="font-bold text-slate-400">4.</td><td className="font-semibold">Jenis Kelamin</td><td>:</td><td>{selectedStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td></tr>
                            <tr><td className="font-bold text-slate-400">5.</td><td className="font-semibold">Agama</td><td>:</td><td className="uppercase">{selectedStudent.religion}</td></tr>
                            <tr><td className="font-bold text-slate-400">6.</td><td className="font-semibold">Anak Ke-</td><td>:</td><td>{selectedStudent.childOrder}</td></tr>
                            
                            <tr><td colSpan={4} className="pt-4 pb-1 font-bold text-teal-700 uppercase tracking-wide border-b border-slate-200">Orang Tua / Wali</td></tr>
                            
                            <tr><td className="font-bold text-slate-400 pt-2">7.</td><td className="font-semibold pt-2">Nama Ayah</td><td className="pt-2">:</td><td className="uppercase pt-2">{selectedStudent.fatherName}</td></tr>
                            <tr><td className="font-bold text-slate-400">8.</td><td className="font-semibold">Pekerjaan Ayah</td><td>:</td><td className="uppercase">{selectedStudent.fatherJob}</td></tr>
                            <tr><td className="font-bold text-slate-400">9.</td><td className="font-semibold">Nama Ibu</td><td>:</td><td className="uppercase">{selectedStudent.motherName}</td></tr>
                            <tr><td className="font-bold text-slate-400">10.</td><td className="font-semibold">Pekerjaan Ibu</td><td>:</td><td className="uppercase">{selectedStudent.motherJob}</td></tr>
                            <tr><td className="font-bold text-slate-400">11.</td><td className="font-semibold">No. Telepon / HP</td><td>:</td><td>{selectedStudent.phone}</td></tr>
                            <tr><td className="font-bold text-slate-400 align-top">12.</td><td className="font-semibold align-top">Alamat Lengkap</td><td className="align-top">:</td><td className="align-top">{selectedStudent.address}</td></tr>
                        </tbody>
                    </table>

                    <div className="mt-8 flex justify-between items-end">
                         {/* Photo */}
                         <div className="w-32 flex flex-col items-center ml-8">
                            <div className="w-28 h-36 border-2 border-dashed border-slate-400 flex items-center justify-center bg-slate-50 overflow-hidden relative shadow-sm">
                                {selectedStudent.photoUrl ? (
                                    <img src={selectedStudent.photoUrl} crossOrigin="anonymous" className="w-full h-full object-cover" alt="Foto Siswa" />
                                ) : (
                                    <div className="text-center p-2 text-slate-400">
                                        <p className="text-[10px]">Tempel Foto</p>
                                        <p className="text-sm font-bold">3 x 4</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="text-center w-60">
                            <p className="text-sm font-bold">{settings.reportPlace}, {formatDateIndo(settings.reportDate)}</p>
                            <p className="text-sm font-bold mb-16">Kepala Sekolah</p>
                            <p className="font-bold underline text-sm">{settings.headmaster}</p>
                        </div>
                    </div>
                </div>

                {/* ================= SHEET 3: RAPOR ISI ================= */}
                <div className="sheet bg-white mb-8 mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '20mm' }}>
                    <div className="text-center mb-6">
                        <h2 className="text-md font-bold uppercase leading-tight">
                            LAPORAN HASIL PERKEMBANGAN PESERTA DIDIK<br/>
                            TAMAN PENITIPAN ANAK (TPA)
                        </h2>
                    </div>

                    <div className="flex justify-between items-start text-xs mb-6 font-medium border-b-2 border-double border-slate-300 pb-2">
                        <div className="w-[55%]">
                            <table className="w-full no-border-table">
                                <tbody>
                                    <tr><td className="w-28 align-top">Nama Sekolah</td><td className="w-2 align-top">:</td><td className="uppercase">{settings.name}</td></tr>
                                    <tr><td className="align-top">Nama Peserta Didik</td><td className="align-top">:</td><td className="uppercase font-bold">{selectedStudent.name}</td></tr>
                                    <tr><td className="align-top">NIK / NISN</td><td className="align-top">:</td><td>{selectedStudent.nisn}</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="w-[40%]">
                            <table className="w-full no-border-table">
                                <tbody>
                                    <tr><td className="w-24 align-top">Kelas</td><td className="w-2 align-top">:</td><td className="uppercase">{studentClass?.name}</td></tr>
                                    <tr><td className="align-top">Sem / Th. Ajaran</td><td className="align-top">:</td><td>{settings.semester} / {settings.academicYear}</td></tr>
                                    <tr><td className="align-top">TB / BB</td><td className="align-top">:</td><td>{selectedStudent.height || 0} cm / {selectedStudent.weight || 0} kg</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* I. CAPAIAN PEMBELAJARAN (INTRAKURIKULER) */}
                    <h3 className="text-sm font-bold text-slate-900 uppercase mb-2">I. Capaian Pembelajaran</h3>
                    <div className="space-y-6 mb-6">
                        {activeCategories.map(category => {
                            const catTps = tps.filter(t => t.category === category && String(t.classId) === String(selectedStudent.classId));
                            if (catTps.length === 0) return null;

                            const catAssessments = assessments.filter(a => String(a.studentId) === String(selectedStudent.id) && catTps.some(t => String(t.id) === String(a.tpId)));
                            const catResult = categoryResults.find(r => String(r.studentId) === String(selectedStudent.id) && r.category === category);
                            
                            return (
                                <div key={category} className="mb-4">
                                    <div className="font-bold text-xs uppercase mb-1 pl-2 border-l-4 border-slate-800 tracking-wide" style={{ pageBreakAfter: 'avoid' }}>
                                        {category}
                                    </div>
                                    <table className="report-table">
                                        <thead>
                                            <tr>
                                                <th className="w-[40%]">Tujuan Pembelajaran</th>
                                                <th className="w-[40%]">Aktivitas</th>
                                                <th className="w-[20%]">DIMENSI KEMANDIRIAN</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {catTps.map((tp) => {
                                                const ass = catAssessments.find(a => String(a.tpId) === String(tp.id));
                                                const score = ass?.score || 0;
                                                return (
                                                    <tr key={tp.id} className="even:bg-slate-50">
                                                        <td className="align-top text-[13px] leading-snug">{tp.description}</td>
                                                        <td className="align-top text-[13px] text-slate-600 italic leading-snug">{tp.activity}</td>
                                                        <td className="align-middle text-center">
                                                            {getBadgeContent(score)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    
                                    {/* Deskripsi Box - Dengan CLASS BARU 'description-box' */}
                                    <div className="description-box mt-2 relative z-0">
                                        <p className="text-[10px] font-black text-slate-500 mb-1 tracking-widest uppercase flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block"></span>
                                            Deskripsi Capaian
                                        </p>
                                        <div className="text-justify text-[14px] leading-relaxed text-slate-800 font-medium whitespace-pre-wrap">
                                            {catResult?.generatedDescription || "-"}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* II. KOKURIKULER */}
                    {studentP5Criteria.length > 0 && (
                        <div className="mb-6 break-inside-avoid">
                            <h3 className="text-sm font-bold text-slate-900 uppercase mb-2">II. KOKURIKULER</h3>
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th className="w-[30%]">Dimensi</th>
                                        <th>Deskripsi Capaian</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studentP5Criteria.map((c) => {
                                        const assessment = p5Assessments.find(a => String(a.studentId) === String(selectedStudentId) && String(a.criteriaId) === String(c.id));
                                        const score = assessment?.score;
                                        let desc = assessment?.generatedDescription;
                                        if (!desc) {
                                            if (score === AssessmentLevel.BERKEMBANG) desc = c.descBerkembang;
                                            else if (score === AssessmentLevel.CAKAP) desc = c.descCakap;
                                            else if (score === AssessmentLevel.MAHIR) desc = c.descMahir;
                                            else desc = "-";
                                        }
                                        return (
                                            <tr key={c.id} className="even:bg-slate-50">
                                                <td className="align-top font-bold text-[13px]">{c.subDimension}</td>
                                                <td className="align-top text-justify text-[13px] leading-tight relative">
                                                    {/* Plain Text with whitespace wrap */}
                                                    <div className="whitespace-pre-wrap text-[14px]">{desc}</div>
                                                    {score && (
                                                        <div className="mt-1 text-right">
                                                           {getBadgeContent(score)}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* III. CATATAN & IV. KEHADIRAN & SIGNATURES (WRAPPER) */}
                    <div className="break-inside-avoid">
                        <div className="flex gap-4 mb-4">
                             <div className="flex-1">
                                 {/* CATATAN */}
                                 <div>
                                     <h3 className="text-xs font-bold text-slate-900 uppercase mb-1">III. Catatan Guru</h3>
                                     <div className="border border-black p-2 text-[14px] text-justify min-h-[110px] rounded-lg bg-white whitespace-pre-wrap">{studentNote?.note || "-"}</div>
                                 </div>
                             </div>

                             {/* KEHADIRAN */}
                             <div className="w-[30%]">
                                 <h3 className="text-xs font-bold text-slate-900 uppercase mb-1">IV. Kehadiran</h3>
                                 <table className="report-table">
                                    <thead>
                                        <tr><th className="text-left">Keterangan</th><th className="text-center">Jumlah</th></tr>
                                    </thead>
                                    <tbody>
                                        <tr><td>Sakit</td><td className="text-center font-bold">{studentAttendance.sick}</td></tr>
                                        <tr><td>Izin</td><td className="text-center font-bold">{studentAttendance.permission}</td></tr>
                                        <tr><td>Tanpa Ket.</td><td className="text-center font-bold">{studentAttendance.alpha}</td></tr>
                                    </tbody>
                                 </table>
                             </div>
                        </div>

                        {/* SIGNATURES */}
                        <div className="mt-4">
                            <div className="flex justify-between text-xs mt-8 px-4">
                                <div className="text-center w-48">
                                    <p>Mengetahui,</p>
                                    <p className="font-bold">Orang Tua/Wali,</p>
                                    <div className="h-20"></div>
                                    <p className="border-b border-black inline-block w-full mx-auto"></p>
                                </div>
                                <div className="text-center min-w-[220px]">
                                    <p>{settings.reportPlace}, {formatDateIndo(settings.reportDate)}</p>
                                    <p>Wali Kelas,</p>
                                    <div className="h-20"></div>
                                    {/* FIX: Prioritaskan Nama Guru dari Data Kelas */}
                                    <p className="font-bold underline whitespace-nowrap">
                                        {studentClass?.teacherName ? studentClass.teacherName : settings.teacher}
                                    </p>
                                    <p>NUPTK: {studentClass?.nuptk ? studentClass.nuptk : '-'}</p>
                                </div>
                            </div>
                             <div className="mt-4 text-center text-xs">
                                <p>Mengetahui,</p>
                                <p>Kepala Sekolah</p>
                                <div className="h-20"></div>
                                <p className="font-bold underline">{settings.headmaster}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white m-4 rounded-xl border border-dashed border-slate-300">
            <Eye size={64} className="mb-4 text-slate-200"/>
            <p className="text-lg font-medium text-slate-500">Preview Rapor (A4)</p>
            <p className="text-sm">Silakan pilih kelas dan siswa di menu atas untuk melihat preview rapor.</p>
        </div>
      )}
    </div>
  </div>
  );
};

export default Cetak;
