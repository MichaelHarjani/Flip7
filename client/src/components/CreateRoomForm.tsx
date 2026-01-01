import { useState, useRef } from 'react';
import { useRoomStore } from '../stores/roomStore';

interface CreateRoomFormProps {
  onBack: () => void;
}

export default function CreateRoomForm({ onBack }: CreateRoomFormProps) {
  const [name, setName] = useState('');
  const { loading, error, createRoom, clearError } = useRoomStore();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Get value directly from the input element as fallback for browser automation
    const inputValue = nameInputRef.current?.value || name;
    if (inputValue.trim()) {
      clearError();
      // No max player limit - rooms can have unlimited players
      await createRoom(inputValue.trim());
      // Room created, will show lobby via useEffect in App.tsx
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

