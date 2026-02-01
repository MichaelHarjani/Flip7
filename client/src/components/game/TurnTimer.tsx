import { useState, useEffect, useRef } from 'react';

interface TurnTimerProps {
  timeLimit: number; // seconds
  isMyTurn: boolean;
  onTimeExpired?: () => void;
  paused?: boolean;
}

export default function TurnTimer({ timeLimit, isMyTurn, onTimeExpired, paused = false }: TurnTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasExpiredRef = useRef(false);

  // Reset timer when turn changes
  useEffect(() => {
    setTimeRemaining(timeLimit);
    hasExpiredRef.current = false;
  }, [isMyTurn, timeLimit]);

  // Countdown logic
  useEffect(() => {
    if (paused || !isMyTurn) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (!hasExpiredRef.current && onTimeExpired) {
            hasExpiredRef.current = true;
            onTimeExpired();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isMyTurn, paused, onTimeExpired]);

  // Calculate percentage for progress bar
  const percentage = (timeRemaining / timeLimit) * 100;

  // Determine color based on remaining time
  const getColorClass = () => {
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  };

  if (!isMyTurn) {
    return null;
  }

  return (
    <div className="w-full max-w-xs mx-auto mb-3">
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-300">Time remaining</span>
        <span className={`font-bold ${percentage <= 25 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
          {formatTime(timeRemaining)}
        </span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColorClass()} transition-all duration-1000 ease-linear`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
