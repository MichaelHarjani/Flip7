import { useState, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { getRandomAINames } from '../utils/aiPlayerNames';

interface GameSettingsProps {
  onStart: () => void;
  mode: 'single' | 'local';
  onBack: () => void;
}

// Load saved settings from localStorage
const getSavedSettings = (mode: 'single' | 'local') => {
  try {
    const saved = localStorage.getItem(`flip7_settings_${mode}`);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
};

// Save settings to localStorage
const saveSettings = (mode: 'single' | 'local', playerCount: number, playerName: string) => {
  try {
    localStorage.setItem(`flip7_settings_${mode}`, JSON.stringify({
      playerCount,
      playerName,
    }));
  } catch {
    // Ignore storage errors
  }
};

// Auto-capitalize first letter of each word
const capitalizeWords = (str: string): string => {
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

export default function GameSettings({ onStart, mode, onBack }: GameSettingsProps) {
  const { startGame, loading } = useGameStore();

  // Load saved settings
  const savedSettings = getSavedSettings(mode);
  const defaultCount = savedSettings?.playerCount || (mode === 'single' ? 3 : 2);
  const defaultName = savedSettings?.playerName || (mode === 'single' ? 'You' : 'Player 1');

  const [playerCount, setPlayerCount] = useState(defaultCount);
  const [playerNames, setPlayerNames] = useState<string[]>(
    mode === 'single' ? [defaultName] : [defaultName, 'Player 2']
  );
  const [_aiDifficulties, setAiDifficulties] = useState<Array<'conservative' | 'moderate' | 'aggressive'>>(['moderate']);

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
      // Get random AI character names
      const aiNames = getRandomAINames(playerCount - 1);
      newNames.push(...aiNames);
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
    try {
      // Save settings before starting
      saveSettings(mode, playerCount, playerNames[0] || '');

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
      // Only call onStart if startGame succeeded (no error thrown)
      onStart();
    } catch (error) {
      // Error is already handled in the store, just don't call onStart
      console.error('Failed to start game:', error);
    }
  };

  const updatePlayerName = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const capitalizePlayerName = (index: number) => {
    const newNames = [...playerNames];
    if (newNames[index]) {
      newNames[index] = capitalizeWords(newNames[index]);
      setPlayerNames(newNames);
    }
  };

  const allNamesValid = playerNames.every(name => name.trim().length > 0);

  return (
    <div className="flex-1 flex flex-col justify-center">
      <div className="max-w-sm sm:max-w-md mx-auto p-4 sm:p-6 rounded-lg shadow-2xl border-2 sm:border-4 bg-gray-800 border-gray-600 w-full">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-2xl font-bold text-white">
            {mode === 'single' ? 'Single Player' : 'Local Game'}
          </h2>
          <button
            onClick={onBack}
            className="px-3 py-1.5 text-sm rounded bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-200 transition-colors"
          >
            Back
          </button>
        </div>
        
        <div className="space-y-3 sm:space-y-4">
          {mode === 'single' && (
            <div>
              <label className="block text-sm font-medium mb-1 sm:mb-2 text-gray-200">
                Your Name
              </label>
              <input
                type="text"
                value={playerNames[0] || ''}
                onChange={(e) => updatePlayerName(0, e.target.value)}
                onBlur={() => capitalizePlayerName(0)}
                className="w-full px-3 py-2 border-2 rounded-md bg-gray-700 border-gray-500 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none"
                placeholder="Enter your name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 sm:mb-2 text-gray-200">
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
              <label className="block text-sm font-medium mb-1 sm:mb-2 text-gray-200">
                Player Names
              </label>
              <div className="space-y-2">
                {playerNames.map((name, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm text-gray-300 w-12 flex-shrink-0">
                      P{index + 1}:
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => updatePlayerName(index, e.target.value)}
                      onBlur={() => capitalizePlayerName(index)}
                      className="flex-1 px-3 py-2 border-2 rounded-md bg-gray-700 border-gray-500 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none"
                      placeholder={`Player ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={loading || !allNamesValid}
            className="w-full px-4 py-2.5 sm:py-3 bg-blue-500 text-white rounded-lg font-bold text-base hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            {loading ? 'Starting...' : 'Start Game'}
          </button>
        </div>
      </div>
    </div>
  );
}
