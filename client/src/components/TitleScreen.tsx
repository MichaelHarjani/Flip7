interface TitleScreenProps {
  onSelectMode: (mode: 'single' | 'local') => void;
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
      </div>
    </div>
  );
}

