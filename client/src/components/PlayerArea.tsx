import type { Player } from '@shared/types/index';
import Card from './Card';
import { calculateScore, hasFlip7 } from '../utils/gameLogic';
import { useGameStore } from '../stores/gameStore';

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

  const paddingClass = isCompact ? 'p-1' : 'p-2 md:p-3';
  const headerMarginClass = isCompact ? 'mb-0.5' : 'mb-2';
  const titleSizeClass = isCompact ? 'text-xs' : 'text-base';
  const scoreSizeClass = isCompact ? 'text-xs' : 'text-sm';
  const roundScoreSizeClass = isCompact ? 'text-sm' : 'text-xl';
  const totalScoreSizeClass = isCompact ? 'text-xs' : 'text-sm';
  const cardsSpacingClass = isCompact ? 'space-y-0.5' : 'space-y-1';

  const isFrozen = !player.isActive && !player.hasBusted && player.frozenBy;

  return (
    <div
      data-player-area
      data-player-id={player.id}
      className={`relative ${paddingClass} rounded-lg border-4 transition-all
        ${isFrozen
          ? 'border-cyan-400 bg-gradient-to-br from-cyan-900 via-blue-900 to-cyan-900'
          : isCurrentPlayer 
            ? 'border-yellow-500 bg-yellow-900 shadow-xl'
            : 'border-gray-500 bg-gray-800 shadow-md'
        }
        ${player.hasBusted ? 'opacity-60' : ''}
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
        {/* Name and tags on first line */}
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <h3 className={`font-bold ${titleSizeClass} text-white`}>{player.name}</h3>
          {player.isAI && (
            <span className="text-xs font-semibold border px-1.5 py-0.5 rounded bg-gray-600 border-gray-400 text-gray-200">AI</span>
          )}
          {isDealer && (
            <span className="text-xs font-semibold border px-1.5 py-0.5 rounded bg-blue-700 border-blue-500 text-blue-100">Dealer</span>
          )}
          {player.hasSecondChance && (
            <span className="text-xs font-semibold border px-1.5 py-0.5 rounded bg-orange-700 border-orange-500 text-orange-100">2nd Chance</span>
          )}
        </div>
        {/* Scores on second line */}
        <div className="flex items-center justify-between">
          <div className="text-left">
            <div className={`text-xs font-semibold text-gray-300`}>Total: <span className={`${totalScoreSizeClass} font-bold text-white`}>{player.score}</span></div>
            <div className={`font-bold ${scoreSizeClass} text-white`}>
              Round: <span className={roundScoreSizeClass}>{score}</span>
              {hasFlip7Bonus && (
                <span className="ml-1 font-extrabold text-xs text-green-300">+15</span>
              )}
            </div>
          </div>
        </div>

        {/* Status badge in top right */}
        {player.hasBusted && (
          <div className={`absolute top-0 right-0 font-extrabold ${isCompact ? 'text-xs' : 'text-sm'} border-2 rounded px-2 py-1 text-red-200 bg-red-900 border-red-600`}>BUST!</div>
        )}

        {!player.isActive && !player.hasBusted && (
          <div className={`absolute top-0 right-0 font-semibold ${isCompact ? 'text-xs' : 'text-sm'} border-2 rounded px-2 py-1 ${
            isFrozen
              ? 'text-cyan-100 bg-cyan-900/50 border-cyan-400 shadow-lg shadow-cyan-500/50'
              : 'text-gray-300 bg-gray-700 border-gray-500'
          }`}>
            {isFrozen 
              ? `🧊 Frozen${frozenByPlayer ? ` by ${frozenByPlayer.id === player.id ? 'self' : frozenByPlayer.name}` : ''}`
              : 'Stayed'
            }
          </div>
        )}
      </div>

      <div className={cardsSpacingClass}>
        {/* Modifier cards - Always reserve space */}
        <div className={`flex gap-1 flex-wrap min-h-[4rem]`}>
          {player.modifierCards.length > 0 ? (
            player.modifierCards.map(card => (
              <Card key={card.id} card={card} size="sm" />
            ))
          ) : (
            <div className="w-full h-full"></div>
          )}
        </div>

        {/* Number cards - Always reserve space */}
        <div className={`flex gap-1 flex-wrap min-h-[6rem]`}>
          {player.numberCards.length > 0 ? (
            player.numberCards.map(card => (
              <Card key={card.id} card={card} size="md" />
            ))
          ) : (
            <div className="w-full h-full"></div>
          )}
        </div>

        {/* Action cards - Always reserve space */}
        <div className={`flex gap-1 flex-wrap min-h-[4rem]`}>
          {player.actionCards.length > 0 ? (
            player.actionCards.map(card => (
              <Card key={card.id} card={card} size="sm" playerId={player.id} />
            ))
          ) : (
            <div className="w-full h-full"></div>
          )}
        </div>
      </div>
    </div>
  );
}

