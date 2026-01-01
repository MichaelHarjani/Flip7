import type { Card, Player, GameState } from '../shared/types/index.js';
import { calculateScore, hasFlip7, checkBust, getActivePlayers } from '../shared/utils/gameLogic.js';

export interface AIDecision {
  action: 'hit' | 'stay';
  actionCard?: {
    cardId: string;
    targetPlayerId?: string;
  };
}

/**
 * Calculate probability of busting on next card
 */
function calculateBustProbability(
  player: Player,
  deck: Card[],
  discardPile: Card[]
): number {
  const drawnNumbers = new Set(
    player.numberCards
      .filter(c => c.type === 'number' && c.value !== undefined)
      .map(c => c.value)
  );

  // Count remaining number cards that would cause a bust
  const allCards = [...deck, ...discardPile];
  const numberCards = allCards.filter(c => c.type === 'number' && c.value !== undefined);
  
  let bustCards = 0;
  for (const number of drawnNumbers) {
    bustCards += numberCards.filter(c => c.value === number).length;
  }

  const totalNumberCards = numberCards.length;
  return totalNumberCards > 0 ? bustCards / totalNumberCards : 1;
}

/**
 * Calculate expected value of hitting
 */
function calculateExpectedValue(
  player: Player,
  deck: Card[],
  discardPile: Card[]
): number {
  const currentScore = calculateScore(player);
  const bustProb = calculateBustProbability(player, deck, discardPile);
  
  // If we bust, score is 0
  const bustValue = 0;
  
  // Estimate average value of a new number card (roughly 6.5)
  const avgCardValue = 6.5;
  const newScoreEstimate = currentScore + avgCardValue;
  
  // Expected value = (1 - bustProb) * newScore - bustProb * 0
  return (1 - bustProb) * newScoreEstimate;
}

/**
 * Make AI decision based on difficulty and game state
 */
export function makeAIDecision(
  player: Player,
  gameState: GameState,
  difficulty: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
): AIDecision {
  // PRIORITY: Check for pending action card that must be resolved immediately
  if (gameState.pendingActionCard && gameState.pendingActionCard.playerId === player.id) {
    const pendingCard = gameState.pendingActionCard;
    const targetPlayerId = selectActionCardTarget(player, gameState, pendingCard.actionType);
    
    return {
      action: 'stay', // Action card resolution doesn't require hit/stay
      actionCard: {
        cardId: pendingCard.cardId,
        targetPlayerId: targetPlayerId,
      },
    };
  }

  // Check if player has Flip 7 - always stay
  if (hasFlip7(player)) {
    return { action: 'stay' };
  }

  // Check if player has busted - can't do anything
  if (player.hasBusted) {
    return { action: 'stay' };
  }

  const currentScore = calculateScore(player);
  const bustProb = calculateBustProbability(
    player,
    gameState.deck,
    gameState.discardPile
  );
  const expectedValue = calculateExpectedValue(
    player,
    gameState.deck,
    gameState.discardPile
  );

  // Count unique numbers for Flip 7 progress
  const uniqueNumbers = new Set(
    player.numberCards
      .filter(c => c.type === 'number' && c.value !== undefined)
      .map(c => c.value)
  );
  const flip7Progress = uniqueNumbers.size;

  // Get opponent scores
  const opponents = gameState.players.filter(p => p.id !== player.id);
  const maxOpponentScore = Math.max(...opponents.map(p => p.score));
  const isBehind = player.score < maxOpponentScore;

  // Decision thresholds based on difficulty
  const thresholds = {
    conservative: {
      maxBustProb: 0.15, // Very risk-averse
      minScoreToStay: 25,
      flip7Threshold: 5, // Stay if 5+ unique numbers
    },
    moderate: {
      maxBustProb: 0.25,
      minScoreToStay: 30,
      flip7Threshold: 6, // Stay if 6 unique numbers
    },
    aggressive: {
      maxBustProb: 0.35, // More willing to take risks
      minScoreToStay: 40,
      flip7Threshold: 6, // Go for Flip 7 more aggressively
    },
  };

  const threshold = thresholds[difficulty];

  // Decision logic
  let shouldHit = true;

  // Always stay if bust probability is too high
  if (bustProb > threshold.maxBustProb) {
    shouldHit = false;
  }

  // Stay if we have good score and are close to Flip 7
  if (currentScore >= threshold.minScoreToStay && flip7Progress >= threshold.flip7Threshold) {
    shouldHit = false;
  }

  // Stay if we have very high score
  if (currentScore >= 50) {
    shouldHit = false;
  }

  // If behind, be more aggressive
  if (isBehind && difficulty !== 'conservative') {
    if (bustProb < threshold.maxBustProb + 0.1) {
      shouldHit = true;
    }
  }

  // If close to Flip 7, be more aggressive
  if (flip7Progress >= 5 && expectedValue > currentScore * 0.8) {
    shouldHit = true;
  }

  // Check for action cards to play
  const actionCardDecision = decideActionCardUsage(player, gameState);
  if (actionCardDecision) {
    return {
      action: shouldHit ? 'hit' : 'stay',
      actionCard: actionCardDecision,
    };
  }

  return {
    action: shouldHit ? 'hit' : 'stay',
  };
}

/**
 * Select a target for an action card (Freeze or Flip Three)
 */
function selectActionCardTarget(
  player: Player,
  gameState: GameState,
  actionType: 'freeze' | 'flipThree'
): string | undefined {
  const activePlayers = getActivePlayers(gameState.players);
  const otherActivePlayers = activePlayers.filter(p => p.id !== player.id);
  
  if (otherActivePlayers.length === 0) {
    // No other active players - target self
    return player.id;
  }
  
  if (actionType === 'freeze') {
    // For Freeze: Target the player with the highest round score (most threatening)
    // If tied, target the one closest to Flip 7
    let bestTarget = otherActivePlayers[0];
    let bestScore = gameState.roundScores[bestTarget.id] || calculateScore(bestTarget);
    let bestFlip7Progress = new Set(
      bestTarget.numberCards
        .filter(c => c.type === 'number' && c.value !== undefined)
        .map(c => c.value)
    ).size;
    
    for (const opponent of otherActivePlayers) {
      const opponentScore = gameState.roundScores[opponent.id] || calculateScore(opponent);
      const opponentFlip7Progress = new Set(
        opponent.numberCards
          .filter(c => c.type === 'number' && c.value !== undefined)
          .map(c => c.value)
      ).size;
      
      // Prefer higher score, or if tied, prefer closer to Flip 7
      if (opponentScore > bestScore || 
          (opponentScore === bestScore && opponentFlip7Progress > bestFlip7Progress)) {
        bestTarget = opponent;
        bestScore = opponentScore;
        bestFlip7Progress = opponentFlip7Progress;
      }
    }
    
    return bestTarget.id;
  } else if (actionType === 'flipThree') {
    // For Flip Three: Always target self to prevent game freezing
    // This ensures the AI doesn't get stuck trying to select a target
    return player.id;
  }
  
  // Fallback: target first other player
  return otherActivePlayers[0].id;
}

/**
 * Decide if and how to use action cards
 */
function decideActionCardUsage(
  player: Player,
  gameState: GameState
): { cardId: string; targetPlayerId?: string } | undefined {
  // For now, AI doesn't strategically use action cards
  // They're used automatically when dealt
  // This could be enhanced for more strategic play
  return undefined;
}

