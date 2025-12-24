import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { AppState, ClassData, Student, LearningObjective, Assessment, CategoryResult, SchoolSettings, P5Criteria, P5Assessment, Reflection, ReflectionQuestion, ReflectionAnswer, StudentNote, AttendanceData, User, UserRole } from '../types';
import { INITIAL_SETTINGS } from '../constants';
import { sheetService } from '../services/sheetService';

const MOCK_DATA: AppState = {
  user: null,
  classes: [],
  students: [],
  tps: [],
  assessments: [],
  categoryResults: [],
  settings: INITIAL_SETTINGS,
  p5Criteria: [],
  p5Assessments: [],
  reflections: [],
  reflectionQuestions: [],
  reflectionAnswers: [],
  notes: [],
  attendance: []
};

interface AppContextType extends AppState {
  isLoading: boolean;
  isOnline: boolean;
  refreshData: () => Promise<void>;
  login: (username: string, pass: string) => boolean;
  logout: () => void;
  confirmAction: (message: string, title?: string, confirmText?: string, variant?: 'danger' | 'primary' | 'logout') => Promise<boolean>;
  isConfirmModalOpen: boolean;
  confirmModalMessage: string;
  confirmModalTitle: string;
  confirmModalBtnText: string;
  confirmModalVariant: 'danger' | 'primary' | 'logout';
  handleConfirmModalConfirm: () => void;
  handleConfirmModalCancel: () => void;
  addClass: (data: ClassData) => Promise<void>;
  updateClass: (data: ClassData) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  addStudent: (data: Student) => Promise<void>;
  updateStudent: (data: Student) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  addTp: (data: LearningObjective) => Promise<void>;
  updateTp: (data: LearningObjective) => Promise<void>;
  deleteTp: (id: string) => Promise<void>;
  upsertAssessment: (data: Assessment) => Promise<void>;
  upsertCategoryResult: (data: CategoryResult) => Promise<void>;
  setSettings: (data: SchoolSettings) => Promise<void>;
  addP5Criteria: (data: P5Criteria) => Promise<void>;
  updateP5Criteria: (data: P5Criteria) => Promise<void>;
  deleteP5Criteria: (id: string) => Promise<void>;
  upsertP5Assessment: (data: P5Assessment) => Promise<void>;
  addReflection: (data: Reflection) => Promise<void>;
  updateReflection: (data: Reflection) => Promise<void>;
  deleteReflection: (id: string) => Promise<void>;
  addReflectionQuestion: (data: ReflectionQuestion) => Promise<void>;
  deleteReflectionQuestion: (id: string) => Promise<void>;
  upsertReflectionAnswer: (data: ReflectionAnswer) => Promise<void>;
  upsertNote: (data: StudentNote) => Promise<void>;
  upsertAttendance: (data: AttendanceData) => Promise<void>;
  handleBackup: () => void;
  handleRestore: (file: File) => Promise<void>;
  handleResetSystem: (keepTPs: boolean) => Promise<void>;
  cleanupOrphanData: () => Promise<void>;
  clearClassIntraData: (classId: string, category: string) => Promise<void>;
  clearClassP5Data: (classId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(MOCK_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const isOnline = sheetService.isConnected();
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalTitle, setConfirmModalTitle] = useState('Konfirmasi Hapus');
  const [confirmModalBtnText, setConfirmModalBtnText] = useState('Ya, Hapus Data');
  const [confirmModalVariant, setConfirmModalVariant] = useState<'danger' | 'primary' | 'logout'>('danger');
  const confirmPromise = useRef<{ resolve: (value: boolean) => void } | null>(null);

  const confirmAction = useCallback((message: string, title: string = "Konfirmasi Hapus", confirmText: string = "Ya, Hapus Data", variant: 'danger' | 'primary' | 'logout' = 'danger'): Promise<boolean> => {
    setIsConfirmModalOpen(true); setConfirmModalMessage(message); setConfirmModalTitle(title); setConfirmModalBtnText(confirmText); setConfirmModalVariant(variant);
    return new Promise((resolve) => { confirmPromise.current = { resolve }; });
  }, []);

  const handleConfirmModalConfirm = () => { setIsConfirmModalOpen(false); if (confirmPromise.current) { confirmPromise.current.resolve(true); confirmPromise.current = null; } };
  const handleConfirmModalCancel = () => { setIsConfirmModalOpen(false); if (confirmPromise.current) { confirmPromise.current.resolve(false); confirmPromise.current = null; } };

  useEffect(() => { const savedUser = localStorage.getItem('appUser'); if (savedUser) setState(prev => ({ ...prev, user: JSON.parse(savedUser) })); }, []);
  useEffect(() => { if (isOnline) sheetService.fetchSettings().then(s => { if (s) setState(prev => ({ ...prev, settings: s })); }); }, [isOnline]);
  useEffect(() => { if (state.user) { if (isOnline) refreshData(); else { const saved = localStorage.getItem('raporPaudData'); if (saved) { const parsed = JSON.parse(saved); setState(prev => ({ ...parsed, user: prev.user })); } } } }, [isOnline, state.user?.username]);
  useEffect(() => { if (state.user) localStorage.setItem('raporPaudData', JSON.stringify(state)); }, [state]);

  const login = (u: string, p: string): boolean => {
      if ((u === 'admin' && p === 'admin') || (u === 'guru' && p === 'guru') || (u === 'ortu' && p === 'ortu')) {
          const role: UserRole = u === 'admin' ? 'admin' : u === 'guru' ? 'guru' : 'orangtua';
          const name = u === 'admin' ? 'Administrator' : u === 'guru' ? 'Guru Kelas' : 'Orang Tua';
          const user: User = { username: u, name, role };
          setState(prev => ({ ...prev, user }));
          localStorage.setItem('appUser', JSON.stringify(user));
          return true;
      }
      return false;
  };

  const logout = () => { setState(prev => ({ ...prev, user: null })); localStorage.removeItem('appUser'); };

  const refreshData = async () => {
    if (!isOnline) return;
    setIsLoading(true);
    const data = await sheetService.fetchAllData();
    if (data) {
      const normalizedData: AppState = {
          ...data,
          user: state.user,
          classes: (data.classes || []).map(c => ({...c, id: String(c.id)})),
          students: (data.students || []).map(s => ({...s, id: String(s.id), classId: String(s.classId)})),
          tps: (data.tps || []).map(t => ({...t, id: String(t.id), classId: String(t.classId)})),
          assessments: (data.assessments || []).map(a => ({...a, id: String(a.id), studentId: String(a.studentId), tpId: String(a.tpId)})),
          categoryResults: (data.categoryResults || []).map(a => ({...a, id: String(a.id), studentId: String(a.studentId)})),
          p5Criteria: (data.p5Criteria || []).map(x => ({...x, id: String(x.id), classId: String(x.classId || '')})),
          p5Assessments: (data.p5Assessments || []).map(x => ({...x, id: String(x.id), studentId: String(x.studentId), criteriaId: String(x.criteriaId)})),
          reflections: (data.reflections || []).map(x => ({...x, id: String(x.id), studentId: String(x.studentId)})),
          reflectionQuestions: (data.reflectionQuestions || []).map(x => ({...x, id: String(x.id), classId: String(x.classId)})),
          reflectionAnswers: (data.reflectionAnswers || []).map(x => ({...x, id: String(x.id), questionId: String(x.questionId), studentId: String(x.studentId)})),
          notes: (data.notes || []).map(x => ({...x, id: String(x.id), studentId: String(x.studentId)})),
          attendance: (data.attendance || []).map(x => ({...x, id: String(x.id), studentId: String(x.studentId)})),
          settings: data.settings || INITIAL_SETTINGS
      };
      setState(normalizedData);
    }
    setIsLoading(false);
  };

  const clearClassIntraData = async (classId: string, category: string) => {
      setIsLoading(true);
      try {
          const studentIdsInClass = new Set(state.students.filter(s => String(s.classId) === String(classId)).map(s => s.id));
          const assessmentsToDelete = state.assessments.filter(a => studentIdsInClass.has(a.studentId) && state.tps.find(t => t.id === a.tpId)?.category === category).map(a => a.id);
          const resultsToDelete = state.categoryResults.filter(r => studentIdsInClass.has(r.studentId) && r.category === category).map(r => r.id);

          if (assessmentsToDelete.length > 0) await sheetService.batchDelete('assessments', assessmentsToDelete);
          if (resultsToDelete.length > 0) await sheetService.batchDelete('categoryResults', resultsToDelete);

          await refreshData();
      } catch (e: any) {
          alert("Gagal reset data: " + e.message);
      } finally {
          setIsLoading(false);
      }
  };

  const clearClassP5Data = async (classId: string) => {
      setIsLoading(true);
      try {
          const studentIdsInClass = new Set(state.students.filter(s => String(s.classId) === String(classId)).map(s => s.id));
          const assessmentsToDelete = state.p5Assessments.filter(a => studentIdsInClass.has(a.studentId)).map(a => a.id);

          if (assessmentsToDelete.length > 0) await sheetService.batchDelete('p5Assessments', assessmentsToDelete);

          await refreshData();
      } catch (e: any) {
          alert("Gagal reset data: " + e.message);
      } finally {
          setIsLoading(false);
      }
  };

  const cleanupOrphanData = async () => {
      setIsLoading(true);
      try {
          const classIds = new Set(state.classes.map(c => c.id));
          const studentIds = new Set(state.students.map(s => s.id));
          const tpIds = new Set(state.tps.map(t => t.id));
          const p5CritIds = new Set(state.p5Criteria.map(c => c.id));
          const qIds = new Set(state.reflectionQuestions.map(q => q.id));

          const orphans: Record<string, string[]> = {
              students: state.students.filter(s => !classIds.has(s.classId)).map(s => s.id),
              tps: state.tps.filter(t => !classIds.has(t.classId)).map(t => t.id),
              p5Criteria: state.p5Criteria.filter(c => !classIds.has(c.classId)).map(c => c.id),
              reflectionQuestions: state.reflectionQuestions.filter(q => !classIds.has(q.classId)).map(q => q.id),
              assessments: state.assessments.filter(a => !studentIds.has(a.studentId) || !tpIds.has(a.tpId)).map(a => a.id),
              categoryResults: state.categoryResults.filter(r => !studentIds.has(r.studentId)).map(r => r.id),
              p5Assessments: state.p5Assessments.filter(a => !studentIds.has(a.studentId) || !p5CritIds.has(a.criteriaId)).map(a => a.id),
              notes: state.notes.filter(n => !studentIds.has(n.studentId)).map(n => n.id),
              attendance: state.attendance.filter(a => !studentIds.has(a.studentId)).map(a => a.id),
              reflectionAnswers: state.reflectionAnswers.filter(a => !studentIds.has(a.studentId) || !qIds.has(a.questionId)).map(a => a.id)
          };

          const totalOrphans = Object.values(orphans).reduce((acc, curr) => acc + curr.length, 0);
          if (totalOrphans === 0) { alert("Database sudah bersih. Tidak ditemukan data yatim."); return; }

          const confirm = await confirmAction(`Ditemukan ${totalOrphans} data yatim (tidak memiliki referensi yang valid). Apakah Anda ingin menghapusnya untuk membersihkan database?`, "Pembersihan Database", "Ya, Bersihkan");
          if (!confirm) return;

          for (const [collection, ids] of Object.entries(orphans)) {
              if (ids.length > 0) await sheetService.batchDelete(collection, ids);
          }

          alert("Pembersihan selesai!");
          await refreshData();
      } catch (e: any) {
          alert("Gagal melakukan pembersihan: " + e.message);
      } finally {
          setIsLoading(false);
      }
  };

  const handleAsyncAction = async (apiCall: () => Promise<any>, localUpdate: () => void) => {
    localUpdate(); if (isOnline) { const res = await apiCall(); if (res.status === 'error') alert(`Error: ${res.message}`); }
  };

  const handleBackup = () => {
      const jsonString = JSON.stringify(state, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Backup_Rapor_PAUD_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
  };

  const handleRestore = async (file: File) => {
      setIsLoading(true);
      try {
          const text = await file.text(); const data = JSON.parse(text);
          if (isOnline) { const res = await sheetService.restoreDatabase(data); if (res.status === 'error') throw new Error(res.message); }
          setState(prev => ({...data, user: prev.user})); alert("Restored!"); await refreshData();
      } catch (e: any) { alert("Restore Error: " + e.message); } finally { setIsLoading(false); }
  };

  const handleResetSystem = async (keepTPs: boolean) => {
      setIsLoading(true);
      try {
          if (isOnline) { const res = await sheetService.clearDatabase(keepTPs); if (res.status === 'error') throw new Error(res.message); }
          setState(prev => ({ ...MOCK_DATA, user: prev.user, settings: prev.settings, tps: keepTPs ? prev.tps : [] }));
          alert("Sistem direset!"); await refreshData();
      } catch (e: any) { alert("Reset Error: " + e.message); } finally { setIsLoading(false); }
  };

  const addClass = async (d: ClassData) => { const dStr = { ...d, id: String(d.id) }; await handleAsyncAction(() => sheetService.create('classes', dStr), () => setState(prev => ({ ...prev, classes: [...prev.classes, dStr] }))); };
  const updateClass = async (d: ClassData) => { const dStr = { ...d, id: String(d.id) }; await handleAsyncAction(() => sheetService.update('classes', dStr), () => setState(prev => ({ ...prev, classes: prev.classes.map(i => i.id === dStr.id ? dStr : i) }))); };
  const deleteClass = async (id: string) => { await handleAsyncAction(() => sheetService.delete('classes', id), () => setState(prev => ({ ...prev, classes: prev.classes.filter(i => i.id !== id) }))); };

  const addStudent = async (d: Student) => { const dStr = { ...d, id: String(d.id), classId: String(d.classId) }; await handleAsyncAction(() => sheetService.create('students', dStr), () => setState(prev => ({ ...prev, students: [...prev.students, dStr] }))); };
  const updateStudent = async (d: Student) => { const dStr = { ...d, id: String(d.id), classId: String(d.classId) }; await handleAsyncAction(() => sheetService.update('students', dStr), () => setState(prev => ({ ...prev, students: prev.students.map(i => i.id === dStr.id ? dStr : i) }))); };
  const deleteStudent = async (id: string) => { await handleAsyncAction(() => sheetService.delete('students', id), () => setState(prev => ({ ...prev, students: prev.students.filter(i => i.id !== id) }))); };

  const addTp = async (d: LearningObjective) => { const dStr = { ...d, id: String(d.id), classId: String(d.classId) }; await handleAsyncAction(() => sheetService.create('TPs', dStr), () => setState(prev => ({ ...prev, tps: [...prev.tps, dStr] }))); };
  const updateTp = async (d: LearningObjective) => { const dStr = { ...d, id: String(d.id), classId: String(d.classId) }; await handleAsyncAction(() => sheetService.update('TPs', dStr), () => setState(prev => ({ ...prev, tps: prev.tps.map(i => i.id === dStr.id ? dStr : i) }))); };
  const deleteTp = async (id: string) => { await handleAsyncAction(() => sheetService.delete('TPs', id), () => setState(prev => ({ ...prev, tps: prev.tps.filter(i => i.id !== id) }))); };

  const upsertAssessment = async (d: Assessment) => {
    const dStr = { ...d, id: String(d.id), studentId: String(d.studentId), tpId: String(d.tpId) };
    await handleAsyncAction(() => {
        const exists = state.assessments.find(a => String(a.studentId) === dStr.studentId && String(a.tpId) === dStr.tpId);
        return exists ? sheetService.update('assessments', dStr) : sheetService.create('assessments', dStr);
    }, () => {
        setState(prev => {
            const idx = prev.assessments.findIndex(a => String(a.studentId) === dStr.studentId && String(a.tpId) === dStr.tpId);
            const newArr = [...prev.assessments];
            if (idx >= 0) newArr[idx] = dStr; else newArr.push(dStr);
            return { ...prev, assessments: newArr };
        });
    });
  };

  const upsertCategoryResult = async (d: CategoryResult) => {
    const dStr = { ...d, id: String(d.id), studentId: String(d.studentId) };
    await handleAsyncAction(() => {
        const exists = state.categoryResults.find(a => String(a.studentId) === dStr.studentId && a.category === dStr.category);
        return exists ? sheetService.update('categoryResults', dStr) : sheetService.create('categoryResults', dStr);
    }, () => {
        setState(prev => {
            const idx = prev.categoryResults.findIndex(a => String(a.studentId) === dStr.studentId && a.category === dStr.category);
            const newArr = [...prev.categoryResults];
            if (idx >= 0) newArr[idx] = dStr; else newArr.push(dStr);
            return { ...prev, categoryResults: newArr };
        });
    });
  };
  
  const setSettings = async (settings: SchoolSettings) => { await handleAsyncAction(() => sheetService.saveSettings(settings), () => setState(prev => ({ ...prev, settings }))); };

  const addP5Criteria = async (d: P5Criteria) => { const dStr = { ...d, id: String(d.id), classId: String(d.classId) }; await handleAsyncAction(() => sheetService.create('p5Criteria', dStr), () => setState(prev => ({ ...prev, p5Criteria: [...prev.p5Criteria, dStr] }))); };
  const updateP5Criteria = async (d: P5Criteria) => { const dStr = { ...d, id: String(d.id), classId: String(d.classId) }; await handleAsyncAction(() => sheetService.update('p5Criteria', dStr), () => setState(prev => ({ ...prev, p5Criteria: prev.p5Criteria.map(i => i.id === dStr.id ? dStr : i) }))); };
  const deleteP5Criteria = async (id: string) => { await handleAsyncAction(() => sheetService.delete('p5Criteria', id), () => setState(prev => ({ ...prev, p5Criteria: prev.p5Criteria.filter(i => i.id !== id) }))); };

  const upsertP5Assessment = async (d: P5Assessment) => {
    const dStr = { ...d, id: String(d.id), studentId: String(d.studentId), criteriaId: String(d.criteriaId) };
    await handleAsyncAction(() => {
        const exists = state.p5Assessments.find(a => String(a.studentId) === dStr.studentId && String(a.criteriaId) === dStr.criteriaId);
        return exists ? sheetService.update('p5Assessments', dStr) : sheetService.create('p5Assessments', dStr);
    }, () => {
        setState(prev => {
            const idx = prev.p5Assessments.findIndex(a => String(a.studentId) === dStr.studentId && String(a.criteriaId) === dStr.criteriaId);
            const newArr = [...prev.p5Assessments];
            if (idx >= 0) newArr[idx] = dStr; else newArr.push(dStr);
            return { ...prev, p5Assessments: newArr };
        });
    });
  };

  const addReflection = async (d: Reflection) => { const dStr = { ...d, id: String(d.id), studentId: String(d.studentId) }; await handleAsyncAction(() => sheetService.create('reflections', dStr), () => setState(prev => ({ ...prev, reflections: [...prev.reflections, dStr] }))); };
  const updateReflection = async (d: Reflection) => { const dStr = { ...d, id: String(d.id), studentId: String(d.studentId) }; await handleAsyncAction(() => sheetService.update('reflections', dStr), () => setState(prev => ({ ...prev, reflections: prev.reflections.map(i => i.id === dStr.id ? dStr : i) }))); };
  const deleteReflection = async (id: string) => { await handleAsyncAction(() => sheetService.delete('reflections', id), () => setState(prev => ({ ...prev, reflections: prev.reflections.filter(i => i.id !== id) }))); };
  const addReflectionQuestion = async (d: ReflectionQuestion) => { const dStr = { ...d, id: String(d.id), classId: String(d.classId) }; await handleAsyncAction(() => sheetService.create('reflectionQuestions', dStr), () => setState(prev => ({ ...prev, reflectionQuestions: [...prev.reflectionQuestions, dStr] }))); };
  const deleteReflectionQuestion = async (id: string) => { await handleAsyncAction(() => sheetService.delete('reflectionQuestions', id), () => setState(prev => ({ ...prev, reflectionQuestions: prev.reflectionQuestions.filter(i => i.id !== id) }))); };

  const upsertReflectionAnswer = async (d: ReflectionAnswer) => {
    const dStr = { ...d, id: String(d.id), questionId: String(d.questionId), studentId: String(d.studentId) };
    await handleAsyncAction(() => {
        const exists = state.reflectionAnswers.find(a => String(a.questionId) === dStr.questionId && String(a.studentId) === dStr.studentId);
        return exists ? sheetService.update('reflectionAnswers', dStr) : sheetService.create('reflectionAnswers', dStr);
    }, () => {
        setState(prev => {
            const idx = prev.reflectionAnswers.findIndex(a => String(a.questionId) === dStr.questionId && String(a.studentId) === dStr.studentId);
            const newArr = [...prev.reflectionAnswers];
            if (idx >= 0) newArr[idx] = dStr; else newArr.push(dStr);
            return { ...prev, reflectionAnswers: newArr };
        });
    });
  };

  const upsertNote = async (d: StudentNote) => {
    const dStr = { ...d, id: String(d.id), studentId: String(d.studentId) };
    await handleAsyncAction(() => {
        const exists = state.notes.find(a => String(a.studentId) === dStr.studentId);
        return exists ? sheetService.update('notes', dStr) : sheetService.create('notes', dStr);
    }, () => {
        setState(prev => {
            const idx = prev.notes.findIndex(a => String(a.studentId) === dStr.studentId);
            const newArr = [...prev.notes];
            if (idx >= 0) newArr[idx] = dStr; else newArr.push(dStr);
            return { ...prev, notes: newArr };
        });
    });
  };

  const upsertAttendance = async (d: AttendanceData) => {
    const dStr = { ...d, id: String(d.id), studentId: String(d.studentId) };
    await handleAsyncAction(() => {
        const exists = state.attendance.find(a => String(a.studentId) === dStr.studentId);
        return exists ? sheetService.update('attendance', dStr) : sheetService.create('attendance', dStr);
    }, () => {
        setState(prev => {
            const idx = prev.attendance.findIndex(a => String(a.studentId) === dStr.studentId);
            const newArr = [...prev.attendance];
            if (idx >= 0) newArr[idx] = dStr; else newArr.push(dStr);
            return { ...prev, attendance: newArr };
        });
    });
  };

  return (
    <AppContext.Provider value={{
      ...state, isLoading, isOnline, refreshData, login, logout, confirmAction, isConfirmModalOpen, confirmModalMessage, confirmModalTitle, confirmModalBtnText, confirmModalVariant, handleConfirmModalConfirm, handleConfirmModalCancel,
      addClass, updateClass, deleteClass, addStudent, updateStudent, deleteStudent, addTp, updateTp, deleteTp, upsertAssessment, upsertCategoryResult, setSettings,
      addP5Criteria, updateP5Criteria, deleteP5Criteria, upsertP5Assessment, addReflection, updateReflection, deleteReflection, addReflectionQuestion, deleteReflectionQuestion, upsertReflectionAnswer,
      upsertNote, upsertAttendance, handleBackup, handleRestore, handleResetSystem, cleanupOrphanData, clearClassIntraData, clearClassP5Data
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
