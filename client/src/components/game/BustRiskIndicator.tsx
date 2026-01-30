import { motion } from 'framer-motion';
import { AlertTriangle, Shield, Zap } from 'lucide-react';
import type { Card as CardType, Player } from '@shared/types/index';

interface BustRiskIndicatorProps {
  player: Player;
  deck: CardType[];
  showDetails?: boolean;
  className?: string;
}

export default function BustRiskIndicator({
  player,
  deck,
  showDetails = false,
  className = '',
}: BustRiskIndicatorProps) {
  // Calculate bust probability
  const calculateBustProbability = (): number => {
    const numberCards = player.cards.filter((c) => c.type === 'number');
    if (numberCards.length === 0 || deck.length === 0) return 0;

    // Get the numbers already in hand
    const numbersInHand = new Set(numberCards.map((c) => c.value));

    // Count how many cards in the remaining deck would cause a bust
    const bustCards = deck.filter(
      (c) => c.type === 'number' && numbersInHand.has(c.value)
    ).length;

    return (bustCards / deck.length) * 100;
  };

  // Check if Flip 7 is possible (need 7 unique number cards)
  const getFlip7Status = () => {
    const numberCards = player.cards.filter((c) => c.type === 'number');
    const uniqueCount = numberCards.length;
    const remaining = 7 - uniqueCount;

    if (uniqueCount >= 7) {
      return { possible: true, achieved: true, remaining: 0 };
    }

    // Check if there are enough unique numbers left in the deck
    const numbersInHand = new Set(numberCards.map((c) => c.value));
    const uniqueNumbersInDeck = new Set(
      deck.filter((c) => c.type === 'number' && !numbersInHand.has(c.value)).map((c) => c.value)
    );

    return {
      possible: uniqueNumbersInDeck.size >= remaining,
      achieved: false,
      remaining,
    };
  };

  // Check if player has Second Chance protection
  const hasSecondChance = player.cards.some(
    (c) => c.type === 'action' && c.actionType === 'secondChance'
  );

  const bustProbability = calculateBustProbability();
  const flip7Status = getFlip7Status();

  // Risk level styling
  const getRiskLevel = () => {
    if (bustProbability < 10) return { level: 'low', color: 'text-green-400', bg: 'bg-green-900/30' };
    if (bustProbability < 25) return { level: 'medium', color: 'text-yellow-400', bg: 'bg-yellow-900/30' };
    return { level: 'high', color: 'text-red-400', bg: 'bg-red-900/30' };
  };

  const risk = getRiskLevel();

  return (
    <div className={`${className}`}>
      {/* Main risk display */}
      <motion.div
        className={`
          rounded-lg
          ${risk.bg}
          border
          ${bustProbability >= 25 ? 'border-red-600/50' : bustProbability >= 10 ? 'border-yellow-600/50' : 'border-green-600/50'}
          p-3 sm:p-4
        `}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        key={Math.round(bustProbability)} // Re-animate on significant change
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${risk.color}`} />
            <span className="text-sm font-medium text-gray-300">Bust Risk</span>
          </div>
          <motion.span
            className={`text-xl font-bold ${risk.color}`}
            key={bustProbability}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {bustProbability.toFixed(1)}%
          </motion.span>
        </div>

        {/* Risk bar */}
        <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              bustProbability >= 25
                ? 'bg-gradient-to-r from-red-600 to-red-400'
                : bustProbability >= 10
                ? 'bg-gradient-to-r from-yellow-600 to-yellow-400'
                : 'bg-gradient-to-r from-green-600 to-green-400'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(bustProbability, 100)}%` }}
            transition={{ type: 'spring', stiffness: 100 }}
          />
        </div>

        {showDetails && (
          <div className="mt-3 space-y-2 text-sm">
            {/* Second Chance indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Shield className={`w-4 h-4 ${hasSecondChance ? 'text-pink-400' : 'text-gray-500'}`} />
                <span className="text-gray-400">Second Chance</span>
              </div>
              <span className={hasSecondChance ? 'text-pink-400 font-medium' : 'text-gray-500'}>
                {hasSecondChance ? 'Protected' : 'None'}
              </span>
            </div>

            {/* Flip 7 status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Zap className={`w-4 h-4 ${flip7Status.achieved ? 'text-yellow-400' : flip7Status.possible ? 'text-blue-400' : 'text-gray-500'}`} />
                <span className="text-gray-400">Flip 7</span>
              </div>
              <span className={
                flip7Status.achieved
                  ? 'text-yellow-400 font-bold'
                  : flip7Status.possible
                  ? 'text-blue-400'
                  : 'text-gray-500'
              }>
                {flip7Status.achieved
                  ? 'Achieved!'
                  : flip7Status.possible
                  ? `${flip7Status.remaining} more needed`
                  : 'Not possible'}
              </span>
            </div>

            {/* Card counts */}
            <div className="flex items-center justify-between text-gray-500">
              <span>Cards in hand</span>
              <span>{player.cards.length}</span>
            </div>
            <div className="flex items-center justify-between text-gray-500">
              <span>Deck remaining</span>
              <span>{deck.length}</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
