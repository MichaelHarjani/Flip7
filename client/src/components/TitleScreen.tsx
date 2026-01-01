interface TitleScreenProps {
  onSelectMode: (mode: 'single' | 'local' | 'createRoom' | 'joinRoom' | 'matchmaking') => void;
}

export default function TitleScreen({ onSelectMode }: TitleScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-2 no-select">
      <div className="text-center mb-4 sm:mb-6">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-1 sm:mb-2 text-white">Flip 7</h1>
        <p className="text-sm sm:text-lg md:text-xl text-gray-300">The Greatest Card Game of All Time!</p>
      </div>

      <div className="flex flex-col gap-2 sm:gap-3 w-full max-w-xs sm:max-w-sm md:max-w-md px-2">
        <button
          onClick={() => onSelectMode('single')}
          className="px-4 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg shadow-2xl border-2 sm:border-4 transition-all transform active:scale-95 bg-blue-600 hover:bg-blue-500 border-blue-400 text-white"
        >
          Single Player
        </button>
        
        <button
          onClick={() => onSelectMode('local')}
          className="px-4 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg shadow-2xl border-2 sm:border-4 transition-all transform active:scale-95 bg-purple-600 hover:bg-purple-500 border-purple-400 text-white"
        >
          Local Multiplayer
        </button>

        <div className="border-t border-gray-600 my-1 sm:my-2"></div>

        <button
          onClick={() => onSelectMode('createRoom')}
          className="px-4 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg shadow-2xl border-2 sm:border-4 transition-all transform active:scale-95 bg-green-600 hover:bg-green-500 border-green-400 text-white"
        >
          Create Room
        </button>

        <button
          onClick={() => onSelectMode('joinRoom')}
          className="px-4 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg shadow-2xl border-2 sm:border-4 transition-all transform active:scale-95 bg-orange-600 hover:bg-orange-500 border-orange-400 text-white"
        >
          Join Room
        </button>

        <button
          onClick={() => onSelectMode('matchmaking')}
          className="px-4 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg shadow-2xl border-2 sm:border-4 transition-all transform active:scale-95 bg-pink-600 hover:bg-pink-500 border-pink-400 text-white"
        >
          Find Match
        </button>
      </div>
    </div>
  );
}

