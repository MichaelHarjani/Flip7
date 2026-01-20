import type { Player } from '@shared/types/index';
import Card from './Card';
import { calculateScore, hasFlip7 } from '../utils/gameLogic';
import { useGameStore } from '../stores/gameStore';
import { getAICharacterIconPath } from '../utils/aiPlayerNames';

interface PlayerAreaProps {
  player: Player;
  isCurrentPlayer: boolean;
  isDealer: boolean;
  isCompact?: boolean;
}

export default function PlayerArea({ player, isCurrentPlayer, isDealer, isCompact = false }: PlayerAreaProps) {
  const { gameState } = useGameStore();
  
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

  const score = calculateScore(player);
  const hasFlip7Bonus = hasFlip7(player);

  const paddingClass = isCompact ? 'p-0.5 sm:p-1' : 'p-1.5 sm:p-2 md:p-3';
  const headerMarginClass = isCompact ? 'mb-0.5' : 'mb-1 sm:mb-2';
  const titleSizeClass = isCompact ? 'text-[10px] sm:text-xs' : 'text-sm sm:text-base';
  const scoreSizeClass = isCompact ? 'text-[9px] sm:text-xs' : 'text-xs sm:text-sm';
  const cardsSpacingClass = isCompact ? 'space-y-0' : 'space-y-0.5 sm:space-y-1';

  const isFrozen = !player.isActive && !player.hasBusted && player.frozenBy;

  // Player avatar - use character icon for AI players, emoji for human players
  const getPlayerAvatar = () => {
    if (player.isAI) {
      // Try to get character icon path
      const iconPath = getAICharacterIconPath(player.name);
      if (iconPath) {
        // Return JSX for image (will be handled in render)
        return iconPath;
      }
      // Fallback to robot emoji
      return '🤖';
    }
    // Use first letter as basis for emoji
    const firstLetter = player.name.charAt(0).toUpperCase();
    const avatars = ['👤', '🎮', '🎯', '⭐', '🎲', '🃏'];
    return avatars[firstLetter.charCodeAt(0) % avatars.length];
  };

  const playerAvatar = getPlayerAvatar();
  const isIconPath = player.isAI && typeof playerAvatar === 'string' && playerAvatar.endsWith('.png');

  return (
    <div
      data-player-area
      data-player-id={player.id}
      className={`relative ${paddingClass} rounded-lg border-2 sm:border-4 transition-all duration-300 overflow-hidden
        ${isFrozen
          ? 'border-cyan-400 bg-gradient-to-br from-cyan-900 via-blue-900 to-cyan-900 animate-pulse-soft'
          : isCurrentPlayer 
            ? 'border-yellow-500 bg-yellow-900 shadow-2xl animate-border-glow'
            : 'border-gray-500 bg-gray-800 shadow-md'
        }
        ${player.hasBusted ? 'opacity-60 animate-shake' : ''}
        ${!player.isActive && !isFrozen
          ? 'border-gray-600 bg-gray-900'
          : ''
        }
        ${isFrozen ? 'backdrop-blur-sm' : ''}
      `}
      style={isFrozen ? {
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(147, 197, 253, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(186, 230, 253, 0.3) 0%, transparent 50%)',
      } : undefined}
    >
      <div className={`flex flex-col ${headerMarginClass} relative`}>
        {/* Name and tags on first line with avatar */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap mb-0.5 sm:mb-1">
          {isIconPath ? (
            <img 
              src={playerAvatar as string} 
              alt={player.name}
              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover"
              onError={(e) => {
                // Fallback to emoji if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = document.createElement('span');
                fallback.className = 'text-lg sm:text-2xl';
                fallback.textContent = '🤖';
                target.parentNode?.insertBefore(fallback, target);
              }}
            />
          ) : (
            <span className="text-lg sm:text-2xl">{playerAvatar}</span>
          )}
          <h3 className={`font-bold ${titleSizeClass} text-white`}>{player.name}</h3>
          {player.isAI && (
            <span className="text-xs font-semibold border px-1.5 py-0.5 rounded bg-gray-600 border-gray-400 text-gray-200 animate-scale-in">AI</span>
          )}
          {isDealer && (
            <span className="text-xs font-semibold border px-1.5 py-0.5 rounded bg-blue-700 border-blue-500 text-blue-100 animate-scale-in">🎴 Dealer</span>
          )}
          {player.hasSecondChance && (
            <span className="text-xs font-semibold border px-1.5 py-0.5 rounded bg-orange-700 border-orange-500 text-orange-100 animate-bounce-soft">❤️ 2nd Chance</span>
          )}
        </div>
        {/* Scores on second line - Enhanced with larger display */}
        <div className="flex items-center justify-between">
          <div className="text-left">
            <div className={`${isCompact ? 'text-[9px] sm:text-xs' : 'text-xs sm:text-sm'} font-semibold text-gray-300`}>Total: <span className={`${isCompact ? 'text-xs sm:text-sm' : 'text-base sm:text-lg'} font-bold text-white`}>{player.score}</span></div>
            <div className={`font-bold ${scoreSizeClass} text-white flex items-center gap-1 sm:gap-2`}>
              <span>Round:</span> 
              <span className={`${isCompact ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'} font-extrabold ${
                score > 7 ? 'text-red-400' : score === 7 ? 'text-green-400' : 'text-white'
              }`}>{score}</span>
              {hasFlip7Bonus && (
                <span className="ml-0.5 sm:ml-1 font-extrabold text-[10px] sm:text-sm text-green-300 animate-bounce-soft">+15 🎉</span>
              )}
              {/* Card count indicator */}
              <span className={`${isCompact ? 'text-[8px] sm:text-xs' : 'text-xs'} text-gray-400 ml-auto`}>
                ({player.numberCards.length} cards)
              </span>
            </div>
          </div>
        </div>

        {/* Status badge in top right - Enhanced */}
        {player.hasBusted && (
          <div className={`absolute top-0 right-0 font-extrabold ${isCompact ? 'text-xs' : 'text-sm'} border-2 rounded px-2 py-1 text-red-200 bg-red-900 border-red-600 shadow-lg animate-shake`}>💥 BUST!</div>
        )}

        {!player.isActive && !player.hasBusted && (
          <div className={`absolute top-0 right-0 font-semibold ${isCompact ? 'text-xs' : 'text-sm'} border-2 rounded px-2 py-1 shadow-lg ${
            isFrozen
              ? 'text-cyan-100 bg-cyan-900/50 border-cyan-400 shadow-cyan-500/50 animate-pulse-soft'
              : 'text-gray-300 bg-gray-700 border-gray-500'
          }`}>
            {isFrozen 
              ? `🧊 Frozen${frozenByPlayer ? ` by ${frozenByPlayer.id === player.id ? 'self' : frozenByPlayer.name}` : ''}`
              : '✋ Stayed'
            }
          </div>
        )}

        {/* Current player indicator - Pulse animation */}
        {isCurrentPlayer && !player.hasBusted && player.isActive && (
          <div className="absolute -top-2 -left-2 w-4 h-4 bg-yellow-400 rounded-full animate-pulse shadow-lg shadow-yellow-500/50"></div>
        )}
      </div>

      <div className={cardsSpacingClass}>
        {/* Modifier cards - Always reserve space with animations */}
        <div className={`flex gap-0.5 sm:gap-1 flex-wrap min-h-[1.5rem] sm:min-h-[2.5rem] md:min-h-[3.5rem] overflow-hidden`}>
          {player.modifierCards.length > 0 ? (
            player.modifierCards.map((card, index) => (
              <Card 
                key={card.id} 
                card={card} 
                size={isCompact ? "xs" : "sm"} 
                animate="slide-in"
                showTooltip={true}
                className={`animation-delay-${index * 100}`}
              />
            ))
          ) : (
            <div className="w-full h-full"></div>
          )}
        </div>

        {/* Number cards - Always reserve space with flip animations */}
        <div className={`flex gap-0.5 sm:gap-1 flex-wrap min-h-[2rem] sm:min-h-[3.5rem] md:min-h-[5rem] overflow-hidden`}>
          {player.numberCards.length > 0 ? (
            player.numberCards.map((card, index) => (
              <Card 
                key={card.id} 
                card={card} 
                size={isCompact ? "xs" : "sm"} 
                animate="flip"
                showTooltip={true}
                className={`animation-delay-${index * 100}`}
              />
            ))
          ) : (
            <div className="w-full h-full"></div>
          )}
        </div>

        {/* Action cards - Always reserve space with scale animations */}
        <div className={`flex gap-0.5 sm:gap-1 flex-wrap min-h-[1.5rem] sm:min-h-[2.5rem] md:min-h-[3.5rem] overflow-hidden`}>
          {player.actionCards.length > 0 ? (
            player.actionCards.map((card, index) => (
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
            ))
          ) : (
            <div className="w-full h-full"></div>
          )}
        </div>
      </div>
    </div>
  );
}

