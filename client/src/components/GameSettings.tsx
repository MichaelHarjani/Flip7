import { useState, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';

interface GameSettingsProps {
  onStart: () => void;
  mode: 'single' | 'local';
  onBack: () => void;
}

export default function GameSettings({ onStart, mode, onBack }: GameSettingsProps) {
  const { startGame, loading } = useGameStore();
  const [playerCount, setPlayerCount] = useState(mode === 'single' ? 3 : 2);
  const [playerNames, setPlayerNames] = useState<string[]>(mode === 'single' ? ['You'] : ['Player 1', 'Player 2']);
  const [aiDifficulties, setAiDifficulties] = useState<Array<'conservative' | 'moderate' | 'aggressive'>>(['moderate']);

  // Update player names array when player count changes
  useEffect(() => {
    if (mode === 'local') {
      const newNames = [...playerNames];
      while (newNames.length < playerCount) {
        newNames.push(`Player ${newNames.length + 1}`);
      }
      while (newNames.length > playerCount) {
        newNames.pop();
      }
      setPlayerNames(newNames);
    } else {
      // Single player mode: first is human, rest are AI
      // Preserve the user's name if they've entered one
      const currentHumanName = playerNames[0] && playerNames[0] !== 'You' ? playerNames[0] : 'You';
      const newNames = [currentHumanName];
      for (let i = 0; i < playerCount - 1; i++) {
        newNames.push(`AI Player ${i + 1}`);
      }
      setPlayerNames(newNames);
      
      // Adjust AI difficulties array (using default 'moderate' for all)
      const newDifficulties: Array<'conservative' | 'moderate' | 'aggressive'> = [];
      for (let i = 0; i < playerCount - 1; i++) {
        newDifficulties.push('moderate');
      }
      setAiDifficulties(newDifficulties);
    }
  }, [playerCount, mode]);

  const handleStart = async () => {
    if (mode === 'single') {
      // Use default 'moderate' difficulty for all AI players
      const difficulties: Array<'conservative' | 'moderate' | 'aggressive'> = [];
      for (let i = 0; i < playerCount - 1; i++) {
        difficulties.push('moderate');
      }
      await startGame(playerNames, difficulties);
    } else {
      // Local mode: all human players, no AI
      await startGame(playerNames, []);
    }
    onStart();
  };

  const updatePlayerName = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const allNamesValid = playerNames.every(name => name.trim().length > 0);

  return (
    <div className="max-w-md mx-auto p-6 rounded-lg shadow-2xl border-4 bg-gray-800 border-gray-600">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">
          {mode === 'single' ? 'Single Player Settings' : 'Local Game Settings'}
        </h2>
        <button
          onClick={onBack}
          className="px-3 py-1 text-sm rounded bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
        >
          Back
        </button>
      </div>
      
      <div className="space-y-4">
        {mode === 'single' && (
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">
              Your Name
            </label>
            <input
              type="text"
              value={playerNames[0] || ''}
              onChange={(e) => updatePlayerName(0, e.target.value)}
              className="w-full px-3 py-2 border-2 rounded-md bg-gray-700 border-gray-500 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none"
              placeholder="Enter your name"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-200">
            Number of Players ({mode === 'single' ? '1-4' : '2-4'})
          </label>
          <input
            type="number"
            min={mode === 'single' ? 1 : 2}
            max="4"
            value={playerCount}
            onChange={(e) => {
              const count = parseInt(e.target.value) || (mode === 'single' ? 1 : 2);
              setPlayerCount(Math.max(mode === 'single' ? 1 : 2, Math.min(4, count)));
            }}
            className="w-full px-3 py-2 border-2 rounded-md bg-gray-700 border-gray-500 text-white focus:border-blue-400 focus:outline-none"
          />
        </div>

        {mode === 'local' && (
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">
              Player Names
            </label>
            <div className="space-y-2">
              {playerNames.map((name, index) => (
                <div key={index}>
                  <span className="text-sm mb-1 block text-gray-300">
                    Player {index + 1}:
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => updatePlayerName(index, e.target.value)}
                    className="w-full px-3 py-2 border-2 rounded-md bg-gray-700 border-gray-500 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none"
                    placeholder={`Enter player ${index + 1} name`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={loading || !allNamesValid}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
        >
          {loading ? 'Starting...' : 'Start Game'}
        </button>
      </div>
    </div>
  );
}
