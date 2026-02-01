import type { Card as CardType } from '@shared/types/index';
import { useGameStore } from '../stores/gameStore';

interface CardProps {
  card: CardType;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  playerId?: string; // Player ID to check if this Second Chance card was used
  animate?: 'flip' | 'slide-in' | 'scale-in' | 'glow' | 'shake' | 'none';
  showTooltip?: boolean;
  isPlayable?: boolean;
  isBusted?: boolean; // Whether this card caused a bust (duplicate number)
}

export default function Card({ card, size = 'md', className = '', playerId, animate = 'none', showTooltip = false, isPlayable = false, isBusted = false }: CardProps) {
  const { gameState } = useGameStore();
  
  // Check if this is a used Second Chance card
  // A Second Chance card is "used" if the player has secondChanceUsedBy set with this card's ID
  const player = playerId ? gameState?.players?.find(p => p.id === playerId) : null;
  const isUsedSecondChance = card.type === 'action' && 
    card.actionType === 'secondChance' && 
    player?.secondChanceUsedBy?.secondChanceCardId === card.id;
  
  // Get info about the card that triggered the Second Chance usage
  const usedByInfo = isUsedSecondChance ? player?.secondChanceUsedBy : null;
  const sizeClasses = {
    xs: 'w-6 h-8 sm:w-7 sm:h-9 text-[8px] sm:text-[9px]',
    sm: 'w-8 h-11 sm:w-10 sm:h-14 text-[9px] sm:text-[10px]',
    md: 'w-12 h-16 sm:w-14 sm:h-20 text-[10px] sm:text-xs',
    lg: 'w-16 h-22 sm:w-18 sm:h-28 text-xs sm:text-sm',
  };

  // Animation classes
  const animationClass = animate !== 'none' ? `animate-${animate}` : '';
  const playableClass = isPlayable ? 'cursor-pointer animate-glow hover:scale-110' : 'hover:scale-105';

  const baseClasses = `
    ${sizeClasses[size]}
    ${className}
    ${animationClass}
    ${playableClass}
    rounded-lg
    border-2
    flex
    flex-col
    items-center
    justify-center
    font-bold
    shadow-md
    transition-all
    duration-200
    relative
    group
    overflow-visible
  `;

  // Tooltip content
  const getTooltipContent = () => {
    if (card.type === 'number') {
      return `Number Card: ${card.value}`;
    } else if (card.type === 'modifier') {
      return `${card.modifierType === 'multiply' ? 'Multiply' : 'Add'}: ${card.modifierValue}`;
    } else if (card.type === 'action') {
      const actionNames = {
        freeze: 'Freeze - Skip next player',
        flipThree: 'Flip 3 - Draw 3 cards',
        secondChance: 'Second Chance - Save from bust',
      };
      return actionNames[card.actionType || 'freeze'];
    }
    return '';
  };

  if (card.type === 'number') {
    return (
      <div className={`${baseClasses} bg-white border-2 sm:border-4 border-blue-600 text-blue-900 shadow-lg ${isBusted ? 'opacity-90' : ''}`}>
        <div className={`${size === 'xs' ? 'text-base sm:text-xl' : size === 'sm' ? 'text-lg sm:text-2xl' : size === 'md' ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'} font-extrabold relative z-10`}>{card.value}</div>

        {/* Bust overlay - Semi-transparent X so number shows through */}
        {isBusted && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-lg overflow-hidden">
            {/* Very light red tint overlay */}
            <div
              className="absolute inset-0 rounded-lg"
              style={{
                backgroundColor: 'rgba(220, 38, 38, 0.12)',
              }}
            />

            {/* Semi-transparent X marks */}
            <svg
              className="w-full h-full absolute inset-0"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {/* First diagonal line */}
              <line
                x1="10" y1="10"
                x2="90" y2="90"
                stroke="rgba(220, 38, 38, 0.6)"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {/* Second diagonal line */}
              <line
                x1="90" y1="10"
                x2="10" y2="90"
                stroke="rgba(220, 38, 38, 0.6)"
                strokeWidth="8"
                strokeLinecap="round"
              />
            </svg>
          </div>
        )}

        {showTooltip && (
          <div className="absolute hidden group-hover:block bg-black/90 text-white px-2 py-1 rounded text-xs -top-10 whitespace-nowrap z-50 shadow-xl">
            {getTooltipContent()}
          </div>
        )}
      </div>
    );
  }

  if (card.type === 'modifier') {
    const modifierSizeClasses = {
      xs: 'text-xs',
      sm: 'text-base',
      md: 'text-lg',
      lg: 'text-xl',
    };

    if (card.modifierType === 'multiply') {
      return (
        <div className={`${baseClasses} bg-yellow-300 border-2 sm:border-4 border-yellow-700 text-yellow-950 shadow-lg`}>
          <div className={`${modifierSizeClasses[size]} font-extrabold`}>×{card.modifierValue}</div>
          {showTooltip && (
            <div className="absolute hidden group-hover:block bg-black/90 text-white px-2 py-1 rounded text-xs -top-10 whitespace-nowrap z-50 shadow-xl">
              {getTooltipContent()}
            </div>
          )}
        </div>
      );
    }
    return (
      <div className={`${baseClasses} bg-green-300 border-2 sm:border-4 border-green-700 text-green-950 shadow-lg`}>
        <div className={`${modifierSizeClasses[size]} font-extrabold`}>+{card.modifierValue}</div>
        {showTooltip && (
          <div className="absolute hidden group-hover:block bg-black/90 text-white px-2 py-1 rounded text-xs -top-10 whitespace-nowrap z-50 shadow-xl">
            {getTooltipContent()}
          </div>
        )}
      </div>
    );
  }

  if (card.type === 'action') {
    const actionColors = {
      freeze: 'bg-blue-300 border-4 border-blue-700 text-blue-950',
      flipThree: 'bg-purple-300 border-4 border-purple-700 text-purple-950',
      secondChance: 'bg-pink-200 border-4 border-red-800 text-red-950',
    };

    const actionIcons = {
      freeze: '🧊',
      flipThree: '3',
      secondChance: '❤️',
    };

    const iconSizeClasses = {
      xs: 'text-base',
      sm: 'text-xl',
      md: 'text-2xl',
      lg: 'text-3xl',
    };

    // For used Second Chance cards, show side-by-side overlap
    if (card.actionType === 'secondChance' && isUsedSecondChance) {
      // Calculate positioning - drawn card overlaps from left at full card width (moved over half more)
      const overlapOffset = {
        xs: '7px', // full width of w-7
        sm: '10px', // full width of w-10
        md: '14px', // full width of w-14
        lg: '18px' // full width of w-18
      };
      
      return (
        <div className={`relative ${className} inline-flex items-center`} style={{ width: `calc(${sizeClasses[size].split(' ')[0]} * 1.5)` }}>
          {/* Left half of Second Chance card - clipped to show only left 50% */}
          <div className={`relative ${sizeClasses[size]} overflow-hidden`}>
            <div 
              className={`${sizeClasses[size]} ${actionColors.secondChance} shadow-lg rounded-lg border-2 flex flex-col items-center justify-center font-bold`}
              style={{ marginRight: '-50%' }}
            >
              <div className={`${iconSizeClasses[size]} font-extrabold`}>
                {actionIcons.secondChance}
              </div>
            </div>
            {/* Overlay on visible left half */}
            <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-start pl-1" style={{ width: '50%' }}>
              <div className={`text-white font-bold ${size === 'xs' ? 'text-[8px]' : size === 'sm' ? 'text-xs' : 'text-sm'}`}>
                USED
              </div>
            </div>
          </div>
          
          {/* Full drawn card on the right - overlapping the Second Chance card */}
          {usedByInfo && (
            <div className={`absolute ${sizeClasses[size]} z-10`} style={{ left: overlapOffset[size] }}>
              {usedByInfo.type === 'number' && usedByInfo.value !== undefined ? (
                <div className={`
                  ${sizeClasses[size]} rounded-lg border-4 border-blue-600 bg-white text-blue-900 shadow-lg
                  flex flex-col items-center justify-center font-bold
                `}>
                  <div className={`${size === 'xs' ? 'text-xl' : size === 'sm' ? 'text-2xl' : size === 'md' ? 'text-2xl' : 'text-3xl'} font-extrabold`}>{usedByInfo.value}</div>
                </div>
              ) : usedByInfo.type === 'modifier' ? (
                <div className={`
                  ${sizeClasses[size]} rounded-lg border-4 border-green-700 bg-green-300 text-green-950 shadow-lg
                  flex flex-col items-center justify-center font-bold
                `}>
                  <div className={`${size === 'xs' ? 'text-lg' : size === 'sm' ? 'text-xl' : size === 'md' ? 'text-xl' : 'text-2xl'} font-extrabold`}>+?</div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={`${baseClasses} ${actionColors[card.actionType || 'freeze']} shadow-lg relative border-2 sm:border-4`}>
        <div className={`${iconSizeClasses[size]} font-extrabold`}>
          {actionIcons[card.actionType || 'freeze']}
        </div>
        {showTooltip && (
          <div className="absolute hidden group-hover:block bg-black/90 text-white px-2 py-1 rounded text-xs -top-10 whitespace-nowrap z-50 shadow-xl">
            {getTooltipContent()}
          </div>
        )}
      </div>
    );
  }

  return null;
}

