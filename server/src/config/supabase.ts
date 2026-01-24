import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('[Supabase] Missing environment variables. Auth features will be disabled.');
  console.warn('[Supabase] Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable authentication.');
}

/**
 * Supabase client for server-side operations
 * Uses service role key for admin operations
 */
export const supabase: SupabaseClient | null = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
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
    throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }
  return supabase;
}
