import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Error crítico: Faltan las variables de entorno de Supabase. Debes configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env o en el entorno.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
