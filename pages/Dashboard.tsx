import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, GraduationCap, Star, CalendarDays, Filter, CheckCircle2, AlertCircle, Circle, PenTool } from 'lucide-react';

// --- TYPE DEFINITIONS ---
type GradingStatus = 'LENGKAP' | 'KURANG' | 'BELUM' | 'KOSONG';

interface StudentProgress {
  studentId: string;
  name: string;
  nisn: string;
  className: string;
  classId: string;
  intra: {
    status: GradingStatus;
    filled: number;
    total: number;
  };
  p5: {
    status: GradingStatus;
    filled: number;
    total: number;
  };
}

// --- KOMPONEN SUMMARY CHART (PIE) ---
const SummaryPieChart: React.FC<{ data: { label: string; value: number; color: string }[]; title: string; icon: React.ReactNode }> = ({ data, title, icon }) => {
  const total = data.reduce((acc, cur) => acc + cur.value, 0);
  let cumulativePercent = 0;

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  if (total === 0) {
      return (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center min-h-[250px]">
              <div className="text-slate-300 mb-2">{icon}</div>
              <p className="text-slate-400 text-sm font-medium">Belum ada data untuk ditampilkan</p>
          </div>
      );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
      <div className="flex items-center gap-2 mb-6">
          {icon}
          <h3 className="font-bold text-slate-700">{title}</h3>
      </div>
      
      <div className="flex flex-col md:flex-row items-center gap-8">
          {/* SVG PIE CHART */}
          <div className="relative w-40 h-40 flex-shrink-0">
            <svg viewBox="-1 -1 2 2" className="transform -rotate-90 w-full h-full">
                {data.map((slice, idx) => {
                    if (slice.value === 0) return null;
                    const startPercent = cumulativePercent;
                    const slicePercent = slice.value / total;
                    cumulativePercent += slicePercent;
                    
                    // Handle single full circle
                    if (slicePercent === 1) {
                        return <circle key={idx} cx="0" cy="0" r="1" fill={slice.color} />;
                    }

                    const [startX, startY] = getCoordinatesForPercent(startPercent);
                    const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
                    const largeArcFlag = slicePercent > 0.5 ? 1 : 0;

                    const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
                    return <path key={idx} d={pathData} fill={slice.color} stroke="white" strokeWidth="0.02" />;
                })}
                <circle cx="0" cy="0" r="0.6" fill="white" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-slate-700">{total}</span>
                <span className="text-[10px] text-slate-400 uppercase">Siswa</span>
            </div>
          </div>

          {/* LEGEND */}
          <div className="flex-1 w-full space-y-3">
              {data.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                          <span className="text-slate-600 font-medium">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{item.value}</span>
                          <span className="text-xs text-slate-400">({Math.round((item.value / total) * 100)}%)</span>
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};

// --- HELPER COMPONENT FOR STATUS BADGE ---
const StatusBadge: React.FC<{ status: GradingStatus; filled: number; total: number }> = ({ status, filled, total }) => {
    switch (status) {
        case 'LENGKAP':
            return (
                <div className="flex items-center gap-1.5 text-green-700 bg-green-50 px-2 py-1 rounded-md border border-green-200 w-fit">
                    <CheckCircle2 size={14} />
                    <span className="text-xs font-bold">Lengkap ({filled}/{total})</span>
                </div>
            );
        case 'KURANG':
            return (
                <div className="flex items-center gap-1.5 text-orange-700 bg-orange-50 px-2 py-1 rounded-md border border-orange-200 w-fit">
                    <AlertCircle size={14} />
                    <span className="text-xs font-bold">Kurang ({filled}/{total})</span>
                </div>
            );
        case 'BELUM':
            return (
                <div className="flex items-center gap-1.5 text-red-700 bg-red-50 px-2 py-1 rounded-md border border-red-200 w-fit">
                    <Circle size={14} />
                    <span className="text-xs font-bold">Belum Dinilai</span>
                </div>
            );
        default: // KOSONG (Belum ada TP/Kriteria)
            return (
                <span className="text-xs text-slate-400 italic">Belum ada indikator</span>
            );
    }
};

const Dashboard: React.FC = () => {
  const { students, classes, tps, p5Criteria, settings, assessments, p5Assessments } = useApp();
  const navigate = useNavigate();
  const [filterClassId, setFilterClassId] = useState<string>('');

  const stats = [
    { label: "Total Siswa", value: students.length, icon: <GraduationCap size={32} />, color: "bg-blue-500" },
    { label: "Total Kelas", value: classes.length, icon: <Users size={32} />, color: "bg-teal-500" },
    { label: "Total TP", value: tps.length, icon: <BookOpen size={32} />, color: "bg-orange-500" },
    { label: "Total Indikator Kokurikuler", value: p5Criteria.length, icon: <Star size={32} />, color: "bg-purple-500" },
  ];

  // --- LOGIC PERHITUNGAN STATUS ---
  const monitoringData: StudentProgress[] = useMemo(() => {
      // Filter siswa berdasarkan kelas yang dipilih (jika ada)
      const targetStudents = filterClassId 
        ? students.filter(s => String(s.classId) === String(filterClassId))
        : students;

      return targetStudents.map(student => {
          // 1. INTRAKURIKULER
          // Ambil TP yang relevan dengan kelas siswa ini
          const classTps = tps.filter(t => String(t.classId) === String(student.classId));
          const totalIntra = classTps.length;
          // Hitung nilai yang sudah masuk (unik berdasarkan TP ID)
          const filledIntra = classTps.filter(tp => 
              assessments.some(a => 
                  String(a.studentId) === String(student.id) && 
                  String(a.tpId) === String(tp.id) &&
                  a.semester === settings.semester &&
                  a.academicYear === settings.academicYear
              )
          ).length;

          let statusIntra: GradingStatus = 'KOSONG';
          if (totalIntra > 0) {
              if (filledIntra === totalIntra) statusIntra = 'LENGKAP';
              else if (filledIntra === 0) statusIntra = 'BELUM';
              else statusIntra = 'KURANG';
          }

          // 2. KOKURIKULER (P5)
          const classP5 = p5Criteria.filter(c => String(c.classId) === String(student.classId));
          const totalP5 = classP5.length;
          const filledP5 = classP5.filter(c =>
              p5Assessments.some(a =>
                  String(a.studentId) === String(student.id) &&
                  String(a.criteriaId) === String(c.id)
              )
          ).length;

          let statusP5: GradingStatus = 'KOSONG';
          if (totalP5 > 0) {
              if (filledP5 === totalP5) statusP5 = 'LENGKAP';
              else if (filledP5 === 0) statusP5 = 'BELUM';
              else statusP5 = 'KURANG';
          }

          return {
              studentId: student.id,
              name: student.name,
              nisn: student.nisn,
              className: classes.find(c => c.id === student.classId)?.name || '-',
              classId: student.classId,
              intra: { status: statusIntra, filled: filledIntra, total: totalIntra },
              p5: { status: statusP5, filled: filledP5, total: totalP5 }
          };
      });
  }, [students, classes, tps, p5Criteria, assessments, p5Assessments, settings, filterClassId]);

  // --- PREPARE CHART DATA ---
  const getChartData = (type: 'intra' | 'p5') => {
      const counts = { LENGKAP: 0, KURANG: 0, BELUM: 0 };
      monitoringData.forEach(d => {
          const status = d[type].status;
          if (status !== 'KOSONG') {
              counts[status]++;
          }
      });

      return [
          { label: "Lengkap", value: counts.LENGKAP, color: "#22c55e" }, // Green-500
          { label: "Kurang", value: counts.KURANG, color: "#f97316" }, // Orange-500
          { label: "Belum Dinilai", value: counts.BELUM, color: "#ef4444" }, // Red-500
      ];
  };

  const handleNavigateInput = (path: string, classId: string, studentId: string) => {
      navigate(path, { state: { classId, studentId } });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard Overview</h1>
      
      {/* Highlight Tahun Ajaran */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
         <div className="flex items-center gap-4">
             <div className="bg-indigo-100 p-3 rounded-full text-indigo-600">
                 <CalendarDays size={32} />
             </div>
             <div>
                 <p className="text-slate-500 text-sm font-medium">Tahun Pelajaran</p>
                 <h2 className="text-2xl font-bold text-slate-800">{settings.academicYear || "-"}</h2>
             </div>
         </div>
         <div className="h-10 w-px bg-slate-200 hidden md:block"></div>
         <div className="flex items-center gap-4">
             <div>
                 <p className="text-slate-500 text-sm font-medium text-right md:text-left">Semester</p>
                 <h2 className="text-2xl font-bold text-slate-800 text-right md:text-left">{settings.semester || "-"}</h2>
             </div>
         </div>
      </div>

      {/* Grid Statistik Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 transition-transform hover:-translate-y-1">
            <div className={`${stat.color} text-white p-4 rounded-xl shadow-md`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">{stat.label}</p>
              <h2 className="text-3xl font-bold text-slate-800">{stat.value}</h2>
            </div>
          </div>
        ))}
      </div>

      {/* --- MONITORING SECTION --- */}
      <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
              <div>
                  <h2 className="text-xl font-bold text-slate-800 mb-1">Monitoring Penilaian</h2>
                  <p className="text-slate-500 text-sm">Pantau kelengkapan nilai Intrakurikuler dan Kokurikuler siswa.</p>
              </div>
              
              <div className="bg-white p-1 rounded-lg border border-slate-300 flex items-center shadow-sm">
                  <div className="px-3 text-slate-500"><Filter size={16}/></div>
                  <select 
                      className="p-2 bg-transparent outline-none text-sm font-medium text-slate-700 min-w-[200px]"
                      value={filterClassId}
                      onChange={e => setFilterClassId(e.target.value)}
                  >
                      <option value="">Semua Kelas</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
              </div>
          </div>

          {/* SUMMARY CHARTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <SummaryPieChart 
                  title={`Status Intrakurikuler ${filterClassId ? '(Kelas Terpilih)' : '(Semua Kelas)'}`}
                  data={getChartData('intra')}
                  icon={<BookOpen size={20} className="text-orange-500"/>}
              />
              <SummaryPieChart 
                  title={`Status Kokurikuler ${filterClassId ? '(Kelas Terpilih)' : '(Semua Kelas)'}`}
                  data={getChartData('p5')}
                  icon={<Star size={20} className="text-purple-500"/>}
              />
          </div>

          {/* DETAIL TABLE */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2"><Users size={18}/> Detail Siswa</h3>
                  <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-md">{monitoringData.length} Siswa</span>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b text-slate-600 uppercase text-xs tracking-wider">
                          <tr>
                              <th className="p-4 w-12 text-center">No</th>
                              <th className="p-4">Identitas Siswa</th>
                              <th className="p-4">Kelas</th>
                              <th className="p-4">Penilaian Intrakurikuler</th>
                              <th className="p-4">Penilaian Kokurikuler</th>
                              <th className="p-4 text-center">Aksi Cepat</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {monitoringData.length > 0 ? monitoringData.map((data, idx) => (
                              <tr key={data.studentId} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-4 text-center font-medium text-slate-500">{idx + 1}</td>
                                  <td className="p-4">
                                      <div className="font-bold text-slate-800">{data.name}</div>
                                      <div className="text-xs text-slate-400 font-mono">{data.nisn}</div>
                                  </td>
                                  <td className="p-4 text-slate-600">{data.className}</td>
                                  
                                  {/* Intra Status */}
                                  <td className="p-4">
                                      <StatusBadge status={data.intra.status} filled={data.intra.filled} total={data.intra.total} />
                                  </td>

                                  {/* P5 Status */}
                                  <td className="p-4">
                                      <StatusBadge status={data.p5.status} filled={data.p5.filled} total={data.p5.total} />
                                  </td>

                                  {/* Action Buttons */}
                                  <td className="p-4">
                                      <div className="flex justify-center gap-2">
                                          <button 
                                              onClick={() => handleNavigateInput('/nilai', data.classId, data.studentId)}
                                              className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 hover:shadow-sm transition-all border border-blue-200 group relative"
                                              title="Input Nilai Intra"
                                          >
                                              <PenTool size={16} />
                                              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">Input Intra</span>
                                          </button>
                                          <button 
                                              onClick={() => handleNavigateInput('/nilai-p5', data.classId, data.studentId)}
                                              className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 hover:shadow-sm transition-all border border-purple-200 group relative"
                                              title="Input Nilai Kokurikuler"
                                          >
                                              <Star size={16} />
                                              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">Input Kokurikuler</span>
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          )) : (
                              <tr>
                                  <td colSpan={6} className="p-8 text-center text-slate-400">
                                      Tidak ada data siswa yang ditampilkan.
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;