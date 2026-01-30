import { useGameStore } from '../stores/gameStore';
import { useThemeStore } from '../stores/themeStore';
import Avatar from './Avatar';
import AnimatedNumber from './AnimatedNumber';

export default function ScoreDisplay() {
  const { gameState } = useGameStore();
  const { theme, getThemeConfig } = useThemeStore();
  const themeConfig = getThemeConfig();
  const isVintageTheme = theme === 'vintage-flip7';

  if (!gameState) {
    return null;
  }

  if (!gameState.players || gameState.players.length === 0) {
    return (
      <div className={`rounded-lg p-2 border-2 ${themeConfig.cardBg} ${themeConfig.cardBorder}`}>
        <div className={`${themeConfig.textSecondary} text-xs`}>No players yet</div>
      </div>
    );
  }

  // Find the leader
  const leader = gameState.players.reduce((prev, current) =>
    current.score > prev.score ? current : prev
  );

  // Target score for progress bar
  const targetScore = 200;

  return (
    <div
      className="rounded-lg p-1 sm:p-1.5 shadow-sm"
      style={isVintageTheme ? {
        backgroundColor: 'rgba(245,241,232,0.95)',
        border: '2px solid #8b4513',
      } : {
        backgroundColor: 'rgb(31, 41, 55)',
        border: '2px solid rgb(75, 85, 99)',
      }}
    >
      <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
        {gameState.players.map((player, index) => {
          const isLeader = player.id === leader.id && player.score > 0;
          const roundScore = gameState.roundScores?.[player.id];
          const hasRoundScore = roundScore !== undefined && roundScore > 0;
          const isCurrentPlayer = index === gameState.currentPlayerIndex;
          const percentage = Math.min((player.score / targetScore) * 100, 100);

          // Player-specific colors
          const playerColors = [
            isVintageTheme ? '#4682b4' : '#3b82f6', // Blue
            isVintageTheme ? '#8b4789' : '#a855f7', // Purple
            isVintageTheme ? '#2e8b57' : '#22c55e', // Green
          ];
          const playerColor = playerColors[index % playerColors.length];

          return (
            <div
              key={player.id}
              className={`p-1 sm:p-1.5 rounded transition-all duration-300 animate-scale-in ${
                isCurrentPlayer ? (isVintageTheme ? 'ring-1 ring-flip7-gold ring-offset-1 ring-offset-flip7-card-base' : 'ring-1 ring-yellow-400 ring-offset-1 ring-offset-gray-800') : ''
              }`}
              style={{
                animationDelay: `${index * 50}ms`,
                backgroundColor: isVintageTheme
                  ? (isCurrentPlayer ? 'rgba(212,175,55,0.15)' : 'transparent')
                  : (isLeader ? 'rgba(234, 179, 8, 0.2)' : 'rgba(55, 65, 81, 0.5)'),
              }}
            >
              {/* Player name and score */}
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-0.5 min-w-0 flex-1">
                  <Avatar name={player.name} size="xs" isAI={player.isAI} />
                  {isLeader && <span className="text-[10px]">👑</span>}
                  <span
                    className={`text-[9px] sm:text-[10px] font-semibold truncate ${
                      isVintageTheme ? 'text-flip7-wood-dark' : (isLeader ? 'text-yellow-200' : 'text-gray-200')
                    }`}
                  >
                    {player.name}
                  </span>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span
                    className="text-xs sm:text-sm font-bold"
                    style={{ color: playerColor }}
                  >
                    <AnimatedNumber value={player.score} duration={600} />
                  </span>
                  {hasRoundScore && (
                    <span
                      className={`text-[9px] font-semibold animate-bounce-soft ${
                        isVintageTheme ? 'text-flip7-gold' : 'text-green-400'
                      }`}
                    >
                      +{roundScore}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div
                className="h-1 rounded-full overflow-hidden"
                style={{
                  backgroundColor: isVintageTheme ? '#c19a6b' : 'rgb(55, 65, 81)',
                }}
              >
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: playerColor,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

