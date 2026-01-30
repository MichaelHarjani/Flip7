import type { Card as CardType } from '@shared/types/index';
import { useGameStore } from '../stores/gameStore';
import { useThemeStore } from '../stores/themeStore';
import { getNumberCardColor, getNumberCardTextColor, getModifierCardColor, getActionCardColor } from '../theme/flip7Colors';

interface CardProps {
  card: CardType;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  playerId?: string;
  animate?: 'flip' | 'slide-in' | 'scale-in' | 'glow' | 'shake' | 'none';
  showTooltip?: boolean;
  isPlayable?: boolean;
  isDuplicate?: boolean; // Shows red slash overlay for duplicate cards that caused bust
}

export default function Card({ card, size = 'md', className = '', playerId, animate = 'none', showTooltip = false, isPlayable = false, isDuplicate = false }: CardProps) {
  const { gameState } = useGameStore();
  const { theme } = useThemeStore();
  const isVintageTheme = theme === 'vintage-flip7';

  // Check if this is a used Second Chance card
  const player = playerId ? gameState?.players?.find(p => p.id === playerId) : null;
  const isUsedSecondChance = card.type === 'action' &&
    card.actionType === 'secondChance' &&
    (player?.usedSecondChanceCardIds?.includes(card.id) ?? false);

  const sizeClasses = {
    xs: 'w-7 h-10 sm:w-8 sm:h-11 text-[8px] sm:text-[9px]',
    sm: 'w-9 h-12 sm:w-11 sm:h-16 text-[9px] sm:text-[10px]',
    md: 'w-14 h-20 sm:w-16 sm:h-22 text-[10px] sm:text-xs',
    lg: 'w-18 h-24 sm:w-20 sm:h-28 text-xs sm:text-sm',
  };

  const animationClass = animate !== 'none' ? `animate-${animate}` : '';
  const playableClass = isPlayable ? 'cursor-pointer animate-glow hover:scale-110' : 'hover:scale-105';

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

  // Vintage card styling with authentic colors
  if (isVintageTheme) {
    return (
      <VintageCard
        card={card}
        size={size}
        className={className}
        animate={animationClass}
        playable={playableClass}
        isPlayable={isPlayable}
        showTooltip={showTooltip}
        getTooltipContent={getTooltipContent}
        isUsedSecondChance={isUsedSecondChance}
        sizeClasses={sizeClasses}
        isDuplicate={isDuplicate}
      />
    );
  }

  // Original styling for other themes
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

  if (card.type === 'number') {
    return (
      <div className={`${baseClasses} bg-white border-2 sm:border-4 border-blue-600 text-blue-900 shadow-lg`}>
        <div className={`${size === 'xs' ? 'text-base sm:text-xl' : size === 'sm' ? 'text-lg sm:text-2xl' : size === 'md' ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'} font-extrabold`}>{card.value}</div>
        {showTooltip && (
          <div className="absolute hidden group-hover:block bg-black/90 text-white px-2 py-1 rounded text-xs -top-10 whitespace-nowrap z-50 shadow-xl">
            {getTooltipContent()}
          </div>
        )}
        {/* Red slash overlay for duplicate cards */}
        {isDuplicate && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute w-full h-0.5 bg-red-600 rotate-45 transform scale-150 shadow-lg"></div>
            <div className="absolute w-full h-0.5 bg-red-600 -rotate-45 transform scale-150 shadow-lg"></div>
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

    if (card.actionType === 'secondChance' && isUsedSecondChance) {
      const overlapOffset = {
        xs: '7px',
        sm: '10px',
        md: '14px',
        lg: '18px'
      };

      return (
        <div className={`relative ${className} inline-flex items-center`} style={{ width: `calc(${sizeClasses[size].split(' ')[0]} * 1.5)` }}>
          <div className={`relative ${sizeClasses[size]} overflow-hidden`}>
            <div
              className={`${sizeClasses[size]} ${actionColors.secondChance} shadow-lg rounded-lg border-2 flex flex-col items-center justify-center font-bold`}
              style={{ marginRight: '-50%' }}
            >
              <div className={`${iconSizeClasses[size]} font-extrabold`}>
                {actionIcons.secondChance}
              </div>
            </div>
            <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-start pl-1" style={{ width: '50%' }}>
              <div className={`text-white font-bold ${size === 'xs' ? 'text-[8px]' : size === 'sm' ? 'text-xs' : 'text-sm'}`}>
                USED
              </div>
            </div>
          </div>

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

// Vintage styled card component
interface VintageCardProps {
  card: CardType;
  size: 'xs' | 'sm' | 'md' | 'lg';
  className: string;
  animate: string;
  playable: string;
  isPlayable: boolean;
  showTooltip: boolean;
  getTooltipContent: () => string;
  isUsedSecondChance: boolean;
  sizeClasses: Record<string, string>;
  isDuplicate?: boolean;
}

function VintageCard({
  card,
  size,
  className,
  animate,
  playable,
  isPlayable,
  showTooltip,
  getTooltipContent,
  isUsedSecondChance,
  sizeClasses,
  isDuplicate = false,
}: VintageCardProps) {
  const fontSizes = {
    xs: 'text-lg sm:text-xl',
    sm: 'text-xl sm:text-2xl',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-3xl sm:text-4xl',
  };

  const modifierFontSizes = {
    xs: 'text-sm',
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const actionIcons = {
    freeze: '🧊',
    flipThree: '3',
    secondChance: '❤️',
  };

  // Get card-specific color
  const getCardStyle = () => {
    if (card.type === 'number') {
      const bgColor = getNumberCardColor(card.value || 0);
      const textColor = getNumberCardTextColor(card.value || 0);
      return { bgColor, textColor, borderColor: bgColor };
    } else if (card.type === 'modifier') {
      const bgColor = getModifierCardColor(card.modifierValue || 0);
      return { bgColor, textColor: '#2d1810', borderColor: bgColor };
    } else {
      const bgColor = getActionCardColor(card.actionType || 'freeze');
      return { bgColor, textColor: '#2d1810', borderColor: bgColor };
    }
  };

  const cardStyle = getCardStyle();

  // Used Second Chance card handling
  if (card.type === 'action' && card.actionType === 'secondChance' && isUsedSecondChance) {
    const overlapOffset = { xs: '7px', sm: '10px', md: '14px', lg: '18px' };

    return (
      <div className={`relative ${className} inline-flex items-center`} style={{ width: `calc(${sizeClasses[size].split(' ')[0]} * 1.5)` }}>
        <div className={`relative ${sizeClasses[size]} overflow-hidden`}>
          <div
            className={`${sizeClasses[size]} rounded-lg shadow-card flex flex-col items-center justify-center font-display font-bold`}
            style={{
              backgroundColor: '#f5f1e8',
              border: '3px solid #8b4513',
              marginRight: '-50%',
            }}
          >
            <div className={fontSizes[size]}>❤️</div>
          </div>
          <div className="absolute inset-0 bg-flip7-wood-dark/80 flex items-center justify-start pl-1" style={{ width: '50%' }}>
            <div className={`text-flip7-gold font-bold font-card ${size === 'xs' ? 'text-[8px]' : size === 'sm' ? 'text-xs' : 'text-sm'}`}>
              USED
            </div>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div
      className={`
        ${sizeClasses[size]}
        ${className}
        ${animate}
        ${playable}
        relative
        transition-all
        duration-200
        group
      `}
    >
      {/* Outer border - saddle brown */}
      <div
        className="w-full h-full rounded-lg p-[2px] sm:p-[3px] shadow-card"
        style={{ backgroundColor: '#8b4513' }}
      >
        {/* Inner gold border */}
        <div
          className="w-full h-full rounded-md p-[1px] sm:p-[2px]"
          style={{ backgroundColor: '#d4af37' }}
        >
          {/* Card face - cream base with colored accent */}
          <div
            className="w-full h-full rounded-sm flex flex-col items-center justify-center relative overflow-hidden font-display"
            style={{
              backgroundColor: '#f5f1e8',
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,.015) 2px, rgba(0,0,0,.015) 4px)',
            }}
          >
            {/* Colored accent bar */}
            <div
              className="absolute inset-x-0 h-1 sm:h-1.5 top-0"
              style={{ backgroundColor: cardStyle.bgColor }}
            />
            <div
              className="absolute inset-x-0 h-1 sm:h-1.5 bottom-0"
              style={{ backgroundColor: cardStyle.bgColor }}
            />

            {/* Card value */}
            <div
              className={`${card.type === 'modifier' ? modifierFontSizes[size] : fontSizes[size]} font-bold z-10`}
              style={{
                color: cardStyle.bgColor,
                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              {card.type === 'number' && card.value}
              {card.type === 'modifier' && (card.modifierType === 'multiply' ? `×${card.modifierValue}` : `+${card.modifierValue}`)}
              {card.type === 'action' && actionIcons[card.actionType || 'freeze']}
            </div>

            {/* Playable indicator */}
            {isPlayable && (
              <div className="absolute inset-0 rounded-sm ring-2 ring-flip7-gold animate-pulse" />
            )}

            {/* Red slash overlay for duplicate cards */}
            {isDuplicate && card.type === 'number' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="absolute w-full h-1 bg-flip7-danger rotate-45 transform scale-150 shadow-lg" style={{ boxShadow: '0 0 4px rgba(220,38,38,0.5)' }}></div>
                <div className="absolute w-full h-1 bg-flip7-danger -rotate-45 transform scale-150 shadow-lg" style={{ boxShadow: '0 0 4px rgba(220,38,38,0.5)' }}></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute hidden group-hover:block bg-flip7-wood-dark text-flip7-card-base px-2 py-1 rounded text-xs -top-10 whitespace-nowrap z-50 shadow-xl border border-flip7-gold">
          {getTooltipContent()}
        </div>
      )}
    </div>
  );
}

// Helper component for vintage card face
function VintageCardFace({
  value,
  bgColor,
  textColor,
  size,
  sizeClasses,
  fontSizes,
}: {
  value: number;
  bgColor: string;
  textColor: string;
  size: 'xs' | 'sm' | 'md' | 'lg';
  sizeClasses: Record<string, string>;
  fontSizes: Record<string, string>;
}) {
  return (
    <div className={`${sizeClasses[size]} rounded-lg p-[2px] sm:p-[3px] shadow-card`} style={{ backgroundColor: '#8b4513' }}>
      <div className="w-full h-full rounded-md p-[1px] sm:p-[2px]" style={{ backgroundColor: '#d4af37' }}>
        <div
          className="w-full h-full rounded-sm flex items-center justify-center font-display relative overflow-hidden"
          style={{ backgroundColor: '#f5f1e8' }}
        >
          <div className="absolute inset-x-0 h-1 sm:h-1.5 top-0" style={{ backgroundColor: bgColor }} />
          <div className="absolute inset-x-0 h-1 sm:h-1.5 bottom-0" style={{ backgroundColor: bgColor }} />
          <span className={`${fontSizes[size]} font-bold`} style={{ color: bgColor }}>{value}</span>
        </div>
      </div>
    </div>
  );
}
