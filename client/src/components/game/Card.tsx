import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card as CardType } from '@shared/types/index';
import { useGameStore } from '../../stores/gameStore';
import { useThemeStore } from '../../stores/themeStore';
import { getNumberCardColor, getModifierCardColor, getActionCardColor } from '../../theme/flip7Colors';

interface CardProps {
  card: CardType;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  playerId?: string;
  faceDown?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  showTooltip?: boolean;
  animateEntry?: boolean;
  entryDelay?: number;
}

const sizeClasses = {
  xs: 'w-9 h-13 text-xs',
  sm: 'w-13 h-18 text-sm',
  md: 'w-18 h-24 text-base',
  lg: 'w-22 h-30 text-lg',
};

const fontSizeClasses = {
  xs: 'text-lg',
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl',
};

export default function Card({
  card,
  size = 'md',
  className = '',
  playerId,
  faceDown = false,
  interactive = false,
  onClick,
  showTooltip = false,
  animateEntry = false,
  entryDelay = 0,
}: CardProps) {
  const { gameState } = useGameStore();
  const { theme } = useThemeStore();
  const isVintageTheme = theme === 'vintage-flip7';
  const [isFlipped, setIsFlipped] = useState(faceDown);

  // Sync internal state with prop
  useEffect(() => {
    setIsFlipped(faceDown);
  }, [faceDown]);

  // Check if this is a used Second Chance card
  const player = playerId ? gameState?.players?.find((p) => p.id === playerId) : null;
  const isUsedSecondChance =
    card.type === 'action' &&
    card.actionType === 'secondChance' &&
    (player?.usedSecondChanceCardIds?.includes(card.id) ?? false);

  // Get card display content - supports vintage theme with authentic colors
  const getCardContent = () => {
    if (isVintageTheme) {
      // Vintage theme uses authentic Flip 7 colors
      if (card.type === 'number') {
        const color = getNumberCardColor(card.value || 0);
        return {
          display: card.value?.toString() ?? '0',
          color,
          isVintage: true,
        };
      }
      if (card.type === 'modifier') {
        const color = getModifierCardColor(card.modifierValue || 0);
        return {
          display: card.modifierType === 'multiply' ? `×${card.modifierValue}` : `+${card.modifierValue}`,
          color,
          isVintage: true,
        };
      }
      if (card.type === 'action') {
        const color = getActionCardColor(card.actionType || 'freeze');
        const actionIcons: Record<string, string> = {
          freeze: '🧊',
          flipThree: '3',
          secondChance: '❤️',
        };
        return {
          display: actionIcons[card.actionType || 'freeze'],
          color,
          isVintage: true,
        };
      }
      return { display: '?', color: '#708090', isVintage: true };
    }

    // Default theme styling
    if (card.type === 'number') {
      return {
        display: card.value?.toString() ?? '0',
        bgColor: 'bg-white',
        borderColor: 'border-blue-600',
        textColor: 'text-blue-900',
        isVintage: false,
      };
    }
    if (card.type === 'modifier') {
      if (card.modifierType === 'multiply') {
        return {
          display: `×${card.modifierValue}`,
          bgColor: 'bg-yellow-300',
          borderColor: 'border-yellow-700',
          textColor: 'text-yellow-950',
          isVintage: false,
        };
      }
      return {
        display: `+${card.modifierValue}`,
        bgColor: 'bg-green-300',
        borderColor: 'border-green-700',
        textColor: 'text-green-950',
        isVintage: false,
      };
    }
    if (card.type === 'action') {
      const actionConfig: Record<string, { display: string; bgColor: string; borderColor: string; textColor: string; isVintage: boolean }> = {
        freeze: {
          display: '🧊',
          bgColor: 'bg-cyan-300',
          borderColor: 'border-cyan-700',
          textColor: 'text-cyan-950',
          isVintage: false,
        },
        flipThree: {
          display: '3',
          bgColor: 'bg-orange-300',
          borderColor: 'border-orange-700',
          textColor: 'text-orange-950',
          isVintage: false,
        },
        secondChance: {
          display: '❤️',
          bgColor: 'bg-pink-200',
          borderColor: 'border-red-700',
          textColor: 'text-red-950',
          isVintage: false,
        },
      };
      return actionConfig[card.actionType || 'freeze'];
    }
    return { display: '?', bgColor: 'bg-gray-300', borderColor: 'border-gray-600', textColor: 'text-gray-900', isVintage: false };
  };

  const getTooltipContent = () => {
    if (card.type === 'number') return `Number: ${card.value}`;
    if (card.type === 'modifier') {
      return card.modifierType === 'multiply' ? `Multiply ×${card.modifierValue}` : `Add +${card.modifierValue}`;
    }
    if (card.type === 'action') {
      const tips: Record<string, string> = {
        freeze: 'FREEZE - End a player\'s turn immediately',
        flipThree: 'FLIP THREE - Force a player to draw 3 cards',
        secondChance: 'SECOND CHANCE - Saves you from one bust',
      };
      return tips[card.actionType || 'freeze'];
    }
    return '';
  };

  const content = getCardContent();

  // Vintage card back design
  const VintageCardBack = () => (
    <div className={`${sizeClasses[size]} rounded-lg p-[3px] shadow-card`} style={{ backgroundColor: '#8b4513' }}>
      <div className="w-full h-full rounded-md p-[2px]" style={{ backgroundColor: '#d4af37' }}>
        <div
          className="w-full h-full rounded-sm flex items-center justify-center relative overflow-hidden"
          style={{ backgroundColor: '#2d1810' }}
        >
          {/* Decorative pattern */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(212,175,55,0.3) 8px, rgba(212,175,55,0.3) 16px),
              repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(212,175,55,0.3) 8px, rgba(212,175,55,0.3) 16px)
            `,
          }} />
          <span className="text-3xl font-bold font-display" style={{ color: '#d4af37', opacity: 0.6 }}>7</span>
        </div>
      </div>
    </div>
  );

  // Default card back design
  const CardBack = () => {
    if (isVintageTheme) return <VintageCardBack />;

    return (
      <div
        className={`
          ${sizeClasses[size]}
          rounded-lg
          border-4
          border-gray-500
          bg-gradient-to-br
          from-gray-700
          via-gray-600
          to-gray-700
          flex
          items-center
          justify-center
          shadow-lg
        `}
      >
        <div className="w-3/4 h-3/4 rounded border-2 border-gray-500 bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
          <span className="text-2xl font-bold text-white/30">7</span>
        </div>
      </div>
    );
  };

  // Vintage card front design
  const VintageCardFront = () => {
    const color = content.color || '#1e90ff';
    return (
      <div
        className={`${sizeClasses[size]} rounded-lg p-[3px] shadow-card ${interactive ? 'cursor-pointer ring-2 ring-flip7-gold animate-pulse-soft' : ''} ${isUsedSecondChance ? 'opacity-50' : ''}`}
        style={{ backgroundColor: '#8b4513' }}
      >
        <div className="w-full h-full rounded-md p-[2px]" style={{ backgroundColor: '#d4af37' }}>
          <div
            className="w-full h-full rounded-sm flex flex-col items-center justify-center relative overflow-hidden font-display"
            style={{
              backgroundColor: '#f5f1e8',
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,.015) 2px, rgba(0,0,0,.015) 4px)',
            }}
          >
            {/* Colored accent bars */}
            <div className="absolute inset-x-0 h-1.5 top-0" style={{ backgroundColor: color }} />
            <div className="absolute inset-x-0 h-1.5 bottom-0" style={{ backgroundColor: color }} />

            <span className={`${fontSizeClasses[size]} font-bold`} style={{ color }}>{content.display}</span>
            {isUsedSecondChance && (
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>Used</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Card front design
  const CardFront = () => {
    if (isVintageTheme || content.isVintage) return <VintageCardFront />;

    return (
      <div
        className={`
          ${sizeClasses[size]}
          ${content.bgColor}
          ${content.borderColor}
          ${content.textColor}
          rounded-lg
          border-4
          flex
          flex-col
          items-center
          justify-center
          font-bold
          shadow-lg
          ${interactive ? 'cursor-pointer ring-2 ring-accent-gold ring-offset-2 ring-offset-gray-900 animate-pulse-soft' : ''}
          ${isUsedSecondChance ? 'opacity-50' : ''}
        `}
      >
        <span className={fontSizeClasses[size]}>{content.display}</span>
        {isUsedSecondChance && (
          <span className="text-[10px] font-semibold uppercase tracking-wide">Used</span>
        )}
      </div>
    );
  };

  // Entry animation variants
  const entryVariants = {
    hidden: { x: -200, y: -100, opacity: 0, scale: 0.5 },
    visible: {
      x: 0,
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 20,
        delay: entryDelay,
      },
    },
  };

  // Flip animation
  const flipVariants = {
    front: { rotateY: 0 },
    back: { rotateY: 180 },
  };

  // For used Second Chance, show dimmed card with "USED" indicator
  if (isUsedSecondChance) {
    return (
      <div className={`relative ${className}`} style={{ perspective: 1000 }}>
        <motion.div
          initial={animateEntry ? 'hidden' : 'visible'}
          animate="visible"
          variants={entryVariants}
          className="relative"
        >
          {/* Second Chance card (dimmed) with USED overlay */}
          <div className="opacity-50">
            <CardFront />
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
            <span className="text-white font-bold text-xs">USED</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`relative ${className} group`} style={{ perspective: 1000 }}>
      <motion.div
        initial={animateEntry ? 'hidden' : 'visible'}
        animate="visible"
        variants={entryVariants}
        onClick={interactive ? onClick : undefined}
        whileHover={interactive ? { scale: 1.05 } : {}}
        whileTap={interactive ? { scale: 0.95 } : {}}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={isFlipped ? 'back' : 'front'}
            initial={{ rotateY: isFlipped ? 0 : -180 }}
            animate={{ rotateY: 0 }}
            exit={{ rotateY: isFlipped ? -180 : 180 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {isFlipped ? <CardBack /> : <CardFront />}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Tooltip */}
      {showTooltip && !isFlipped && (
        <div className={`absolute hidden group-hover:block px-2 py-1 rounded text-xs -top-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-50 shadow-xl ${isVintageTheme ? 'bg-flip7-wood-dark text-flip7-card-base border border-flip7-gold' : 'bg-black/90 text-white'}`}>
          {getTooltipContent()}
        </div>
      )}
    </div>
  );
}
