
import { ApiPayload, ApiResponse, AppState, SchoolSettings } from "../types";
import { SUPABASE_URL, SUPABASE_KEY } from "../constants";
import { createClient } from "@supabase/supabase-js";

let supabase: any = null;

const getSupabaseConfig = () => {
  const envUrl = SUPABASE_URL;
  const envKey = SUPABASE_KEY;
  const localUrl = localStorage.getItem('supabase_url');
  const localKey = localStorage.getItem('supabase_key');
  
  let url = localUrl || envUrl;
  let key = localKey || envKey;

  if (url) {
      url = url.trim();
      if (!url.startsWith('http')) url = `https://${url}`;
      if (url.endsWith('/')) url = url.slice(0, -1);
  }
  return { url, key };
};

export const resetSupabaseClient = () => {
    supabase = null;
};

const initSupabase = () => {
  if (supabase) return supabase;
  const { url, key } = getSupabaseConfig();
  if (url && key && url !== "https://" && key !== "undefined") {
    try {
      supabase = createClient(url, key, {
          auth: { persistSession: false },
          db: { schema: 'public' }
      });
    } catch (e) {
      return null;
    }
  }
  return supabase;
};

const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const toCamelCase = (str: string) => str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

const mapKeys = (obj: any, mapper: (k: string) => string) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(i => mapKeys(i, mapper));
  return Object.keys(obj).reduce((acc, key) => {
    acc[mapper(key)] = mapKeys(obj[key], mapper);
    return acc;
  }, {} as any);
};

const unpackExtendedSettings = (settingsData: any) => {
  if (!settingsData) return null;
  const processed = { ...settingsData };
  if (processed.logoUrl && typeof processed.logoUrl === 'string' && processed.logoUrl.trim().startsWith('{')) {
      try {
          const parsed = JSON.parse(processed.logoUrl);
          processed.logoUrl = parsed.default || ""; 
          processed.appLogoUrl = parsed.app;
          processed.reportLogoUrl = parsed.report;
          if (parsed.categories && Array.isArray(parsed.categories)) {
              processed.assessmentCategories = parsed.categories;
          }
          // Unpack labels
          processed.labelBerkembang = parsed.lb || "MB";
          processed.labelCakap = parsed.lc || "BSH";
          processed.labelMahir = parsed.lm || "SB";
      } catch (e) {}
  }
  return processed;
};

