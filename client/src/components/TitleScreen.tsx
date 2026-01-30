import { useState, useEffect } from 'react';
import Settings from './Settings';
import Tutorial from './Tutorial';
import PracticeTool from './PracticeTool';
import Footer from './Footer';
import { useAuthStore } from '../stores/authStore';

interface TitleScreenProps {
  onSelectMode: (mode: 'single' | 'local' | 'createRoom' | 'joinRoom' | 'matchmaking') => void;
}

export default function TitleScreen({ onSelectMode }: TitleScreenProps) {
  const { user, profile, isGuest, loading, signInWithGoogle, signOut } = useAuthStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showPractice, setShowPractice] = useState(false);
  const [showAuthMenu, setShowAuthMenu] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  // Check if first-time user and show welcome/tutorial prompt
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('flip7_hasSeenWelcome');
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
  }, []);

  const handleDismissWelcome = (openTutorial: boolean) => {
    localStorage.setItem('flip7_hasSeenWelcome', 'true');
    setShowWelcome(false);
    if (openTutorial) {
      setShowTutorial(true);
    }
  };

  return (
    <div className="flex flex-col flex-1 no-select relative">
      {/* Main content area */}
      <div className="flex flex-col items-center justify-center flex-1 py-2 relative">
      {/* Top Left - Auth Section - Better mobile spacing */}
      <div className="absolute top-2 left-2 sm:top-4 sm:left-4">
        {!loading && isGuest && (
          <button
            onClick={() => signInWithGoogle()}
            className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white hover:bg-gray-100 text-gray-800 rounded-lg font-semibold shadow-lg transition-all hover:scale-105 text-sm sm:text-base"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="hidden sm:inline">Sign in with Google</span>
            <span className="sm:hidden">Sign in</span>
          </button>
        )}

        {!loading && !isGuest && user && (
          <div className="relative">
            <button
              onClick={() => setShowAuthMenu(!showAuthMenu)}
              className="flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg shadow-lg transition-all border-2 border-gray-600"
            >
              {(profile?.avatar_url || user.user_metadata?.avatar_url) && (
                <img
                  src={profile?.avatar_url || user.user_metadata?.avatar_url}
                  alt="Profile"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full"
                />
              )}
              <span className="font-semibold text-sm sm:text-base max-w-[100px] sm:max-w-none truncate">
                {profile?.username || user.user_metadata?.name || user.email}
              </span>
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showAuthMenu && (
              <div className="absolute top-full left-0 mt-2 bg-gray-800 border-2 border-gray-600 rounded-lg shadow-xl overflow-hidden z-10">
                <button
                  onClick={async () => {
                    setShowAuthMenu(false);
                    await signOut();
                  }}
                  className="flex items-center gap-2 px-4 py-3 text-white hover:bg-gray-700 transition-colors w-full text-left"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Top Right Buttons - Better mobile spacing */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex gap-1.5 sm:gap-2">
        {/* Tutorial Button */}
        <button
          onClick={() => setShowTutorial(true)}
          className="p-2 sm:p-3 bg-blue-700 hover:bg-blue-600 text-white rounded-full transition-all hover:scale-110 shadow-lg"
          aria-label="Tutorial"
          title="Tutorial"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </button>

        {/* Practice Button */}
        <button
          onClick={() => setShowPractice(true)}
          className="p-2 sm:p-3 bg-green-700 hover:bg-green-600 text-white rounded-full transition-all hover:scale-110 shadow-lg"
          aria-label="Practice Mode"
          title="Practice Mode"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </button>

        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 sm:p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-all hover:scale-110 shadow-lg"
          aria-label="Settings"
          title="Settings"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      <div className="text-center mb-4 sm:mb-6 mt-16 sm:mt-0 animate-scale-in">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-1 sm:mb-2 text-white animate-float">Flip 7</h1>
        <p className="text-sm sm:text-lg md:text-xl text-gray-300">The Greatest Card Game of All Time!</p>
      </div>

      <div className="flex flex-col gap-2 sm:gap-3 w-full max-w-xs sm:max-w-sm md:max-w-md px-2">
        <button
          onClick={() => onSelectMode('single')}
          className="px-4 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg shadow-2xl border-2 sm:border-4 transition-all transform hover:scale-105 active:scale-95 bg-blue-600 hover:bg-blue-500 border-blue-400 text-white animate-scale-in"
          style={{ animationDelay: '0.1s' }}
        >
          Single Player
        </button>
        
        <button
          onClick={() => onSelectMode('local')}
          className="px-4 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg shadow-2xl border-2 sm:border-4 transition-all transform hover:scale-105 active:scale-95 bg-purple-600 hover:bg-purple-500 border-purple-400 text-white animate-scale-in"
          style={{ animationDelay: '0.2s' }}
        >
          Local Multiplayer
        </button>

        <div className="border-t border-gray-600 my-1 sm:my-2"></div>

        <button
          onClick={() => onSelectMode('createRoom')}
          className="px-4 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg shadow-2xl border-2 sm:border-4 transition-all transform hover:scale-105 active:scale-95 bg-green-600 hover:bg-green-500 border-green-400 text-white animate-scale-in"
          style={{ animationDelay: '0.3s' }}
        >
          Create Room
        </button>

        <button
          onClick={() => onSelectMode('joinRoom')}
          className="px-4 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg shadow-2xl border-2 sm:border-4 transition-all transform hover:scale-105 active:scale-95 bg-orange-600 hover:bg-orange-500 border-orange-400 text-white animate-scale-in"
          style={{ animationDelay: '0.4s' }}
        >
          Join Room
        </button>

        <button
          onClick={() => onSelectMode('matchmaking')}
          className="px-4 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg shadow-2xl border-2 sm:border-4 transition-all transform hover:scale-105 active:scale-95 bg-pink-600 hover:bg-pink-500 border-pink-400 text-white animate-scale-in"
          style={{ animationDelay: '0.5s' }}
        >
          Find Match
        </button>

        <div className="border-t border-gray-600 my-1 sm:my-2"></div>

        <button
          onClick={() => setShowTutorial(true)}
          className="px-4 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg shadow-2xl border-2 sm:border-4 transition-all transform hover:scale-105 active:scale-95 bg-blue-600 hover:bg-blue-500 border-blue-400 text-white animate-scale-in"
          style={{ animationDelay: '0.6s' }}
        >
          📖 How to Play
        </button>

        <button
          onClick={() => setShowPractice(true)}
          className="px-4 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg shadow-2xl border-2 sm:border-4 transition-all transform hover:scale-105 active:scale-95 bg-teal-600 hover:bg-teal-500 border-teal-400 text-white animate-scale-in"
          style={{ animationDelay: '0.7s' }}
        >
          🎯 Practice Mode
        </button>
      </div>

      {/* Modals */}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
      {showPractice && <PracticeTool onClose={() => setShowPractice(false)} />}

      {/* First-time welcome modal */}
      {showWelcome && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-scale-in">
          <div className="bg-gray-800 rounded-2xl shadow-2xl border-4 border-blue-500 max-w-md w-full p-6 animate-scale-in text-center">
            <div className="text-5xl mb-4">🎴</div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to Flip 7!</h2>
            <p className="text-gray-300 mb-6">
              A press-your-luck card game where you try to collect 7 cards without busting.
              First player to 200 points wins!
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleDismissWelcome(true)}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
              >
                Learn How to Play
              </button>
              <button
                onClick={() => handleDismissWelcome(false)}
                className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
              >
                I know the rules, let's go!
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Footer */}
      <Footer onShowTutorial={() => setShowTutorial(true)} />
    </div>
  );
}

