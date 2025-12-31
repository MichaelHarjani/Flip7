import { useGameStore } from '../stores/gameStore';

export default function ScoreDisplay() {
  const { gameState } = useGameStore();

  if (!gameState) {
    return null;
  }

  if (!gameState.players || gameState.players.length === 0) {
    return (
      <div className="rounded-lg p-3 md:p-4 border-2 bg-gray-800 border-gray-600">
        <h3 className="font-bold mb-2 text-sm md:text-base text-white">Scores</h3>
        <div className="text-gray-400 text-sm">No players yet</div>
      </div>
    );
  }

  return (
    <div className="border-2 rounded-lg p-1 shadow-sm bg-gray-800 border-gray-600">
      <div className="flex items-center justify-between gap-1.5">
        {gameState.players.map(player => (
          <div
            key={player.id}
            className="px-1.5 py-0.5 rounded border flex-1 min-w-0 bg-gray-700 border-gray-500"
          >
            <div className="font-semibold text-[10px] truncate text-gray-200">{player.name}</div>
            <div className="flex items-baseline justify-between gap-0.5">
              <div className="text-xs font-extrabold text-white">{player.score}</div>
              {gameState.roundScores && gameState.roundScores[player.id] !== undefined && (
                <div className="text-[10px] font-semibold text-gray-400">
                  +{gameState.roundScores[player.id]}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