export const sheetService = {
  isConnected: () => {
    const { url, key } = getSupabaseConfig();
    return !!(url && key);
  },

  async fetchSettings(): Promise<SchoolSettings | null> {
    const sb = initSupabase();
    if (!sb) return null;
    try {
      const { data, error } = await sb.from('settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      const camelData = data ? mapKeys(data, toCamelCase) : null;
      return unpackExtendedSettings(camelData);
    } catch (error) {
      return null;
    }
  },

  async fetchAllData(): Promise<AppState | null> {
    const sb = initSupabase();
    if (!sb) return null;
    try {
      const [
          { data: classes }, { data: students }, { data: tps }, 
          { data: assessments }, { data: categoryResults }, 
          { data: p5Criteria }, { data: p5Assessments }, 
          { data: reflections }, { data: reflection_questions }, 
          { data: reflection_answers }, { data: notes }, 
          { data: attendance }, { data: settings }
      ] = await Promise.all([
          sb.from('classes').select('*'), sb.from('students').select('*'), sb.from('tps').select('*'),
          sb.from('assessments').select('*'), sb.from('category_results').select('*'),
          sb.from('p5_criteria').select('*'), sb.from('p5_assessments').select('*'),
          sb.from('reflections').select('*'), sb.from('reflection_questions').select('*'),
          sb.from('reflection_answers').select('*'), sb.from('notes').select('*'),
          sb.from('attendance').select('*'), sb.from('settings').select('*').limit(1).maybeSingle()
      ]);

      return {
          classes: mapKeys(classes || [], toCamelCase),
          students: mapKeys(students || [], toCamelCase),
          tps: mapKeys(tps || [], toCamelCase),
          assessments: mapKeys(assessments || [], toCamelCase),
          categoryResults: mapKeys(categoryResults || [], toCamelCase),
          p5Criteria: mapKeys(p5Criteria || [], toCamelCase),
          p5Assessments: mapKeys(p5Assessments || [], toCamelCase),
          reflections: mapKeys(reflections || [], toCamelCase),
          reflectionQuestions: mapKeys(reflection_questions || [], toCamelCase),
          reflectionAnswers: mapKeys(reflection_answers || [], toCamelCase),
          notes: mapKeys(notes || [], toCamelCase),
          attendance: mapKeys(attendance || [], toCamelCase),
          settings: settings ? unpackExtendedSettings(mapKeys(settings, toCamelCase)) : undefined 
      } as AppState;
    } catch (error: any) {
      return null;
    }
  },

  async create(collection: ApiPayload['collection'], data: any) {
    return this.supabaseOp('insert', collection, data);
  },

  async update(collection: ApiPayload['collection'], data: any) {
    return this.supabaseOp('update', collection, data);
  },

  async delete(collection: ApiPayload['collection'], id: string) {
    return this.supabaseOp('delete', collection, { id });
  },

  // NEW: Batch Delete for Cleanup
  async batchDelete(collection: string, ids: string[]): Promise<ApiResponse> {
      const sb = initSupabase();
      if (!sb || ids.length === 0) return { status: 'success' };
      let tableName = toSnakeCase(collection);
      if (collection === 'TPs') tableName = 'tps';
      try {
          const { error } = await sb.from(tableName).delete().in('id', ids);
          if (error) throw error;
          return { status: 'success' };
      } catch (e: any) {
          return { status: 'error', message: e.message };
      }
  },
  
  async saveSettings(data: any) {
    const payload = { ...data, id: 'global_settings' };
    const extendedPackage = {
        default: data.logoUrl,
        app: data.appLogoUrl,
        report: data.reportLogoUrl,
        categories: data.assessmentCategories,
        lb: data.labelBerkembang,
        lc: data.labelCakap,
        lm: data.labelMahir
    };
    payload.logoUrl = JSON.stringify(extendedPackage);
    // Cleanup non-db fields
    const fieldsToClean = [
      'appLogoUrl', 'reportLogoUrl', 'assessmentCategories', 
      'labelBerkembang', 'labelCakap', 'labelMahir'
    ];
    fieldsToClean.forEach(f => delete payload[f]);
    
    return this.supabaseOp('upsert', 'settings', payload);
  },

  async clearDatabase(keepTPs: boolean = false): Promise<ApiResponse> {
      const sb = initSupabase();
      if (!sb) return { status: 'error', message: 'No connection' };
      try {
          const tablesToDelete = [
              'assessments', 'category_results', 'p5_assessments', 
              'reflections', 'reflection_answers', 'notes', 'attendance',
              'students', 'p5_criteria', 'reflection_questions' 
          ];
          if (!keepTPs) tablesToDelete.push('tps');
          tablesToDelete.push('classes');
          for (const table of tablesToDelete) {
              const { error } = await sb.from(table).delete().neq('id', '0');
              if (error) throw error;
          }
          return { status: 'success' };
      } catch (e: any) {
          return { status: 'error', message: e.message };
      }
  },

  async restoreDatabase(data: AppState): Promise<ApiResponse> {
      const sb = initSupabase();
      if (!sb) return { status: 'error', message: 'No connection' };
      try {
          await this.clearDatabase(false);
          if (data.settings) await this.saveSettings({ ...data.settings, id: 'global_settings' });
          if (data.classes?.length) await sb.from('classes').upsert(mapKeys(data.classes, toSnakeCase));
          if (data.tps?.length) await sb.from('tps').upsert(mapKeys(data.tps, toSnakeCase));
          if (data.p5Criteria?.length) await sb.from('p5_criteria').upsert(mapKeys(data.p5Criteria, toSnakeCase));
          if (data.reflectionQuestions?.length) await sb.from('reflection_questions').upsert(mapKeys(data.reflectionQuestions, toSnakeCase));
          if (data.students?.length) await sb.from('students').upsert(mapKeys(data.students, toSnakeCase));
          if (data.assessments?.length) await sb.from('assessments').upsert(mapKeys(data.assessments, toSnakeCase));
          if (data.categoryResults?.length) await sb.from('category_results').upsert(mapKeys(data.categoryResults, toSnakeCase));
          if (data.p5Assessments?.length) await sb.from('p5_assessments').upsert(mapKeys(data.p5Assessments, toSnakeCase));
          if (data.reflections?.length) await sb.from('reflections').upsert(mapKeys(data.reflections, toSnakeCase));
          if (data.reflectionAnswers?.length) await sb.from('reflection_answers').upsert(mapKeys(data.reflectionAnswers, toSnakeCase));
          if (data.notes?.length) await sb.from('notes').upsert(mapKeys(data.notes, toSnakeCase));
          if (data.attendance?.length) await sb.from('attendance').upsert(mapKeys(data.attendance, toSnakeCase));
          return { status: 'success' };
      } catch (e: any) {
          return { status: 'error', message: e.message };
      }
  },

  async uploadImage(file: Blob, folder: 'students' | 'school', fileNameProp?: string): Promise<string | null> {
    const sb = initSupabase();
    if (!sb) return null;
    try {
        const fileExt = file.type.split('/')[1] || 'jpg';
        const uniqueName = fileNameProp || `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `${folder}/${uniqueName}`;
        const { error: uploadError } = await sb.storage.from('images').upload(filePath, file, { cacheControl: '3600', upsert: true });
        if (uploadError) throw uploadError;
        const { data } = sb.storage.from('images').getPublicUrl(filePath);
        return data.publicUrl;
    } catch (error: any) {
        return null;
    }
  },

  async supabaseOp(op: 'insert'|'update'|'delete'|'upsert', collection: string, data: any): Promise<ApiResponse> {
    const sb = initSupabase();
    if (!sb) return { status: 'error', message: 'Koneksi Database belum disetting' };
    let tableName = toSnakeCase(collection);
    if (collection === 'TPs') tableName = 'tps';
    const dbData = op === 'delete' ? null : mapKeys(data, toSnakeCase);
    try {
        let query = sb.from(tableName);
        let error = null;
        if (op === 'insert') { const { error: e } = await query.insert(dbData); error = e; } 
        else if (op === 'update') { const { error: e } = await query.update(dbData).eq('id', data.id); error = e; } 
        else if (op === 'upsert') { const { error: e } = await query.upsert(dbData); error = e; } 
        else if (op === 'delete') { const { error: e } = await query.delete().eq('id', data.id); error = e; }
        if (error) throw error;
        return { status: 'success' };
    } catch (e: any) {
        let msg = e.message || "Database Error";
        if (msg.includes("Failed to fetch")) msg = "Gagal terhubung ke Database.";
        return { status: 'error', message: msg };
    }
  }
};
