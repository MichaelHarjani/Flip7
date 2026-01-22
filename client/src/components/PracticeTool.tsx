import { useState } from 'react';
import type { Card as CardType } from '@shared/types/index';

interface PracticeToolProps {
  onClose: () => void;
}

type FeedbackType = 'good' | 'bad' | 'neutral' | 'bad-beat';

interface Feedback {
  type: FeedbackType;
  message: string;
}

export default function PracticeTool({ onClose }: PracticeToolProps) {
  const [hand, setHand] = useState<CardType[]>([]);
  const [hasSecondChance, setHasSecondChance] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [deckStats, setDeckStats] = useState({
    numbersDrawn: [] as number[],
    totalDraws: 0
  });

  // Initialize a simple deck for practice
  const createDeck = (): CardType[] => {
    const deck: CardType[] = [];
    let cardIdCounter = 0;

    // Number cards: 12 twelves, 11 elevens, ..., 1 one, 1 zero
    for (let value = 12; value >= 0; value--) {
      const count = value === 0 ? 1 : value;
      for (let i = 0; i < count; i++) {
        deck.push({
          id: `card-${cardIdCounter++}`,
          type: 'number',
          value
        });
      }
    }

    // Add modifiers
    [2, 4, 6, 8, 10].forEach(value => {
      for (let i = 0; i < 3; i++) {
        deck.push({
          id: `card-${cardIdCounter++}`,
          type: 'modifier',
          modifierType: 'add',
          modifierValue: value
        });
      }
    });

    // Multiply modifier (only 1)
    deck.push({
      id: `card-${cardIdCounter++}`,
      type: 'modifier',
      modifierType: 'multiply',
      modifierValue: 2
    });

    // Action cards
    (['freeze', 'flipThree', 'secondChance'] as const).forEach(action => {
      for (let i = 0; i < 3; i++) {
        deck.push({
          id: `card-${cardIdCounter++}`,
          type: 'action',
          actionType: action
        });
      }
    });

    return deck;
  };

  const [deck] = useState(createDeck());

  const drawCard = (): CardType => {
    const availableDeck = deck.filter(card => {
      // Don't draw cards already in hand (for number cards only)
      if (card.type === 'number') {
        return !hand.some(h => h.type === 'number' && h.value === card.value);
      }
      return true;
    });

    const randomIndex = Math.floor(Math.random() * availableDeck.length);
    return availableDeck[randomIndex];
  };

  const calculateScore = (): number => {
    let score = 0;

    // Sum number cards
    const numberSum = hand
      .filter(card => card.type === 'number')
      .reduce((sum, card) => sum + (card.value || 0), 0);

    score = numberSum;

    // Apply multiply modifier
    const hasMultiplier = hand.some(card => card.type === 'modifier' && card.modifierType === 'multiply');
    if (hasMultiplier) {
      score *= 2;
    }

    // Add modifiers
    const addModifierSum = hand
      .filter(card => card.type === 'modifier' && card.modifierType === 'add')
      .reduce((sum, card) => sum + (card.modifierValue || 0), 0);

    score += addModifierSum;

    // Check for Flip 7 bonus
    const uniqueNumbers = hand.filter(card => card.type === 'number').length;
    if (uniqueNumbers >= 7) {
      score += 15;
    }

    return score;
  };

  const getNumberCards = () => hand.filter(card => card.type === 'number');
  const getBustProbability = (): number => {
    const numberCards = getNumberCards();
    if (numberCards.length === 0) return 0;

    // Calculate remaining number cards that would cause a bust
    const numbersInHand = numberCards.map(card => card.value);
    let bustCards = 0;

    numbersInHand.forEach(num => {
      if (num === 0) {
        bustCards += 1; // Only 1 zero
      } else {
        bustCards += num!; // The count of that number in the deck
      }
    });

    // Total remaining cards (approximate)
    const remainingCards = deck.length - deckStats.totalDraws;

    return remainingCards > 0 ? (bustCards / remainingCards) * 100 : 0;
  };

  const analyzeHitDecision = (currentScore: number, numberCount: number, hasMultiplier: boolean) => {
    const bustProb = getBustProbability();

    // Excellent hand - should consider staying
    if (currentScore >= 50) {
      if (numberCount >= 5) {
        return {
          type: 'bad' as FeedbackType,
          message: `Your score is ${currentScore} with ${numberCount} numbers. Bust probability is ${bustProb.toFixed(1)}%. This is risky - you should consider staying to bank this excellent score!`
        };
      }
      if (numberCount >= 4) {
        return {
          type: 'neutral' as FeedbackType,
          message: `Score: ${currentScore}. Bust chance: ${bustProb.toFixed(1)}%. This is a good score, but you could push for more if you're feeling lucky.`
        };
      }
    }

    // Good hand with multiplier
    if (hasMultiplier && numberCount >= 3 && currentScore >= 30) {
      return {
        type: 'neutral' as FeedbackType,
        message: `You have the ×2 multiplier! Current score: ${currentScore}. This is solid. Consider staying if you want to play safe.`
      };
    }

    // Many numbers = high risk
    if (numberCount >= 6) {
      return {
        type: 'bad' as FeedbackType,
        message: `WARNING: ${numberCount} numbers in hand! Bust probability: ${bustProb.toFixed(1)}%. Very dangerous to continue. ${hasSecondChance ? 'Good thing you have Second Chance!' : 'No Second Chance protection!'}`
      };
    }

    if (numberCount >= 5) {
      return {
        type: 'neutral' as FeedbackType,
        message: `${numberCount} numbers. Bust chance: ${bustProb.toFixed(1)}%. Moderate risk. ${hasSecondChance ? 'You have Second Chance, so one more draw is safer.' : 'No Second Chance - be careful!'}`
      };
    }

    // Low score - keep going
    if (currentScore < 20 && numberCount <= 3) {
      return {
        type: 'good' as FeedbackType,
        message: `Score is only ${currentScore}. Keep drawing! Low bust risk at ${bustProb.toFixed(1)}% with ${numberCount} numbers.`
      };
    }

    return {
      type: 'neutral' as FeedbackType,
      message: `Current score: ${currentScore}. Bust probability: ${bustProb.toFixed(1)}%. Make your choice!`
    };
  };

  const handleHit = () => {
    if (gameOver) return;

    const currentScore = calculateScore();
    const numberCount = getNumberCards().length;
    const hasMultiplier = hand.some(card => card.type === 'modifier' && card.modifierType === 'multiply');

    // Show feedback before drawing
    const decision = analyzeHitDecision(currentScore, numberCount, hasMultiplier);
    setFeedback(decision);

    // Small delay before drawing
    setTimeout(() => {
      const card = drawCard();
      setDeckStats(prev => ({
        ...prev,
        totalDraws: prev.totalDraws + 1,
        numbersDrawn: card.type === 'number' && card.value !== undefined
          ? [...prev.numbersDrawn, card.value]
          : prev.numbersDrawn
      }));

      // Check for bust
      if (card.type === 'number' && hand.some(h => h.type === 'number' && h.value === card.value)) {
        if (hasSecondChance) {
          // Second Chance saves us
          setHasSecondChance(false);
          setFeedback({
            type: 'good',
            message: `You drew a duplicate ${card.value}, but Second Chance saved you! The card was discarded. Keep playing!`
          });
        } else {
          // Bust!
          setGameOver(true);

          // Check if it was a bad beat (high probability of success)
          const bustProb = getBustProbability();
          const wasBadBeat = bustProb < 15 && currentScore > 40;

          setFeedback({
            type: wasBadBeat ? 'bad-beat' : 'bad',
            message: wasBadBeat
              ? `BUST! You drew duplicate ${card.value}. Bad beat - you only had ${bustProb.toFixed(1)}% chance of busting! Your ${currentScore}-point hand is lost.`
              : `BUST! You drew duplicate ${card.value}. Your ${currentScore}-point hand is lost. ${bustProb > 20 ? 'This was risky - high bust probability!' : 'Unlucky draw!'}`
          });
        }
      } else if (card.type === 'action' && card.actionType === 'secondChance') {
        setHand([...hand, card]);
        setHasSecondChance(true);
        setFeedback({
          type: 'good',
          message: 'Second Chance acquired! You now have protection against one bust. Play more aggressively!'
        });
      } else if (card.type === 'number') {
        setHand([...hand, card]);

        const newNumberCount = numberCount + 1;

        // Check for Flip 7
        if (newNumberCount === 7) {
          setGameOver(true);
          const finalScore = calculateScore();
          setFeedback({
            type: 'good',
            message: `FLIP 7! You collected 7 unique numbers! Final score: ${finalScore} points (includes +15 Flip 7 bonus). Excellent!`
          });
        } else {
          const newScore = calculateScore();
          setFeedback({
            type: 'neutral',
            message: `Drew number ${card.value}. New score: ${newScore}. You have ${newNumberCount} numbers.`
          });
        }
      } else {
        // Modifier card
        setHand([...hand, card]);
        const newScore = calculateScore();
        const cardDesc = card.type === 'modifier' && card.modifierType === 'multiply'
          ? '×2 Multiplier'
          : `+${card.modifierValue} Modifier`;
        setFeedback({
          type: 'good',
          message: `Drew ${cardDesc}! Safe draw (can't bust on modifiers). New score: ${newScore}.`
        });
      }
    }, 300);
  };

  const handleStay = () => {
    if (gameOver) return;

    const finalScore = calculateScore();
    const numberCount = getNumberCards().length;
    const bustProb = getBustProbability();

    setGameOver(true);

    // Analyze if staying was a good decision
    let feedbackMsg = '';
    let feedbackType: FeedbackType = 'neutral';

    if (finalScore >= 60) {
      feedbackMsg = `Excellent choice! You banked ${finalScore} points - a very strong score!`;
      feedbackType = 'good';
    } else if (finalScore >= 40) {
      if (numberCount <= 3 && bustProb < 10) {
        feedbackMsg = `You stayed at ${finalScore} points. This is decent, but you could have safely drawn more cards (only ${bustProb.toFixed(1)}% bust risk with ${numberCount} numbers).`;
        feedbackType = 'neutral';
      } else {
        feedbackMsg = `Good decision! You banked ${finalScore} points. With ${numberCount} numbers and ${bustProb.toFixed(1)}% bust risk, staying was smart.`;
        feedbackType = 'good';
      }
    } else if (finalScore >= 25) {
      if (numberCount <= 2) {
        feedbackMsg = `You stayed at ${finalScore} points with only ${numberCount} numbers. This is very conservative - you could have taken more risks!`;
        feedbackType = 'bad';
      } else {
        feedbackMsg = `You banked ${finalScore} points. Moderate score - you played it safe.`;
        feedbackType = 'neutral';
      }
    } else {
      feedbackMsg = `You stayed at only ${finalScore} points. This is quite low - in a real game, opponents will likely outscore you. Consider being more aggressive!`;
      feedbackType = 'bad';
    }

    setFeedback({
      type: feedbackType,
      message: feedbackMsg
    });
  };

  const handleReset = () => {
    setHand([]);
    setHasSecondChance(false);
    setGameOver(false);
    setFeedback(null);
    setDeckStats({
      numbersDrawn: [],
      totalDraws: 0
    });
  };

  const renderCard = (card: CardType, index: number) => {
    let cardContent = '';
    let cardColor = 'bg-gray-700 border-gray-500';

    if (card.type === 'number') {
      cardContent = card.value?.toString() || '0';
      cardColor = 'bg-blue-700 border-blue-500';
    } else if (card.type === 'modifier') {
      if (card.modifierType === 'add') {
        cardContent = `+${card.modifierValue}`;
        cardColor = 'bg-green-700 border-green-500';
      } else if (card.modifierType === 'multiply') {
        cardContent = '×2';
        cardColor = 'bg-purple-700 border-purple-500';
      }
    } else if (card.type === 'action') {
      if (card.actionType === 'secondChance') {
        cardContent = '2nd';
        cardColor = 'bg-yellow-700 border-yellow-500';
      } else if (card.actionType === 'freeze') {
        cardContent = 'FRZ';
        cardColor = 'bg-cyan-700 border-cyan-500';
      } else if (card.actionType === 'flipThree') {
        cardContent = 'FL3';
        cardColor = 'bg-orange-700 border-orange-500';
      }
    }

    return (
      <div
        key={index}
        className={`${cardColor} border-2 rounded-lg p-3 min-w-[60px] flex items-center justify-center font-bold text-xl text-white shadow-lg`}
      >
        {cardContent}
      </div>
    );
  };

  const currentScore = calculateScore();
  const bustProb = getBustProbability();
  const numberCount = getNumberCards().length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border-4 border-gray-700 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 p-4 rounded-t-lg flex justify-between items-center border-b-4 border-gray-700">
          <h1 className="text-2xl font-bold text-white">Practice Mode</h1>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 text-3xl font-bold leading-none"
            aria-label="Close practice tool"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Instructions */}
          <div className="bg-blue-900 border border-blue-500 p-4 rounded-lg">
            <p className="text-white font-semibold mb-2">How Practice Mode Works:</p>
            <ul className="text-sm text-gray-200 space-y-1 list-disc list-inside">
              <li>Draw cards and decide when to stay, just like a real game</li>
              <li>Get real-time feedback on your decisions and probabilities</li>
              <li>Learn when you're taking too much risk or playing too conservatively</li>
              <li>Understand the math behind bust probability and scoring</li>
            </ul>
          </div>

          {/* Current Hand */}
          <div className="bg-gray-800 border-2 border-gray-600 p-4 rounded-lg">
            <h2 className="text-xl font-bold text-white mb-3">Your Hand</h2>
            {hand.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No cards yet. Click HIT to start!</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {hand.map((card, index) => renderCard(card, index))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-900 border border-blue-500 p-3 rounded-lg">
              <p className="text-xs text-blue-200 mb-1">Current Score</p>
              <p className="text-2xl font-bold text-white">{currentScore}</p>
            </div>
            <div className="bg-purple-900 border border-purple-500 p-3 rounded-lg">
              <p className="text-xs text-purple-200 mb-1">Number Cards</p>
              <p className="text-2xl font-bold text-white">{numberCount}</p>
            </div>
            <div className={`${bustProb > 20 ? 'bg-red-900 border-red-500' : bustProb > 10 ? 'bg-yellow-900 border-yellow-500' : 'bg-green-900 border-green-500'} border p-3 rounded-lg`}>
              <p className="text-xs text-gray-200 mb-1">Bust Probability</p>
              <p className="text-2xl font-bold text-white">{bustProb.toFixed(1)}%</p>
            </div>
            <div className="bg-yellow-900 border border-yellow-500 p-3 rounded-lg">
              <p className="text-xs text-yellow-200 mb-1">Second Chance</p>
              <p className="text-2xl font-bold text-white">{hasSecondChance ? '✓' : '✗'}</p>
            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`border-2 p-4 rounded-lg ${
              feedback.type === 'good'
                ? 'bg-green-900 border-green-500'
                : feedback.type === 'bad'
                ? 'bg-red-900 border-red-500'
                : feedback.type === 'bad-beat'
                ? 'bg-orange-900 border-orange-500'
                : 'bg-blue-900 border-blue-500'
            }`}>
              <p className={`font-semibold mb-1 ${
                feedback.type === 'good'
                  ? 'text-green-200'
                  : feedback.type === 'bad'
                  ? 'text-red-200'
                  : feedback.type === 'bad-beat'
                  ? 'text-orange-200'
                  : 'text-blue-200'
              }`}>
                {feedback.type === 'good' ? '✓ Good Decision' : feedback.type === 'bad' ? '✗ Risky Decision' : feedback.type === 'bad-beat' ? '⚠ Bad Beat' : 'ℹ Information'}
              </p>
              <p className="text-white">{feedback.message}</p>
            </div>
          )}

          {/* Math Explanation */}
          {hand.length > 0 && !gameOver && (
            <div className="bg-gray-800 border border-gray-600 p-4 rounded-lg">
              <p className="text-white font-semibold mb-2">📊 Score Breakdown:</p>
              <div className="text-sm text-gray-300 space-y-1">
                {(() => {
                  const numbers = hand.filter(c => c.type === 'number');
                  const numberSum = numbers.reduce((sum, c) => sum + (c.value || 0), 0);
                  const hasMultiplier = hand.some(c => c.type === 'modifier' && c.modifierType === 'multiply');
                  const addMods = hand.filter(c => c.type === 'modifier' && c.modifierType === 'add');
                  const addModSum = addMods.reduce((sum, c) => sum + (c.modifierValue || 0), 0);
                  const isFlip7 = numbers.length >= 7;

                  return (
                    <>
                      {numbers.length > 0 && (
                        <p>
                          Numbers: {numbers.map(c => c.value).join(' + ')} = {numberSum}
                        </p>
                      )}
                      {hasMultiplier && (
                        <p>
                          Multiplier: {numberSum} × 2 = {numberSum * 2}
                        </p>
                      )}
                      {addMods.length > 0 && (
                        <p>
                          Add Modifiers: {addMods.map(c => `+${c.modifierValue}`).join(' + ')} = +{addModSum}
                        </p>
                      )}
                      {isFlip7 && (
                        <p className="text-yellow-400 font-bold">
                          Flip 7 Bonus: +15 points!
                        </p>
                      )}
                      <p className="border-t border-gray-600 pt-1 mt-1 font-bold text-white">
                        Total: {currentScore} points
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="bg-gray-800 p-4 rounded-b-lg border-t-4 border-gray-700">
          {!gameOver ? (
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleHit}
                className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold text-lg transition-all transform hover:scale-105"
              >
                HIT
              </button>
              <button
                onClick={handleStay}
                disabled={hand.length === 0}
                className={`px-8 py-3 rounded-lg font-bold text-lg transition-all ${
                  hand.length === 0
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-yellow-600 hover:bg-yellow-500 text-white transform hover:scale-105'
                }`}
              >
                STAY
              </button>
            </div>
          ) : (
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleReset}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-lg transition-all transform hover:scale-105"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-bold text-lg transition-all transform hover:scale-105"
              >
                Exit Practice
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
