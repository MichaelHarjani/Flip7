import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

interface UsernameSetupProps {
  onComplete: (username: string) => void;
  suggestedName?: string;
}

interface UsernameCheckResult {
  available: boolean;
  error?: string;
  suggestions?: string[];
}

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 16;

export default function UsernameSetup({ onComplete, suggestedName }: UsernameSetupProps) {
  const { session, user } = useAuthStore();
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // Generate initial suggestion from Google name
  useEffect(() => {
    if (suggestedName) {
      // Clean up the suggested name
      const cleaned = suggestedName
        .replace(/[^a-zA-Z0-9_]/g, '')
        .slice(0, USERNAME_MAX_LENGTH);
      if (cleaned.length >= USERNAME_MIN_LENGTH) {
        setUsername(cleaned);
      }
    } else if (user?.user_metadata?.name) {
      const nameParts = user.user_metadata.name.split(' ');
      const firstName = nameParts[0] || '';
      const cleaned = firstName.replace(/[^a-zA-Z0-9_]/g, '');
      if (cleaned.length >= USERNAME_MIN_LENGTH) {
        setUsername(cleaned);
      }
    }
  }, [suggestedName, user]);

  // Debounced username check
  const checkUsername = useCallback(async (name: string) => {
    if (name.length < USERNAME_MIN_LENGTH) {
      setIsAvailable(null);
      setError(null);
      setSuggestions([]);
      return;
    }

    setChecking(true);
    setError(null);

    try {
      const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5001';
      const response = await fetch(`${wsUrl}/api/username/check/${encodeURIComponent(name)}`);
      const data: UsernameCheckResult = await response.json();

      setIsAvailable(data.available);
      if (!data.available) {
        setError(data.error || 'Username not available');
        setSuggestions(data.suggestions || []);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error('[UsernameSetup] Error checking username:', err);
      setError('Failed to check username availability');
    } finally {
      setChecking(false);
    }
  }, []);

  // Debounce the check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (username.length >= USERNAME_MIN_LENGTH) {
        checkUsername(username);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, checkUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.access_token || !isAvailable) return;

    setSubmitting(true);
    setError(null);

    try {
      const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5001';
      const response = await fetch(`${wsUrl}/api/username/set`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to set username');
        return;
      }

      onComplete(username.trim());
    } catch (err) {
      console.error('[UsernameSetup] Error setting username:', err);
      setError('Failed to set username. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setUsername(suggestion);
    setIsAvailable(true);
    setError(null);
    setSuggestions([]);
  };

  const getInputBorderColor = () => {
    if (checking) return 'border-yellow-500';
    if (isAvailable === true) return 'border-green-500';
    if (isAvailable === false) return 'border-red-500';
    return 'border-gray-600';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl border-4 border-blue-600 max-w-md w-full p-6 animate-scale-in">
        {/* Header */}
        <div className="text-center mb-6">
          {user?.user_metadata?.avatar_url && (
            <img
              src={user.user_metadata.avatar_url}
              alt="Profile"
              className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-blue-500"
            />
          )}
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to Flip 7!</h2>
          <p className="text-gray-300">Choose your username to get started</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <div className="relative">
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                  setUsername(value.slice(0, USERNAME_MAX_LENGTH));
                  setIsAvailable(null);
                }}
                placeholder="Enter username..."
                className={`w-full px-4 py-3 bg-gray-700 border-2 ${getInputBorderColor()} rounded-lg text-white font-medium focus:outline-none focus:border-blue-500 transition-colors`}
                autoFocus
                disabled={submitting}
              />
              {/* Status indicator */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checking && (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-yellow-500 border-t-transparent" />
                )}
                {!checking && isAvailable === true && (
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {!checking && isAvailable === false && (
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </div>

            {/* Character count */}
            <div className="flex justify-between mt-1 text-xs text-gray-400">
              <span>{username.length}/{USERNAME_MAX_LENGTH} characters</span>
              {username.length > 0 && username.length < USERNAME_MIN_LENGTH && (
                <span className="text-yellow-500">Minimum {USERNAME_MIN_LENGTH} characters</span>
              )}
            </div>

            {/* Error message */}
            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-400 mb-2">Try one of these:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => selectSuggestion(suggestion)}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-full transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Rules */}
          <div className="bg-gray-700/50 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-300 mb-2">Username rules:</p>
            <ul className="text-xs text-gray-400 space-y-1">
              <li className="flex items-center gap-2">
                <span className={username.length >= USERNAME_MIN_LENGTH && username.length <= USERNAME_MAX_LENGTH ? 'text-green-500' : 'text-gray-500'}>
                  {username.length >= USERNAME_MIN_LENGTH && username.length <= USERNAME_MAX_LENGTH ? '✓' : '○'}
                </span>
                {USERNAME_MIN_LENGTH}-{USERNAME_MAX_LENGTH} characters
              </li>
              <li className="flex items-center gap-2">
                <span className={/^[a-zA-Z]/.test(username) ? 'text-green-500' : 'text-gray-500'}>
                  {/^[a-zA-Z]/.test(username) ? '✓' : '○'}
                </span>
                Must start with a letter
              </li>
              <li className="flex items-center gap-2">
                <span className={/^[a-zA-Z0-9_]*$/.test(username) || username === '' ? 'text-green-500' : 'text-gray-500'}>
                  {/^[a-zA-Z0-9_]*$/.test(username) || username === '' ? '✓' : '○'}
                </span>
                Letters, numbers, and underscores only
              </li>
            </ul>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!isAvailable || submitting || checking}
            className={`w-full px-6 py-3 rounded-lg font-bold text-lg transition-all ${
              isAvailable && !submitting && !checking
                ? 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-105'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Setting up...
              </span>
            ) : (
              'Continue'
            )}
          </button>
        </form>

        {/* Privacy note */}
        <p className="text-xs text-gray-500 text-center mt-4">
          Your username will be visible to other players
        </p>
      </div>
    </div>
  );
}
