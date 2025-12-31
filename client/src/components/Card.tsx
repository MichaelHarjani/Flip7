import type { Card as CardType } from '@shared/types/index';
import { useGameStore } from '../stores/gameStore';

interface CardProps {
  card: CardType;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  playerId?: string; // Player ID to check if this Second Chance card was used
}

export default function Card({ card, size = 'md', className = '', playerId }: CardProps) {
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
    xs: 'w-7 h-9 text-[9px]',
    sm: 'w-10 h-14 text-[10px]',
    md: 'w-14 h-20 text-xs',
    lg: 'w-18 h-28 text-sm',
  };

  const baseClasses = `
    ${sizeClasses[size]}
    ${className}
    rounded-lg
    border-2
    flex
    flex-col
    items-center
    justify-center
    font-bold
    shadow-md
    transition-transform
    hover:scale-105
  `;

  if (card.type === 'number') {
    return (
      <div className={`${baseClasses} bg-white border-4 border-blue-600 text-blue-900 shadow-lg`}>
        <div className={`${size === 'xs' ? 'text-xl' : size === 'sm' ? 'text-2xl' : size === 'md' ? 'text-2xl' : 'text-3xl'} font-extrabold`}>{card.value}</div>
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
        <div className={`${baseClasses} bg-yellow-300 border-4 border-yellow-700 text-yellow-950 shadow-lg`}>
          <div className={`${modifierSizeClasses[size]} font-extrabold`}>×{card.modifierValue}</div>
        </div>
      );
    }
    return (
      <div className={`${baseClasses} bg-green-300 border-4 border-green-700 text-green-950 shadow-lg`}>
        <div className={`${modifierSizeClasses[size]} font-extrabold`}>+{card.modifierValue}</div>
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
      <div className={`${baseClasses} ${actionColors[card.actionType || 'freeze']} shadow-lg relative`}>
        <div className={`${iconSizeClasses[size]} font-extrabold`}>
          {actionIcons[card.actionType || 'freeze']}
        </div>
      </div>
    );
  }

  return null;
}

