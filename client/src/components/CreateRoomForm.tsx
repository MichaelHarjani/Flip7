import { useState, useRef } from 'react';
import { useRoomStore } from '../stores/roomStore';
import type { RoomSettings } from '@shared/types/index';

interface CreateRoomFormProps {
  onBack: () => void;
}

const TARGET_SCORE_OPTIONS: RoomSettings['targetScore'][] = [100, 200, 300, 500];
const TURN_TIME_OPTIONS: { value: RoomSettings['turnTimeLimit']; label: string }[] = [
  { value: null, label: 'No Limit' },
  { value: 60, label: '60 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 15, label: '15 seconds' },
];

export default function CreateRoomForm({ onBack }: CreateRoomFormProps) {
  const [name, setName] = useState('');
  const [targetScore, setTargetScore] = useState<RoomSettings['targetScore']>(200);
  const [turnTimeLimit, setTurnTimeLimit] = useState<RoomSettings['turnTimeLimit']>(null);
  const { loading, error, createRoom, clearError } = useRoomStore();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Get value directly from the input element as fallback for browser automation
    const inputValue = nameInputRef.current?.value || name;
    if (inputValue.trim()) {
      clearError();
      const settings: RoomSettings = { targetScore, turnTimeLimit };
      await createRoom(inputValue.trim(), settings);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-gray-800 border-4 border-gray-600 rounded-lg">
      <h2 className="text-2xl font-bold text-white mb-4">Create Room</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Your Name
          </label>
          <input
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="w-full px-4 py-2 bg-gray-700 border-2 border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            placeholder="Enter your name"
            required
            disabled={loading}
          />
        </div>

        <div className="border-t border-gray-600 pt-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Room Settings</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Target Score
              </label>
              <select
                value={targetScore}
                onChange={(e) => setTargetScore(Number(e.target.value) as RoomSettings['targetScore'])}
                disabled={loading}
                className="w-full px-3 py-2 bg-gray-700 border-2 border-gray-600 rounded text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {TARGET_SCORE_OPTIONS.map((score) => (
                  <option key={score} value={score}>
                    {score} points
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Turn Timer
              </label>
              <select
                value={turnTimeLimit ?? ''}
                onChange={(e) => setTurnTimeLimit(e.target.value === '' ? null : Number(e.target.value) as RoomSettings['turnTimeLimit'])}
                disabled={loading}
                className="w-full px-3 py-2 bg-gray-700 border-2 border-gray-600 rounded text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {TURN_TIME_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value ?? ''}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-900 border-2 border-red-600 rounded text-red-100 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
          >
            {loading ? 'Creating...' : 'Create Room'}
          </button>
          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

