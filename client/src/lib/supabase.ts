import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing environment variables. Auth features will be disabled.');
  console.warn('[Supabase] Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable authentication.');
}

/**
 * Supabase client for client-side operations
 * Uses anonymous key for public operations and user auth
 */
export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Check if Supabase is configured and available
 */
export function isSupabaseAvailable(): boolean {
  return supabase !== null;
}

/**
 * Get Supabase client or throw error if not available
 */
export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase is not configured. Authentication features are disabled.');
  }
  return supabase;
}
