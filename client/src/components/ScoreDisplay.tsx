import { useGameStore } from '../stores/gameStore';
import { useThemeStore } from '../stores/themeStore';

export default function ScoreDisplay() {
  const { gameState } = useGameStore();
  const { getThemeConfig } = useThemeStore();
  const themeConfig = getThemeConfig();

  if (!gameState) {
    return null;
  }

  if (!gameState.players || gameState.players.length === 0) {
    return (
      <div className={`rounded-lg p-3 md:p-4 border-2 ${themeConfig.cardBg} ${themeConfig.cardBorder}`}>
        <h3 className={`font-bold mb-2 text-sm md:text-base ${themeConfig.textPrimary}`}>🏆 Scores</h3>
        <div className={`${themeConfig.textSecondary} text-sm`}>No players yet</div>
      </div>
    );
  }

  // Find the leader
  const leader = gameState.players.reduce((prev, current) =>
    current.score > prev.score ? current : prev
  );

  return (
    <div className={`border-2 rounded-lg p-1 shadow-sm ${themeConfig.cardBg} ${themeConfig.cardBorder}`}>
      <div className="flex items-center justify-between gap-1.5">
        {gameState.players.map((player, index) => {
          const isLeader = player.id === leader.id && player.score > 0;
          const roundScore = gameState.roundScores?.[player.id];
          const hasRoundScore = roundScore !== undefined && roundScore > 0;
          
          return (
            <div
              key={player.id}
              className={`px-1.5 py-0.5 rounded border flex-1 min-w-0 transition-all duration-300 animate-scale-in ${
                isLeader
                  ? 'bg-yellow-900/50 border-yellow-600 ring-1 ring-yellow-500'
                  : 'bg-gray-700 border-gray-500'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`font-semibold text-[10px] truncate flex items-center gap-0.5 ${
                isLeader ? 'text-yellow-200' : 'text-gray-200'
              }`}>
                {isLeader && <span className="text-xs">👑</span>}
                <span className="truncate">{player.name}</span>
              </div>
              <div className="flex items-baseline justify-between gap-0.5">
                <div className={`text-xs font-extrabold ${
                  isLeader ? 'text-yellow-100' : 'text-white'
                }`}>
                  {player.score}
                </div>
                {hasRoundScore && (
                  <div className={`text-[10px] font-semibold animate-bounce-soft ${
                    isLeader ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    +{roundScore}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

