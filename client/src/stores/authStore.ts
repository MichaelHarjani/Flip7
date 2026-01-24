import { create } from 'zustand';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthStore {
  user: User | null;
  session: Session | null;
  isGuest: boolean;
  loading: boolean;

  // Actions
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  checkSession: () => Promise<{ user: User | null; session: Session | null }>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  isGuest: true, // Default to guest mode
  loading: true,

  /**
   * Sign in with Google OAuth
   */
  signInWithGoogle: async () => {
    if (!isSupabaseAvailable()) {
      console.warn('[Auth] Supabase not available, cannot sign in');
      return;
    }

    set({ loading: true });

    try {
      const { error } = await supabase!.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('[Auth] Sign in error:', error);
        set({ loading: false });
      }
      // Note: Redirect will happen, so we don't set loading to false here
    } catch (error) {
      console.error('[Auth] Sign in exception:', error);
      set({ loading: false });
    }
  },

  /**
   * Sign out current user
   */
  signOut: async () => {
    if (!isSupabaseAvailable()) {
      console.warn('[Auth] Supabase not available');
      return;
    }

    set({ loading: true });

    try {
      const { error } = await supabase!.auth.signOut();

      if (error) {
        console.error('[Auth] Sign out error:', error);
      }

      set({
        user: null,
        session: null,
        isGuest: true,
        loading: false
      });
    } catch (error) {
      console.error('[Auth] Sign out exception:', error);
      set({ loading: false });
    }
  },

  /**
   * Continue as guest (no authentication)
   */
  continueAsGuest: () => {
    set({
      user: null,
      session: null,
      isGuest: true,
      loading: false
    });
  },

  /**
   * Check for existing session (call on app load)
   */
  checkSession: async () => {
    if (!isSupabaseAvailable()) {
      console.log('[Auth] Supabase not available, using guest mode');
      set({ user: null, session: null, isGuest: true, loading: false });
      return { user: null, session: null };
    }

    try {
      const { data: { session }, error } = await supabase!.auth.getSession();

      if (error) {
        console.error('[Auth] Session check error:', error);
        set({ user: null, session: null, isGuest: true, loading: false });
        return { user: null, session: null };
      }

      if (session) {
        console.log('[Auth] Session found:', session.user.email);
        set({
          user: session.user,
          session,
          isGuest: false,
          loading: false
        });
        return { user: session.user, session };
      } else {
        console.log('[Auth] No session found, using guest mode');
        set({ user: null, session: null, isGuest: true, loading: false });
        return { user: null, session: null };
      }
    } catch (error) {
      console.error('[Auth] Session check exception:', error);
      set({ user: null, session: null, isGuest: true, loading: false });
      return { user: null, session: null };
    }
  },
}));

// Initialize auth listener
if (isSupabaseAvailable() && supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('[Auth] State change:', event);

    if (session) {
      useAuthStore.setState({
        user: session.user,
        session,
        isGuest: false,
        loading: false
      });
    } else {
      useAuthStore.setState({
        user: null,
        session: null,
        isGuest: true,
        loading: false
      });
    }
  });
}
