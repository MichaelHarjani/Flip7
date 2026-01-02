import { useState } from 'react';
import Settings from './Settings';

interface TitleScreenProps {
  onSelectMode: (mode: 'single' | 'local' | 'createRoom' | 'joinRoom' | 'matchmaking') => void;
}

export default function TitleScreen({ onSelectMode }: TitleScreenProps) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center flex-1 py-2 no-select relative">
      {/* Settings Button */}
      <button
        onClick={() => setShowSettings(true)}
        className="absolute top-4 right-4 p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-all hover:scale-110 shadow-lg"
        aria-label="Settings"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      <div className="text-center mb-4 sm:mb-6 animate-scale-in">
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
      </div>

      {/* Settings Modal */}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}

