interface TitleScreenProps {
  onSelectMode: (mode: 'single' | 'local' | 'createRoom' | 'joinRoom' | 'matchmaking') => void;
}

export default function TitleScreen({ onSelectMode }: TitleScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold mb-4 text-white">Flip 7</h1>
        <p className="text-xl text-gray-300">The Greatest Card Game of All Time!</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-md">
        <button
          onClick={() => onSelectMode('single')}
          className="px-8 py-6 rounded-lg font-bold text-xl shadow-2xl border-4 transition-all transform hover:scale-105 bg-blue-600 hover:bg-blue-500 border-blue-400 text-white"
        >
          Single Player
        </button>
        
        <button
          onClick={() => onSelectMode('local')}
          className="px-8 py-6 rounded-lg font-bold text-xl shadow-2xl border-4 transition-all transform hover:scale-105 bg-purple-600 hover:bg-purple-500 border-purple-400 text-white"
        >
          Local
        </button>

        <div className="border-t-2 border-gray-600 my-2"></div>

        <button
          onClick={() => onSelectMode('createRoom')}
          className="px-8 py-6 rounded-lg font-bold text-xl shadow-2xl border-4 transition-all transform hover:scale-105 bg-green-600 hover:bg-green-500 border-green-400 text-white"
        >
          Create Room
        </button>

        <button
          onClick={() => onSelectMode('joinRoom')}
          className="px-8 py-6 rounded-lg font-bold text-xl shadow-2xl border-4 transition-all transform hover:scale-105 bg-orange-600 hover:bg-orange-500 border-orange-400 text-white"
        >
          Join Room
        </button>

        <button
          onClick={() => onSelectMode('matchmaking')}
          className="px-8 py-6 rounded-lg font-bold text-xl shadow-2xl border-4 transition-all transform hover:scale-105 bg-pink-600 hover:bg-pink-500 border-pink-400 text-white"
        >
          Find Match
        </button>
      </div>
    </div>
  );
}

