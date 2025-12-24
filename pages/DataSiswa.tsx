import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
import { Trash2, Edit2, Plus, X, Camera, User, Download, Upload, FileSpreadsheet, Filter, Loader2, Users, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { sheetService } from '../services/sheetService';

const DataSiswa: React.FC = () => {
  const { students, classes, addStudent, updateStudent, deleteStudent, confirmAction, isOnline } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Student>>({});
  
  // -- STATE FILTER, SEARCH, & PAGINATION --
  const [filterClassId, setFilterClassId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;
  
  // State upload
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // -- FILTERING LOGIC --
  const filteredStudents = students.filter(student => {
      // 1. Filter by Class
      if (filterClassId && String(student.classId) !== String(filterClassId)) return false;
      
      // Jika kelas belum dipilih, jangan tampilkan apa-apa (opsional, sesuai UX sebelumnya)
      if (!filterClassId) return false;

      // 2. Filter by Search Term
      if (searchTerm) {
          const lowerTerm = searchTerm.toLowerCase();
          return (
              student.name.toLowerCase().includes(lowerTerm) ||
              student.nisn.includes(lowerTerm)
          );
      }
      return true;
  });

  // -- PAGINATION LOGIC --
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );

  // Reset page when filter changes
  useEffect(() => {
      setCurrentPage(1);
  }, [filterClassId, searchTerm]);

  const openModal = (student?: Student) => {
    if (student) {
      setEditingId(String(student.id));
      setFormData(student);
    } else {
      setEditingId(null);
      setFormData({ 
          gender: 'L', 
          classId: filterClassId || classes[0]?.id || '', 
          height: 0, 
          weight: 0 
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.nisn || !formData.classId) {
        alert("Nama, NISN, dan Kelas wajib diisi");
        return;
    }

    if (editingId) {
      updateStudent({ ...formData, id: editingId } as Student);
    } else {
      addStudent({ ...formData, id: Date.now().toString() } as Student);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    const studentName = students.find(s => s.id === id)?.name || "siswa ini";
    const isConfirmed = await confirmAction(`Yakin ingin menghapus siswa "${studentName}" ini? Data yang dihapus tidak dapat dikembalikan.`);
    
    if (isConfirmed) {
        deleteStudent(String(id));
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) { alert("Ukuran foto maksimal 2MB"); return; }
        
        setIsUploading(true);

        // 1. Resize Image Client-Side using Canvas
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxSize = 500; // Resize to max 500px width/height to save even more space
                let width = img.width; let height = img.height;
                
                if (width > height) { 
                    if (width > maxSize) { height *= maxSize / width; width = maxSize; } 
                } else { 
                    if (height > maxSize) { width *= maxSize / height; height = maxSize; } 
                }
                
                canvas.width = width; canvas.height = height;
                ctx?.drawImage(img, 0, 0, width, height);

                // Pre-generate Base64 for fallback
                const base64Url = canvas.toDataURL('image/jpeg', 0.7);

                // 2. Decide: Upload to Storage OR Keep as Base64 (Offline Mode / Fallback)
                if (isOnline) {
                    // --- ONLINE: Upload Blob to Supabase Storage ---
                    canvas.toBlob(async (blob) => {
                        if (blob) {
                            const publicUrl = await sheetService.uploadImage(blob, 'students');
                            if (publicUrl) {
                                setFormData(prev => ({ ...prev, photoUrl: publicUrl }));
                            } else {
                                // Fallback to Base64 if upload fails (e.g. RLS Policy Error)
                                console.warn("Upload failed (RLS or Network), using Base64 fallback.");
                                setFormData(prev => ({ ...prev, photoUrl: base64Url }));
                            }
                            setIsUploading(false);
                        }
                    }, 'image/jpeg', 0.8);
                } else {
                    // --- OFFLINE: Fallback to Base64 ---
                    setFormData(prev => ({ ...prev, photoUrl: base64Url }));
                    setIsUploading(false);
                }
            };
            if (event.target?.result) img.src = event.target.result as string;
        };
        reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  const handleExportXLSX = () => {
    const headers = ["NISN", "Nama Siswa", "Kelas", "Tempat Lahir", "Tanggal Lahir (YYYY-MM-DD)", "Agama", "Anak Ke", "Jenis Kelamin (L/P)", "Tinggi Badan (CM)", "Berat Badan (KG)", "Nama Ayah", "Pekerjaan Ayah", "Nama Ibu", "Pekerjaan Ibu", "No Telp", "Alamat"];
    const dataToExport = (filterClassId ? filteredStudents : students).map(s => {
        const className = classes.find(c => c.id === s.classId)?.name || "";
        return [s.nisn, s.name, className, s.pob, s.dob, s.religion, s.childOrder, s.gender, s.height || 0, s.weight || 0, s.fatherName, s.fatherJob, s.motherName, s.motherJob, s.phone, s.address];
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataToExport]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
    XLSX.writeFile(wb, `Data_Siswa_Rapor_PAUD_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleImportClick = () => importInputRef.current?.click();
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      if (json.length < 2) { alert("File Excel kosong atau format tidak sesuai."); return; }
      const headers = json[0]; const dataRows = json.slice(1);
      let successCount = 0;
      dataRows.forEach((row: any[]) => {
        if (row.length === 0 || !row[headers.indexOf("Nama Siswa")]) return;
        const studentDataMap: { [key: string]: any } = {};
        headers.forEach((header: string, index: number) => { studentDataMap[header] = row[index]; });
        const className = studentDataMap["Kelas"];
        const matchedClass = classes.find(c => c.name.toLowerCase() === (className || '').toLowerCase());
        const classId = matchedClass ? matchedClass.id : (classes[0]?.id || '');
        const newStudent: Student = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            nisn: String(studentDataMap["NISN"] || '-'), name: String(studentDataMap["Nama Siswa"] || 'Tanpa Nama'), classId: classId, pob: String(studentDataMap["Tempat Lahir"] || ''), dob: String(studentDataMap["Tanggal Lahir (YYYY-MM-DD)"] || ''), religion: String(studentDataMap["Agama"] || ''), childOrder: Number(studentDataMap["Anak Ke"]) || 1,
            gender: (String(studentDataMap["Jenis Kelamin (L/P)"]).toUpperCase() === 'P' || String(studentDataMap["Jenis Kelamin (L/P)"]).toLowerCase() === 'perempuan') ? 'P' : 'L', height: Number(studentDataMap["Tinggi Badan (CM)"]) || 0, weight: Number(studentDataMap["Berat Badan (KG)"]) || 0, fatherName: String(studentDataMap["Nama Ayah"] || ''), fatherJob: String(studentDataMap["Pekerjaan Ayah"] || ''), motherName: String(studentDataMap["Nama Ibu"] || ''), motherJob: String(studentDataMap["Pekerjaan Ibu"] || ''), phone: String(studentDataMap["No Telp"] || ''), address: String(studentDataMap["Alamat"] || ''), photoUrl: undefined 
        };
        addStudent(newStudent); successCount++;
      });
      alert(`Berhasil mengimport ${successCount} data siswa.`); if (importInputRef.current) importInputRef.current.value = ''; 
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div>
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <div>
            <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-slate-800">Data Siswa</h1>
                {filterClassId && (
                  <div className="bg-teal-100 border border-teal-200 text-teal-800 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1 animate-in fade-in">
                    <Users size={12} />
                    {filteredStudents.length} Siswa
                  </div>
                )}
            </div>
            
            <div className="flex flex-col md:flex-row gap-3">
                {/* FILTER KELAS */}
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-slate-500" />
                    <select className="p-2 border border-slate-300 rounded-lg text-slate-800 bg-white min-w-[200px] focus:ring-2 focus:ring-teal-500 outline-none shadow-sm" value={filterClassId} onChange={(e) => setFilterClassId(e.target.value)}>
                        <option value="">-- Pilih Kelas --</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                {/* SEARCH BAR */}
                {filterClassId && (
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Cari Nama / NISN..." 
                            className="pl-9 p-2 border border-slate-300 rounded-lg text-slate-800 bg-white min-w-[200px] focus:ring-2 focus:ring-teal-500 outline-none shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                )}
            </div>
        </div>

        <div className="flex flex-wrap gap-2">
             <button type="button" onClick={() => openModal()} className="bg-teal-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-700 text-sm shadow-sm"><Plus size={16} /> Tambah Siswa</button>
             <button type="button" onClick={handleExportXLSX} className="bg-indigo-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 text-sm shadow-sm"><FileSpreadsheet size={16} /> Export XLS</button>
             <input type="file" ref={importInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleImportFile} />
             <button type="button" onClick={handleImportClick} className="bg-orange-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-orange-700 text-sm shadow-sm"><Upload size={16} /> Import XLS</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[400px]">
        <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm min-w-max">
            <thead className="bg-slate-50 border-b">
                <tr>
                <th className="p-4 font-semibold text-slate-600 text-center w-16">No</th>
                <th className="p-4 font-semibold text-slate-600 w-20 text-center">Foto</th>
                <th className="p-4 font-semibold text-slate-600">NISN</th>
                <th className="p-4 font-semibold text-slate-600">Nama Siswa</th>
                <th className="p-4 font-semibold text-slate-600">Kelas</th>
                <th className="p-4 font-semibold text-slate-600 text-right">Aksi</th>
                </tr>
            </thead>
            <tbody className="text-slate-700">
                {!filterClassId ? (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-400">Silakan Pilih Kelas Terlebih Dahulu</td></tr>
                ) : paginatedStudents.length === 0 ? (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-400">
                        {searchTerm ? 'Tidak ditemukan data siswa dengan kata kunci tersebut.' : 'Belum ada data siswa di kelas ini.'}
                    </td></tr>
                ) : (
                    paginatedStudents.map((student, index) => {
                        const cls = classes.find(c => c.id === student.classId);
                        const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                        return (
                            <tr key={student.id} className="border-b hover:bg-slate-50 last:border-b-0">
                                <td className="p-4 text-center text-slate-500">{rowNumber}</td>
                                <td className="p-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center border border-slate-300 mx-auto">
                                        {student.photoUrl ? (
                                            <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={20} className="text-slate-400" />
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 font-mono text-xs">{student.nisn}</td>
                                <td className="p-4 font-bold text-slate-800">{student.name}</td>
                                <td className="p-4 text-xs">
                                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 font-medium">
                                        {cls?.name || '-'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => openModal(student)} className="p-2 text-blue-600 hover:bg-blue-50 rounded border border-transparent hover:border-blue-100 transition-colors" title="Edit">
                                            <Edit2 size={16}/>
                                        </button>
                                        <button type="button" onClick={() => handleDelete(String(student.id))} className="p-2 text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-100 transition-colors" title="Hapus">
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })
                )}
            </tbody>
            </table>
        </div>

        {/* PAGINATION CONTROLS */}
        {filterClassId && paginatedStudents.length > 0 && (
            <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
                <div className="text-sm text-slate-500">
                    Menampilkan <span className="font-bold">{((currentPage - 1) * itemsPerPage) + 1}</span> sampai <span className="font-bold">{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</span> dari <span className="font-bold">{filteredStudents.length}</span> data
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${
                                currentPage === page 
                                ? 'bg-teal-600 text-white border border-teal-600' 
                                : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                            }`}
                        >
                            {page}
                        </button>
                    ))}
                    <button 
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 text-slate-800">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold">{editingId ? "Edit Siswa" : "Tambah Siswa Baru"}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-4">
                    <h3 className="font-semibold text-teal-600 border-b pb-1">Foto & Identitas</h3>
                    <div className="flex flex-col items-center p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        <div className="w-32 h-32 rounded-full bg-slate-200 overflow-hidden mb-3 border-2 border-white shadow-sm flex items-center justify-center relative">
                            {isUploading ? (
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
                                    <Loader2 className="animate-spin text-white" size={32} />
                                </div>
                            ) : null}
                            {formData.photoUrl ? <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" /> : <User size={48} className="text-slate-400" />}
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                        <div className="flex gap-2">
                            <button type="button" onClick={triggerFileInput} disabled={isUploading} className="text-sm bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-100 flex items-center gap-2 transition-colors disabled:opacity-50">
                                <Camera size={14} /> {isUploading ? 'Mengupload...' : (formData.photoUrl ? 'Ganti Foto' : 'Upload Foto')}
                            </button>
                            {formData.photoUrl && <button type="button" onClick={() => setFormData(prev => ({ ...prev, photoUrl: undefined }))} className="text-sm bg-red-50 border border-red-200 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-100">Hapus</button>}
                        </div>
                        {isOnline && <p className="text-[10px] text-slate-400 mt-2">Foto akan disimpan di Supabase Storage. Jika gagal, akan disimpan lokal.</p>}
                    </div>
                    <input className="w-full p-2 border rounded text-slate-800 bg-white" placeholder="NISN" value={formData.nisn || ''} onChange={e => setFormData({...formData, nisn: e.target.value})} />
                    <input className="w-full p-2 border rounded text-slate-800 bg-white" placeholder="Nama Lengkap" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <select className="w-full p-2 border rounded text-slate-800 bg-white" value={formData.classId || ''} onChange={e => setFormData({...formData, classId: e.target.value})}>
                        <option value="">Pilih Kelas</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <div className="flex gap-2"><input className="w-full p-2 border rounded text-slate-800 bg-white" placeholder="Tempat Lahir" value={formData.pob || ''} onChange={e => setFormData({...formData, pob: e.target.value})} /><input type="date" className="w-full p-2 border rounded text-slate-800 bg-white" value={formData.dob || ''} onChange={e => setFormData({...formData, dob: e.target.value})} /></div>
                    <div className="flex gap-2 items-center"><div className="w-1/2"><label className="text-xs font-semibold text-slate-500 block mb-1">Jenis Kelamin</label><select className="w-full p-2 border rounded text-slate-800 bg-white" value={formData.gender || 'L'} onChange={e => setFormData({...formData, gender: e.target.value as 'L'|'P'})}><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></div><div className="w-1/2"><label className="text-xs font-semibold text-slate-500 block mb-1">Anak Ke-</label><input type="number" className="w-full p-2 border rounded text-slate-800 bg-white" placeholder="Anak Ke-" value={formData.childOrder || ''} onChange={e => setFormData({...formData, childOrder: Number(e.target.value)})} /></div></div>
                    <div className="flex gap-4 p-3 bg-slate-50 rounded border border-slate-200"><div className="w-1/2"><label className="text-xs font-semibold text-slate-500 block mb-1">Tinggi Badan (cm)</label><input type="number" className="w-full p-2 border rounded text-slate-800 bg-white" value={formData.height || 0} onChange={e => setFormData({...formData, height: Number(e.target.value)})} /></div><div className="w-1/2"><label className="text-xs font-semibold text-slate-500 block mb-1">Berat Badan (kg)</label><input type="number" className="w-full p-2 border rounded text-slate-800 bg-white" value={formData.weight || 0} onChange={e => setFormData({...formData, weight: Number(e.target.value)})} /></div></div>
                    <input className="w-full p-2 border rounded text-slate-800 bg-white" placeholder="Agama" value={formData.religion || ''} onChange={e => setFormData({...formData, religion: e.target.value})} />
               </div>
               <div className="space-y-4">
                    <h3 className="font-semibold text-teal-600 border-b pb-1">Data Orang Tua & Kontak</h3>
                    <input className="w-full p-2 border rounded text-slate-800 bg-white" placeholder="Nama Ayah" value={formData.fatherName || ''} onChange={e => setFormData({...formData, fatherName: e.target.value})} />
                    <input className="w-full p-2 border rounded text-slate-800 bg-white" placeholder="Pekerjaan Ayah" value={formData.fatherJob || ''} onChange={e => setFormData({...formData, fatherJob: e.target.value})} />
                    <input className="w-full p-2 border rounded text-slate-800 bg-white" placeholder="Nama Ibu" value={formData.motherName || ''} onChange={e => setFormData({...formData, motherName: e.target.value})} />
                    <input className="w-full p-2 border rounded text-slate-800 bg-white" placeholder="Pekerjaan Ibu" value={formData.motherJob || ''} onChange={e => setFormData({...formData, motherJob: e.target.value})} />
                    <input className="w-full p-2 border rounded text-slate-800 bg-white" placeholder="No Telp / WA" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    <textarea className="w-full p-2 border rounded text-slate-800 bg-white" placeholder="Alamat Lengkap" rows={4} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
               </div>
            </div>
            <div className="p-6 border-t bg-slate-50 flex justify-end gap-2 rounded-b-xl">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded text-slate-600 hover:bg-slate-200 transition-colors">Batal</button>
                 <button type="button" onClick={handleSave} disabled={isUploading} className="px-4 py-2 rounded bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-50">
                    {isUploading ? 'Tunggu Upload...' : 'Simpan Data'}
                 </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataSiswa;