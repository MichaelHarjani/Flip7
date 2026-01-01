import { useState, useEffect, useRef } from 'react';
import { useRoomStore } from '../stores/roomStore';

interface RoomCodeInputProps {
  initialCode?: string;
  onJoin: (code: string) => void;
  onCancel: () => void;
}

export default function RoomCodeInput({ initialCode, onJoin, onCancel }: RoomCodeInputProps) {
  const [code, setCode] = useState(initialCode || '');
  const [name, setName] = useState('');
  const { loading, error, joinRoom, clearError } = useRoomStore();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  
  // Update code if initialCode changes
  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
    }
  }, [initialCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Get values directly from the input elements as fallback
    const nameValue = nameInputRef.current?.value || name;
    const codeValue = codeInputRef.current?.value || code;
    
    if (codeValue.trim().length === 6 && nameValue.trim()) {
      clearError();
      await joinRoom(codeValue.toUpperCase(), nameValue.trim());
      onJoin(codeValue.toUpperCase());
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-gray-800 border-4 border-gray-600 rounded-lg">
      <h2 className="text-2xl font-bold text-white mb-4">Join Room</h2>
      
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

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Room Code
          </label>
          <input
            ref={codeInputRef}
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            maxLength={6}
            className="w-full px-4 py-2 bg-gray-700 border-2 border-gray-600 rounded text-white text-center text-2xl font-bold tracking-widest focus:outline-none focus:border-blue-500"
            placeholder="ABCD12"
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
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
          >
            {loading ? 'Joining...' : 'Join Room'}
          </button>
          <button
            type="button"
            onClick={onCancel}
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

