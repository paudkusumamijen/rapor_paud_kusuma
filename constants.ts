
import { SchoolSettings, TPType } from './types';

const cleanEnv = (val: any) => {
    if (!val) return "";
    const str = String(val).trim();
    if (str === "undefined" || str === "null") return "";
    return str;
};

const viteSbUrl = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_SUPABASE_URL : "";
const viteSbKey = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_SUPABASE_KEY : "";
const viteAiKey = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_API_KEY : "";

const procSbUrl = typeof process !== 'undefined' && process.env ? process.env.REACT_APP_SUPABASE_URL : "";
const procSbKey = typeof process !== 'undefined' && process.env ? process.env.REACT_APP_SUPABASE_KEY : "";
const procAiKey = typeof process !== 'undefined' && process.env ? process.env.REACT_APP_API_KEY : "";

export const SUPABASE_URL = cleanEnv(viteSbUrl || procSbUrl);
export const SUPABASE_KEY = cleanEnv(viteSbKey || procSbKey);
export const GEMINI_API_KEY = cleanEnv(viteAiKey || procAiKey);

export const DEFAULT_LOGO_URL = "https://wohhrumqbuwhfulhrlfy.supabase.co/storage/v1/object/public/images/Logo%20Kusuma-new1.png";

export const TP_CATEGORIES = [
    TPType.QURAN, 
    TPType.HAFALAN, 
    TPType.DINUL_ISLAM,
    TPType.PRAKTIK
];

export const INITIAL_SETTINGS: SchoolSettings = {
  name: "TPA AL-HIDAYAH",
  npsn: "12345678",
  address: "Jl. Masjid No. 1",
  postalCode: "12345",
  village: "Sukamaju",
  district: "Maju Jaya",
  regency: "Jakarta Selatan",
  province: "DKI Jakarta",
  website: "www.tpa-alhidayah.id",
  email: "info@tpa-alhidayah.id",
  headmaster: "Ustadz Abdullah, S.Pd.I",
  teacher: "Ustadzah Aisyah",
  currentClass: "Jilid 1",
  semester: "1 (Ganjil)",
  academicYear: "2024/2025",
  reportPlace: "Jakarta",
  reportDate: new Date().toISOString().split('T')[0],
  logoUrl: DEFAULT_LOGO_URL,
  appLogoUrl: DEFAULT_LOGO_URL, 
  reportLogoUrl: DEFAULT_LOGO_URL, 
  aiProvider: 'groq',
  aiApiKey: "",
  assessmentCategories: TP_CATEGORIES,
  // Default Labels Kokurikuler
  p5Labels: ["MB", "BSH", "SB"],
  labelBerkembang: "MB",
  labelCakap: "BSH",
  labelMahir: "SB"
};

export const LEVEL_LABELS = {
  1: "Mulai Lancar (Perlu Bimbingan)",
  2: "Lancar (Jayyid)",
  3: "Sangat Lancar (Mumtaz)"
};
