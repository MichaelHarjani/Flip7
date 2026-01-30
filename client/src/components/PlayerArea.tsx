import type { Player } from '@shared/types/index';
import Card from './Card';
import Avatar from './Avatar';
import AnimatedNumber from './AnimatedNumber';
import { calculateScore, hasFlip7 } from '../utils/gameLogic';
import { useGameStore } from '../stores/gameStore';
import { useThemeStore } from '../stores/themeStore';
import { getAICharacterIconPath } from '../utils/aiPlayerNames';

interface PlayerAreaProps {
  player: Player;
  isCurrentPlayer: boolean;
  isDealer: boolean;
  isCompact?: boolean;
}

export default function PlayerArea({ player, isCurrentPlayer, isDealer, isCompact = false }: PlayerAreaProps) {
  const { gameState } = useGameStore();
  const { theme } = useThemeStore();
  const isVintageTheme = theme === 'vintage-flip7';

  // Find the player who froze this player
  const frozenByPlayer = player.frozenBy
    ? gameState?.players?.find(p => p.id === player.frozenBy)
    : null;

  if (!player) {
    return (
      <div className="p-4 rounded-lg border-4 border-gray-600 bg-gray-800 text-gray-300">
        <div>Invalid player data</div>
      </div>
    );
  }

  // When player busts, round score goes to 0
  const score = player.hasBusted ? 0 : calculateScore(player);
  const hasFlip7Bonus = player.hasBusted ? false : hasFlip7(player);

  const paddingClass = isCompact ? 'p-1 sm:p-1.5' : 'p-1.5 sm:p-2';
  const headerMarginClass = isCompact ? 'mb-0.5' : 'mb-1';
  const titleSizeClass = isCompact ? 'text-[10px] sm:text-xs' : 'text-sm sm:text-base';
  const scoreSizeClass = isCompact ? 'text-[9px] sm:text-xs' : 'text-xs sm:text-sm';
  const cardsSpacingClass = isCompact ? 'space-y-0.5' : 'space-y-1';

  const isFrozen = !player.isActive && !player.hasBusted && player.frozenBy;

  // Find duplicate number cards if player busted
  const duplicateCardValues = new Set<number>();
  if (player.hasBusted) {
    const valueCounts = new Map<number, number>();
    player.numberCards.forEach(card => {
      if (card.type === 'number' && card.value !== undefined) {
        const count = valueCounts.get(card.value) || 0;
        valueCounts.set(card.value, count + 1);
      }
    });
    valueCounts.forEach((count, value) => {
      if (count > 1) {
        duplicateCardValues.add(value);
      }
    });
  }

  // Player avatar - use character icon for AI players, Avatar component for human players
  const aiIconPath = player.isAI ? getAICharacterIconPath(player.name) : null;

  // Vintage theme specific styling
  const getContainerStyle = () => {
    if (isVintageTheme) {
      if (isFrozen) {
        return {
          className: 'border-flip7-freeze bg-gradient-to-br from-cyan-900/80 via-blue-900/80 to-cyan-900/80 animate-pulse-soft backdrop-blur-sm',
          style: {
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(135, 206, 235, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(135, 206, 235, 0.3) 0%, transparent 50%)',
          },
        };
      }
      if (isCurrentPlayer) {
        return {
          className: 'border-flip7-gold shadow-gold-glow',
          style: {
            background: 'linear-gradient(135deg, #4d3520 0%, #3d2518 100%)',
            boxShadow: '0 0 20px rgba(212,175,55,0.5), 0 0 40px rgba(212,175,55,0.3), inset 0 2px 4px rgba(212,175,55,0.2)',
          },
        };
      }
      if (player.hasBusted) {
        return {
          className: 'border-flip7-danger opacity-60 animate-shake',
          style: { background: 'linear-gradient(135deg, #3d2518 0%, #2d1810 100%)' },
        };
      }
      if (!player.isActive) {
        return {
          className: 'border-flip7-vintage',
          style: { background: 'linear-gradient(135deg, #3d2518 0%, #2d1810 100%)' },
        };
      }
      return {
        className: 'border-flip7-border',
        style: { background: 'linear-gradient(135deg, #4d3520 0%, #3d2518 100%)' },
      };
    }

    // Default theme styling
    let className = '';
    if (isFrozen) {
      className = 'border-cyan-400 bg-gradient-to-br from-cyan-900 via-blue-900 to-cyan-900 animate-pulse-soft backdrop-blur-sm';
    } else if (isCurrentPlayer) {
      className = 'border-yellow-500 bg-yellow-900 shadow-2xl animate-border-glow';
    } else {
      className = 'border-gray-500 bg-gray-800 shadow-md';
    }
    if (player.hasBusted) {
      className += ' opacity-60 animate-shake';
    }
    if (!player.isActive && !isFrozen) {
      className = 'border-gray-600 bg-gray-900';
    }
    return { className, style: isFrozen ? {
      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(147, 197, 253, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(186, 230, 253, 0.3) 0%, transparent 50%)',
    } : undefined };
  };

  const containerStyle = getContainerStyle();

  // Vintage theme text colors
  const textColorPrimary = isVintageTheme ? 'text-flip7-card-base' : 'text-white';
  const textColorSecondary = isVintageTheme ? 'text-flip7-vintage' : 'text-gray-300';
  const textColorMuted = isVintageTheme ? 'text-flip7-vintage/70' : 'text-gray-400';

  return (
    <div
      data-player-area
      data-player-id={player.id}
      className={`relative ${paddingClass} rounded-lg border-2 sm:border-4 transition-all duration-300 overflow-hidden ${containerStyle.className}`}
      style={containerStyle.style}
    >
      <div className={`flex flex-col ${headerMarginClass} relative`}>
        {/* Name and tags on first line with avatar */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap mb-0.5 sm:mb-1">
          {aiIconPath ? (
            <img
              src={aiIconPath}
              alt={player.name}
              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-purple-400/50"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <Avatar name={player.name} size={isCompact ? 'sm' : 'md'} isAI={player.isAI} />
          )}
          <h3 className={`font-bold ${titleSizeClass} ${textColorPrimary} ${isVintageTheme ? 'font-display' : ''}`}>{player.name}</h3>
          {player.isAI && (
            <span className={`text-xs font-semibold border px-1.5 py-0.5 rounded animate-scale-in ${isVintageTheme ? 'bg-flip7-wood-dark border-flip7-vintage text-flip7-vintage' : 'bg-gray-600 border-gray-400 text-gray-200'}`}>AI</span>
          )}
          {isDealer && (
            <span className={`text-xs font-semibold border px-1.5 py-0.5 rounded animate-scale-in ${isVintageTheme ? 'bg-flip7-info border-flip7-gold text-flip7-card-base' : 'bg-blue-700 border-blue-500 text-blue-100'}`}>🎴 Dealer</span>
          )}
          {player.hasSecondChance && (
            <span className={`text-xs font-semibold border px-1.5 py-0.5 rounded animate-bounce-soft ${isVintageTheme ? 'bg-flip7-second-chance/30 border-flip7-second-chance text-flip7-card-base' : 'bg-orange-700 border-orange-500 text-orange-100'}`}>❤️ 2nd Chance</span>
          )}
        </div>
        {/* Scores on second line - Enhanced with larger display */}
        <div className="flex items-center justify-between">
          <div className="text-left">
            <div className={`${isCompact ? 'text-[9px] sm:text-xs' : 'text-xs sm:text-sm'} font-semibold ${textColorSecondary}`}>Total: <span className={`${isCompact ? 'text-xs sm:text-sm' : 'text-base sm:text-lg'} font-bold ${textColorPrimary}`}><AnimatedNumber value={player.score} duration={600} /></span></div>
            <div className={`font-bold ${scoreSizeClass} ${textColorPrimary} flex items-center gap-1 sm:gap-2`}>
              <span>Round:</span>
              <span className={`${isCompact ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'} font-extrabold ${
                score > 7 ? (isVintageTheme ? 'text-flip7-danger' : 'text-red-400') : score === 7 ? (isVintageTheme ? 'text-flip7-success' : 'text-green-400') : (isVintageTheme ? 'text-flip7-gold' : 'text-white')
              }`}>{score}</span>
              {hasFlip7Bonus && (
                <span className={`ml-0.5 sm:ml-1 font-extrabold text-[10px] sm:text-sm animate-bounce-soft ${isVintageTheme ? 'text-flip7-gold' : 'text-green-300'}`}>+15 🎉</span>
              )}
              {/* Card count indicator */}
              <span className={`${isCompact ? 'text-[8px] sm:text-xs' : 'text-xs'} ${textColorMuted} ml-auto`}>
                ({player.numberCards.length} cards)
              </span>
            </div>
          </div>
        </div>

        {/* Status badge in top right - Enhanced */}
        {player.hasBusted && (
          <div className={`absolute top-0 right-0 font-extrabold ${isCompact ? 'text-xs' : 'text-sm'} border-2 rounded px-2 py-1 shadow-lg animate-shake ${isVintageTheme ? 'text-flip7-card-base bg-flip7-danger border-flip7-danger' : 'text-red-200 bg-red-900 border-red-600'}`}>💥 BUST!</div>
        )}

        {!player.isActive && !player.hasBusted && (
          <div className={`absolute top-0 right-0 font-semibold ${isCompact ? 'text-xs' : 'text-sm'} border-2 rounded px-2 py-1 shadow-lg ${
            isFrozen
              ? (isVintageTheme ? 'text-flip7-card-base bg-flip7-freeze/50 border-flip7-freeze shadow-flip7-freeze/50 animate-pulse-soft' : 'text-cyan-100 bg-cyan-900/50 border-cyan-400 shadow-cyan-500/50 animate-pulse-soft')
              : (isVintageTheme ? 'text-flip7-vintage bg-flip7-wood-dark border-flip7-vintage' : 'text-gray-300 bg-gray-700 border-gray-500')
          }`}>
            {isFrozen
              ? `🧊 Frozen${frozenByPlayer ? ` by ${frozenByPlayer.id === player.id ? 'self' : frozenByPlayer.name}` : ''}`
              : '✋ Stayed'
            }
          </div>
        )}

        {/* Current player indicator - Pulse animation */}
        {isCurrentPlayer && !player.hasBusted && player.isActive && (
          <div className={`absolute -top-2 -left-2 w-4 h-4 rounded-full animate-pulse shadow-lg ${isVintageTheme ? 'bg-flip7-gold shadow-flip7-gold/50' : 'bg-yellow-400 shadow-yellow-500/50'}`}></div>
        )}
      </div>

      <div className={cardsSpacingClass}>
        {/* Modifier cards */}
        {player.modifierCards.length > 0 && (
          <div className="flex gap-1 sm:gap-1.5 flex-wrap pb-0.5">
            {player.modifierCards.map((card, index) => (
              <Card
                key={card.id}
                card={card}
                size={isCompact ? "xs" : "sm"}
                animate="slide-in"
                showTooltip={true}
                className={`animation-delay-${index * 100}`}
              />
            ))}
          </div>
        )}

        {/* Number cards */}
        <div className="flex gap-1 sm:gap-1.5 flex-wrap pb-0.5">
          {player.numberCards.length > 0 ? (
            player.numberCards.map((card, index) => (
              <Card
                key={card.id}
                card={card}
                size={isCompact ? "xs" : "sm"}
                animate="flip"
                showTooltip={true}
                className={`animation-delay-${index * 100}`}
                isDuplicate={card.type === 'number' && card.value !== undefined && duplicateCardValues.has(card.value)}
              />
            ))
          ) : (
            <div className="text-xs text-gray-500 italic">No cards</div>
          )}
        </div>

        {/* Action cards */}
        {player.actionCards.length > 0 && (
          <div className="flex gap-1 sm:gap-1.5 flex-wrap pb-0.5">
            {player.actionCards.map((card, index) => (
              <Card
                key={card.id}
                card={card}
                size={isCompact ? "xs" : "sm"}
                playerId={player.id}
                animate="scale-in"
                showTooltip={true}
                isPlayable={isCurrentPlayer && player.isActive}
                className={`animation-delay-${index * 100}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

