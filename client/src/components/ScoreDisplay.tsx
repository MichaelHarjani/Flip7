import { useGameStore } from '../stores/gameStore';
import { useThemeStore } from '../stores/themeStore';
import { calculateScore, hasFlip7 } from '../utils/gameLogic';
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

  // Find the leader (including tentative scores)
  const playersWithTentative = gameState.players.map(player => {
    const currentRoundScore = calculateScore(player);
    const flip7Bonus = hasFlip7(player) ? 15 : 0;
    const tentativeTotal = player.score + currentRoundScore + flip7Bonus;
    return { player, currentRoundScore, flip7Bonus, tentativeTotal };
  });

  const leader = playersWithTentative.reduce((prev, current) =>
    current.tentativeTotal > prev.tentativeTotal ? current : prev
  );

  // Target score for progress bar
  const targetScore = 200;

  // Determine grid layout based on player count
  const playerCount = gameState.players.length;
  const getGridClass = () => {
    switch (playerCount) {
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-3';
      case 4: return 'grid-cols-2';
      case 5: return 'grid-cols-3';
      case 6: return 'grid-cols-3';
      default: return 'grid-cols-3';
    }
  };

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
      <div className={`grid ${getGridClass()} gap-1 sm:gap-1.5`}>
        {playersWithTentative.map(({ player, currentRoundScore, flip7Bonus, tentativeTotal }, index) => {
          const isLeader = player.id === leader.player.id && tentativeTotal > 0;
          const isCurrentPlayer = index === gameState.currentPlayerIndex;
          const committedPercentage = Math.min((player.score / targetScore) * 100, 100);
          const tentativePercentage = Math.min((tentativeTotal / targetScore) * 100, 100);
          const hasTentativeScore = currentRoundScore > 0 || flip7Bonus > 0;

          // Player-specific colors
          const playerColors = [
            isVintageTheme ? '#4682b4' : '#3b82f6', // Blue
            isVintageTheme ? '#8b4789' : '#a855f7', // Purple
            isVintageTheme ? '#2e8b57' : '#22c55e', // Green
            isVintageTheme ? '#cd853f' : '#f59e0b', // Amber
            isVintageTheme ? '#dc143c' : '#ef4444', // Red
            isVintageTheme ? '#20b2aa' : '#14b8a6', // Teal
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
                  {hasTentativeScore && (
                    <span
                      className={`text-[9px] font-medium ${
                        isVintageTheme ? 'text-flip7-vintage/70' : 'text-gray-400'
                      }`}
                    >
                      (+{currentRoundScore}{flip7Bonus > 0 ? `+${flip7Bonus}` : ''})
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar with tentative score */}
              <div
                className="h-1.5 rounded-full overflow-hidden relative"
                style={{
                  backgroundColor: isVintageTheme ? '#c19a6b' : 'rgb(55, 65, 81)',
                }}
              >
                {/* Tentative score (greyed out) - rendered first so it's behind */}
                {hasTentativeScore && tentativePercentage > committedPercentage && (
                  <div
                    className="absolute h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${tentativePercentage}%`,
                      backgroundColor: isVintageTheme ? 'rgba(139,69,19,0.3)' : 'rgba(156, 163, 175, 0.4)',
                    }}
                  />
                )}
                {/* Committed score (solid) */}
                <div
                  className="h-full transition-all duration-500 rounded-full relative"
                  style={{
                    width: `${committedPercentage}%`,
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

