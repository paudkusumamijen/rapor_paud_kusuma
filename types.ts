
export enum AssessmentLevel {
  BERKEMBANG = 1,
  CAKAP = 2,
  MAHIR = 3
}

export enum TPType {
  QURAN = 'Al-Qur\'an / Jilid',
  HAFALAN = 'Hafalan Surah & Doa',
  DINUL_ISLAM = 'Dinul Islam (Aqidah & Akhlak)',
  PRAKTIK = 'Praktik Ibadah & Bahasa Arab'
}

export type UserRole = 'admin' | 'guru' | 'orangtua';

export interface User {
  id?: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
}

export interface ClassData {
  id: string;
  name: string;
  teacherName: string;
  nuptk: string;
}

export interface Student {
  id: string;
  nisn: string;
  name: string;
  classId: string;
  pob: string;
  dob: string;
  religion: string;
  childOrder: number;
  gender: 'L' | 'P';
  phone: string;
  fatherName: string;
  motherName: string;
  fatherJob: string;
  motherJob: string;
  address: string;
  photoUrl?: string;
  height?: number;
  weight?: number;
}

export interface LearningObjective {
  id: string;
  classId: string;
  category: string;
  description: string;
  activity: string;
}

export interface Assessment {
  id: string;
  studentId: string;
  tpId: string;
  score: number; // Changed to number to support dynamic levels
  semester: string;
  academicYear: string;
}

export interface CategoryResult {
  id: string;
  studentId: string;
  category: string;
  teacherNote: string;
  generatedDescription: string;
  semester: string;
  academicYear: string;
}

export interface P5Criteria {
  id: string;
  classId: string;
  subDimension: string;
  // Dynamic level descriptions: mapping level index (1-based) to text
  levelDescriptions?: Record<number, string>;
  // Legacy fields (optional support)
  descBerkembang?: string;
  descCakap?: string;
  descMahir?: string;
}

export interface P5Assessment {
  id: string;
  studentId: string;
  criteriaId: string;
  score: number; // Changed to number to support dynamic levels
  teacherNote?: string;
  generatedDescription?: string;
}

export interface Reflection {
  id: string;
  studentId: string;
  question: string;
  answer: string;
}

export interface ReflectionQuestion {
  id: string;
  classId: string;
  question: string;
  active: boolean;
}

export interface ReflectionAnswer {
  id: string;
  questionId: string;
  studentId: string;
  answer: string;
}

export interface StudentNote {
  id: string;
  studentId: string;
  note: string;
}

export interface AttendanceData {
  id: string;
  studentId: string;
  sick: number;
  permission: number;
  alpha: number;
}

export interface SchoolSettings {
  name: string;
  npsn: string;
  address: string;
  postalCode: string;
  village: string;
  district: string;
  regency: string;
  province: string;
  website: string;
  email: string;
  headmaster: string;
  teacher: string;
  currentClass: string;
  semester: string;
  academicYear: string;
  reportDate: string;
  reportPlace: string;
  logoUrl?: string;
  appLogoUrl?: string;
  reportLogoUrl?: string;
  aiProvider?: 'gemini' | 'groq';
  aiApiKey?: string;
  assessmentCategories?: string[];
  // Dynamic P5 Labels (e.g., ["BB", "MB", "BSH", "BSB"])
  p5Labels?: string[];
  // Legacy labels (keeping for compatibility)
  labelBerkembang?: string;
  labelCakap?: string;
  labelMahir?: string;
}

export interface AppState {
  user: User | null;
  classes: ClassData[];
  students: Student[];
  tps: LearningObjective[];
  assessments: Assessment[];
  categoryResults: CategoryResult[];
  settings: SchoolSettings;
  p5Criteria: P5Criteria[];
  p5Assessments: P5Assessment[];
  reflections: Reflection[];
  reflectionQuestions: ReflectionQuestion[];
  reflectionAnswers: ReflectionAnswer[];
  notes: StudentNote[];
  attendance: AttendanceData[];
}

export interface ApiResponse {
  status: 'success' | 'error';
  message?: string;
  data?: any;
}

export type CollectionName = 'classes' | 'students' | 'TPs' | 'assessments' | 'categoryResults' | 'p5Criteria' | 'p5Assessments' | 'reflections' | 'reflectionQuestions' | 'reflectionAnswers' | 'notes' | 'attendance' | 'settings';

export interface ApiPayload {
  collection: CollectionName;
  data?: any;
}
