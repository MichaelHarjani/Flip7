import { create } from 'zustand';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

// User profile from database
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthStore {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isGuest: boolean;
  loading: boolean;
  needsUsername: boolean;

  // Actions
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  checkSession: () => Promise<{ user: User | null; session: Session | null }>;
  fetchProfile: () => Promise<UserProfile | null>;
  setProfile: (profile: UserProfile) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isGuest: true, // Default to guest mode
  loading: true,
  needsUsername: false,

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
        profile: null,
        isGuest: true,
        loading: false,
        needsUsername: false,
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
      profile: null,
      isGuest: true,
      loading: false,
      needsUsername: false,
    });
  },

  /**
   * Check for existing session (call on app load)
   */
  checkSession: async () => {
    if (!isSupabaseAvailable()) {
      console.log('[Auth] Supabase not available, using guest mode');
      set({ user: null, session: null, profile: null, isGuest: true, loading: false, needsUsername: false });
      return { user: null, session: null };
    }

    try {
      const { data: { session }, error } = await supabase!.auth.getSession();

      if (error) {
        console.error('[Auth] Session check error:', error);
        set({ user: null, session: null, profile: null, isGuest: true, loading: false, needsUsername: false });
        return { user: null, session: null };
      }

      if (session) {
        console.log('[Auth] Session found:', session.user.email);
        set({
          user: session.user,
          session,
          isGuest: false,
          loading: false,
        });

        // Fetch profile to check if username is set
        await get().fetchProfile();

        return { user: session.user, session };
      } else {
        console.log('[Auth] No session found, using guest mode');
        set({ user: null, session: null, profile: null, isGuest: true, loading: false, needsUsername: false });
        return { user: null, session: null };
      }
    } catch (error) {
      console.error('[Auth] Session check exception:', error);
      set({ user: null, session: null, profile: null, isGuest: true, loading: false, needsUsername: false });
      return { user: null, session: null };
    }
  },

  /**
   * Fetch user profile from server
   */
  fetchProfile: async () => {
    const { session } = get();

    if (!session?.access_token) {
      console.log('[Auth] No session, cannot fetch profile');
      return null;
    }

    try {
      const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5001';
      const response = await fetch(`${wsUrl}/api/username/profile`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        console.error('[Auth] Failed to fetch profile:', response.status);
        return null;
      }

      const data = await response.json();

      if (data.profile) {
        console.log('[Auth] Profile found:', data.profile.username);
        set({
          profile: data.profile,
          needsUsername: false,
        });
        return data.profile;
      } else {
        console.log('[Auth] No profile found, user needs to set username');
        set({
          profile: null,
          needsUsername: true,
        });
        return null;
      }
    } catch (error) {
      console.error('[Auth] Error fetching profile:', error);
      return null;
    }
  },

  /**
   * Set profile after username is created
   */
  setProfile: (profile: UserProfile) => {
    console.log('[Auth] Profile set:', profile.username);
    set({
      profile,
      needsUsername: false,
    });
  },
}));

// Initialize auth listener
if (isSupabaseAvailable() && supabase) {
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[Auth] State change:', event);

    if (session) {
      useAuthStore.setState({
        user: session.user,
        session,
        isGuest: false,
        loading: false,
      });

      // Fetch profile when auth state changes
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await useAuthStore.getState().fetchProfile();
      }
    } else {
      useAuthStore.setState({
        user: null,
        session: null,
        profile: null,
        isGuest: true,
        loading: false,
        needsUsername: false,
      });
    }
  });
}
