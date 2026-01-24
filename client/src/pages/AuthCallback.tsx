import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { useAuthStore, type AuthStore } from '../stores/authStore';

/**
 * OAuth callback page - handles Google Sign-In redirect
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const checkSession = useAuthStore((state: AuthStore) => state.checkSession);

  useEffect(() => {
    const handleCallback = async () => {
      if (!isSupabaseAvailable()) {
        console.error('[Auth] Supabase not available');
        navigate('/');
        return;
      }

      try {
        // Exchange URL code for session
        const { error } = await supabase!.auth.exchangeCodeForSession(
          window.location.href
        );

        if (error) {
          console.error('[Auth] Callback error:', error);
          navigate('/');
          return;
        }

        // Check session to update auth store
        await checkSession();

        // Redirect to home
        navigate('/');
      } catch (error) {
        console.error('[Auth] Callback exception:', error);
        navigate('/');
      }
    };

    handleCallback();
  }, [navigate, checkSession]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white text-xl">Signing you in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
