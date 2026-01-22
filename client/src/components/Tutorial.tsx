import { useState } from 'react';

interface TutorialProps {
  onClose: () => void;
}

type TutorialStep =
  | 'welcome'
  | 'objective'
  | 'numbers'
  | 'modifiers'
  | 'actions-freeze'
  | 'actions-flip-three'
  | 'actions-second-chance'
  | 'bust'
  | 'scoring'
  | 'flip-seven'
  | 'strategy-basics'
  | 'strategy-second-chance'
  | 'strategy-action-cards'
  | 'complete';

export default function Tutorial({ onClose }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState<TutorialStep>('welcome');

  const nextStep = () => {
    const steps: TutorialStep[] = [
      'welcome',
      'objective',
      'numbers',
      'modifiers',
      'actions-freeze',
      'actions-flip-three',
      'actions-second-chance',
      'bust',
      'scoring',
      'flip-seven',
      'strategy-basics',
      'strategy-second-chance',
      'strategy-action-cards',
      'complete'
    ];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: TutorialStep[] = [
      'welcome',
      'objective',
      'numbers',
      'modifiers',
      'actions-freeze',
      'actions-flip-three',
      'actions-second-chance',
      'bust',
      'scoring',
      'flip-seven',
      'strategy-basics',
      'strategy-second-chance',
      'strategy-action-cards',
      'complete'
    ];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const getStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-center text-white">Welcome to Flip 7!</h2>
            <p className="text-lg text-gray-300">
              Flip 7 is an exciting press-your-luck card game where strategy meets chance.
              Your goal is to collect cards to score points, but be careful - drawing the wrong
              card can bust your hand!
            </p>
            <p className="text-lg text-gray-300">
              This tutorial will teach you everything you need to know to become a Flip 7 master.
            </p>
          </div>
        );

      case 'objective':
        return (
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-center text-white">Game Objective</h2>
            <div className="bg-blue-900 border-2 border-blue-500 p-4 rounded-lg">
              <p className="text-xl font-bold text-center text-white">
                Be the first player to reach 200 points!
              </p>
            </div>
            <div className="space-y-3 text-gray-300">
              <p>Each round, players take turns drawing cards to build their hand.</p>
              <p><strong className="text-white">On your turn, you can:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong className="text-green-400">HIT:</strong> Draw a card from the deck</li>
                <li><strong className="text-yellow-400">STAY:</strong> End your turn and bank your current score</li>
              </ul>
              <p>At the end of each round, your score is added to your total. The game continues until someone reaches 200 points!</p>
            </div>
          </div>
        );

      case 'numbers':
        return (
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-center text-white">Number Cards</h2>
            <p className="text-gray-300">
              Number cards (0-12) form the foundation of your hand. Each number is worth its face value.
            </p>
            <div className="bg-blue-900 border-2 border-blue-500 p-4 rounded-lg mb-3">
              <p className="text-lg font-bold text-white mb-2">Deck Composition:</p>
              <p className="text-gray-200">
                The deck contains <strong>multiple copies</strong> of most numbers:
              </p>
              <ul className="text-sm text-gray-300 mt-2 space-y-1 ml-4">
                <li>1 zero, 1 one, 2 twos, 3 threes...</li>
                <li>...all the way up to 12 twelves</li>
              </ul>
              <p className="text-gray-200 mt-2 text-sm">
                So there are many 12s, 11s, 10s in the deck, but only one 0!
              </p>
            </div>
            <div className="bg-red-900 border-2 border-red-500 p-4 rounded-lg">
              <p className="text-lg font-bold text-white mb-2">CRITICAL RULE:</p>
              <p className="text-gray-200">
                <strong>YOU</strong> can only hold ONE of each number in <strong>YOUR HAND</strong>!
              </p>
              <p className="text-gray-200 mt-2">
                If you draw a number you already have, you <strong>BUST</strong> and score 0 for the round.
              </p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg space-y-2">
              <p className="text-white font-semibold">Example:</p>
              <p className="text-gray-300">
                ✓ You have: 5, 7, 12 (Valid - all different numbers in your hand)
              </p>
              <p className="text-gray-300">
                ✗ You have: 5, 7, 12 → Draw: 7 (BUST! - you already have a 7)
              </p>
              <p className="text-gray-400 text-sm mt-3">
                Note: Even though the deck has multiple 7s, YOU can only hold one 7 at a time.
              </p>
            </div>
          </div>
        );

      case 'modifiers':
        return (
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-center text-white">Modifier Cards</h2>
            <p className="text-gray-300">
              Modifier cards boost your score. Unlike number cards, you can hold multiple modifier cards!
            </p>

            <div className="space-y-3">
              <div className="bg-green-900 border-2 border-green-500 p-4 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-2">Add Modifiers</h3>
                <p className="text-gray-200 mb-2">
                  +2, +4, +6, +8, +10 cards add bonus points to your score
                </p>
                <div className="bg-gray-800 p-3 rounded space-y-1 text-sm">
                  <p className="text-gray-300"><strong className="text-white">Example:</strong></p>
                  <p className="text-gray-300">Numbers: 5 + 7 + 12 = 24 points</p>
                  <p className="text-gray-300">Modifiers: +4, +4 = +8 points</p>
                  <p className="text-green-400 font-bold">Total: 24 + 8 = 32 points</p>
                </div>
              </div>

              <div className="bg-purple-900 border-2 border-purple-500 p-4 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-2">×2 Multiplier</h3>
                <p className="text-gray-200 mb-2">
                  Only ONE ×2 card exists in the deck. It doubles your number card sum before adding modifiers!
                </p>
                <div className="bg-gray-800 p-3 rounded space-y-1 text-sm">
                  <p className="text-gray-300"><strong className="text-white">Example:</strong></p>
                  <p className="text-gray-300">Numbers: 5 + 7 + 12 = 24 points</p>
                  <p className="text-gray-300">×2 Multiplier: 24 × 2 = 48 points</p>
                  <p className="text-gray-300">Add Modifiers: +4, +4 = +8 points</p>
                  <p className="text-purple-400 font-bold">Total: 48 + 8 = 56 points</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'actions-freeze':
        return (
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-center text-white">Action Cards: FREEZE</h2>
            <div className="bg-cyan-900 border-2 border-cyan-500 p-4 rounded-lg">
              <p className="text-lg text-gray-200">
                FREEZE forces a player to immediately end their turn and bank their current score.
              </p>
            </div>

            <div className="space-y-3 text-gray-300">
              <p><strong className="text-white">How it works:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Can be played on yourself OR an opponent</li>
                <li>The frozen player's turn ends immediately</li>
                <li>Their current score is banked (added to their total)</li>
                <li>They cannot draw any more cards this round</li>
              </ul>

              <div className="bg-gray-800 p-4 rounded-lg">
                <p className="text-white font-semibold mb-2">Strategic use:</p>
                <p className="text-gray-300">
                  <strong className="text-cyan-400">Offensive:</strong> Freeze opponents when they have a low score
                  to prevent them from building a bigger hand.
                </p>
                <p className="text-gray-300 mt-2">
                  <strong className="text-green-400">Defensive:</strong> Freeze yourself when you have a great hand
                  to avoid the risk of busting!
                </p>
              </div>
            </div>
          </div>
        );

      case 'actions-flip-three':
        return (
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-center text-white">Action Cards: FLIP THREE</h2>
            <div className="bg-orange-900 border-2 border-orange-500 p-4 rounded-lg">
              <p className="text-lg text-gray-200">
                FLIP THREE forces a player to immediately draw and accept 3 cards from the deck.
              </p>
            </div>

            <div className="space-y-3 text-gray-300">
              <p><strong className="text-white">How it works:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Can be played on yourself OR an opponent</li>
                <li>The target must draw 3 cards immediately</li>
                <li>Cards are resolved one at a time</li>
                <li>If a bust or Flip 7 happens before all 3 cards are drawn, drawing stops</li>
              </ul>

              <div className="bg-gray-800 p-4 rounded-lg">
                <p className="text-white font-semibold mb-2">High risk, high reward:</p>
                <p className="text-gray-300">
                  <strong className="text-orange-400">On opponents:</strong> Risky! They might get great cards
                  (modifiers, action cards) or they might bust from duplicates.
                </p>
                <p className="text-gray-300 mt-2">
                  <strong className="text-red-400">On yourself:</strong> Very dangerous! Only use when desperate
                  or if you have Second Chance protection.
                </p>
              </div>
            </div>
          </div>
        );

      case 'actions-second-chance':
        return (
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-center text-white">Action Cards: SECOND CHANCE</h2>
            <div className="bg-yellow-900 border-2 border-yellow-500 p-4 rounded-lg">
              <p className="text-lg text-gray-200">
                SECOND CHANCE protects you from ONE bust. It's your safety net!
              </p>
            </div>

            <div className="space-y-3 text-gray-300">
              <p><strong className="text-white">How it works:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Automatically activates when you draw a duplicate number</li>
                <li>The duplicate card is discarded instead of causing a bust</li>
                <li>One Second Chance = one saved bust</li>
                <li>You can hold multiple Second Chance cards for multiple saves</li>
                <li>Discarded at the end of the round (doesn't carry over)</li>
              </ul>

              <div className="bg-gray-800 p-4 rounded-lg space-y-2">
                <p className="text-white font-semibold">Example:</p>
                <p className="text-gray-300">You have: 3, 7, 10, SECOND CHANCE</p>
                <p className="text-gray-300">You draw: 7 (would normally bust)</p>
                <p className="text-green-400">→ Second Chance saves you! The 7 is discarded.</p>
                <p className="text-gray-300">You can keep playing with: 3, 7, 10</p>
              </div>

              <div className="bg-blue-900 border border-blue-500 p-3 rounded-lg mt-3">
                <p className="text-blue-200 text-sm">
                  <strong>Note:</strong> If you already have Second Chance and draw another one,
                  it goes to a random opponent. If no one can take it, it's discarded.
                </p>
              </div>
            </div>
          </div>
        );

      case 'bust':
        return (
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-center text-white">Busting</h2>
            <div className="bg-red-900 border-2 border-red-500 p-4 rounded-lg">
              <p className="text-xl font-bold text-white text-center mb-2">BUST = 0 Points</p>
              <p className="text-gray-200 text-center">
                Drawing a duplicate number card ends your turn with zero points!
              </p>
            </div>

            <div className="space-y-3 text-gray-300">
              <p><strong className="text-white">What causes a bust:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Drawing a number card that you already have in your hand</li>
                <li>Only number cards (0-12) can cause busts</li>
              </ul>

              <p><strong className="text-white">What does NOT cause a bust:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Modifier cards (+2, +4, +6, +8, +10, ×2) - you can have multiples!</li>
                <li>Action cards (FREEZE, FLIP THREE, SECOND CHANCE)</li>
                <li>Your initial card dealt at the start of the round</li>
              </ul>

              <div className="bg-gray-800 p-4 rounded-lg space-y-2">
                <p className="text-white font-semibold">Examples:</p>
                <p className="text-green-400">✓ Have: 5, 7, +4, +4 → Draw: +4 (OK! Can hold multiple modifiers)</p>
                <p className="text-green-400">✓ Have: 3, 8, 12 → Draw: FREEZE (OK! Action cards don't bust)</p>
                <p className="text-red-400">✗ Have: 5, 7, 12 → Draw: 5 (BUST! Duplicate number)</p>
              </div>

              <div className="bg-yellow-900 border border-yellow-500 p-3 rounded-lg mt-3">
                <p className="text-yellow-200">
                  <strong>Remember:</strong> Second Chance cards can save you from a bust!
                  Always pay attention to whether you have one.
                </p>
              </div>
            </div>
          </div>
        );

      case 'scoring':
        return (
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-center text-white">Scoring System</h2>
            <p className="text-gray-300">
              Understanding how scores are calculated is key to maximizing your points!
            </p>

            <div className="bg-gray-800 border-2 border-gray-600 p-4 rounded-lg space-y-3">
              <p className="text-white font-bold text-lg">Score Calculation Order:</p>
              <ol className="list-decimal list-inside space-y-2 text-gray-300 ml-2">
                <li><strong className="text-white">Sum all number cards</strong> (0-12)</li>
                <li><strong className="text-purple-400">Apply ×2 multiplier</strong> (if you have it)</li>
                <li><strong className="text-green-400">Add all add modifiers</strong> (+2, +4, +6, +8, +10)</li>
                <li><strong className="text-yellow-400">Add Flip 7 bonus</strong> (if applicable - see next section)</li>
              </ol>
            </div>

            <div className="bg-blue-900 border border-blue-500 p-4 rounded-lg">
              <p className="text-white font-semibold mb-3">Full Example:</p>
              <div className="space-y-1 text-sm text-gray-200">
                <p>Your hand: 5, 7, 12, ×2, +4, +4, +6</p>
                <p className="border-t border-blue-500 pt-2 mt-2">
                  <strong>Step 1:</strong> Sum numbers: 5 + 7 + 12 = 24
                </p>
                <p>
                  <strong>Step 2:</strong> Apply ×2: 24 × 2 = 48
                </p>
                <p>
                  <strong>Step 3:</strong> Add modifiers: 48 + 4 + 4 + 6 = 62
                </p>
                <p className="text-blue-300 font-bold border-t border-blue-500 pt-2 mt-2">
                  Final Score: 62 points
                </p>
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-white font-semibold mb-2">When is your score banked?</p>
              <ul className="list-disc list-inside space-y-1 text-gray-300">
                <li>When you choose to STAY</li>
                <li>When you get FROZEN (by yourself or opponent)</li>
                <li>When you achieve Flip 7 (see next section)</li>
              </ul>
              <p className="text-red-400 mt-2">If you BUST, you score 0 for the round!</p>
            </div>
          </div>
        );

      case 'flip-seven':
        return (
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-center text-white">Flip 7 Bonus</h2>
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 border-2 border-yellow-400 p-4 rounded-lg">
              <p className="text-2xl font-bold text-white text-center mb-2">+15 BONUS POINTS!</p>
              <p className="text-lg text-center text-gray-100">
                Collect 7 or more UNIQUE number cards to trigger the Flip 7 bonus
              </p>
            </div>

            <div className="space-y-3 text-gray-300">
              <p><strong className="text-white">How it works:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Only number cards (0-12) count toward the 7 cards</li>
                <li>Each number must be unique (no duplicates)</li>
                <li>The round ends immediately when you get your 7th unique number</li>
                <li>Your score is automatically banked with the +15 bonus</li>
              </ul>

              <div className="bg-gray-800 p-4 rounded-lg space-y-2">
                <p className="text-white font-semibold">Example:</p>
                <p className="text-gray-300">Your hand: 2, 5, 6, 8, 9, 11, 12, +4, +6</p>
                <p className="text-gray-300">Number cards: 2, 5, 6, 8, 9, 11, 12 = <strong>7 unique numbers!</strong></p>
                <div className="border-t border-gray-600 pt-2 mt-2 space-y-1">
                  <p className="text-gray-300">Number sum: 2+5+6+8+9+11+12 = 53</p>
                  <p className="text-gray-300">Modifiers: +4 +6 = +10</p>
                  <p className="text-gray-300">Flip 7 bonus: +15</p>
                  <p className="text-yellow-400 font-bold">Total: 53 + 10 + 15 = 78 points!</p>
                </div>
              </div>

              <div className="bg-orange-900 border border-orange-500 p-3 rounded-lg">
                <p className="text-orange-200">
                  <strong>Strategy tip:</strong> Going for Flip 7 is risky! The more cards you draw,
                  the higher your chance of drawing a duplicate and busting. But the +15 bonus can be game-changing!
                </p>
              </div>
            </div>
          </div>
        );

      case 'strategy-basics':
        return (
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-center text-white">Basic Strategy</h2>
            <p className="text-gray-300">
              Now that you know the rules, let's talk strategy! Here are some fundamental concepts:
            </p>

            <div className="space-y-3">
              <div className="bg-green-900 border border-green-500 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-2">1. Know When to Stay</h3>
                <p className="text-gray-200 mb-2">
                  The more cards you draw, the higher your bust risk. Here's a rough guide:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-300 ml-2">
                  <li><strong className="text-white">3-4 number cards:</strong> Low risk, but low score. Consider hitting.</li>
                  <li><strong className="text-white">5-6 number cards:</strong> Moderate risk. Good time to stay if you have modifiers.</li>
                  <li><strong className="text-white">7+ number cards:</strong> High risk! You got Flip 7, so you're already done.</li>
                </ul>
              </div>

              <div className="bg-blue-900 border border-blue-500 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-2">2. Modifiers are Safer Than Numbers</h3>
                <p className="text-gray-200 text-sm">
                  Drawing a modifier card is always safe (can't bust). If you have a decent number base
                  and draw modifiers, keep going! But if you need more number cards, assess your bust risk.
                </p>
              </div>

              <div className="bg-purple-900 border border-purple-500 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-2">3. The ×2 Card Changes Everything</h3>
                <p className="text-gray-200 text-sm">
                  The ×2 multiplier is rare (only 1 in the deck). If you get it early with good numbers,
                  you can stay safe and still score big. If an opponent has it, they're a threat!
                </p>
              </div>

              <div className="bg-yellow-900 border border-yellow-500 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-2">4. Calculate Your Bust Odds</h3>
                <p className="text-gray-200 text-sm mb-2">
                  With each number card you have, your bust chance increases:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-gray-300 ml-2">
                  <li>1 number: ~1% bust chance per draw</li>
                  <li>3 numbers: ~4% bust chance per draw</li>
                  <li>5 numbers: ~6% bust chance per draw</li>
                  <li>6 numbers: ~8% bust chance per draw</li>
                </ul>
                <p className="text-yellow-200 text-sm mt-2">
                  This is approximate - actual odds vary based on deck composition!
                </p>
              </div>
            </div>
          </div>
        );

      case 'strategy-second-chance':
        return (
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-center text-white">Strategy: Second Chance</h2>
            <div className="bg-yellow-900 border-2 border-yellow-500 p-4 rounded-lg">
              <p className="text-lg text-gray-200 text-center">
                Having a Second Chance card changes your entire strategy!
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-2">With Second Chance: Be Aggressive</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-300 ml-2">
                  <li>
                    <strong className="text-green-400">Draw more cards!</strong> You have one free bust,
                    so take more risks to build a bigger hand.
                  </li>
                  <li>
                    <strong className="text-green-400">Go for Flip 7:</strong> The +15 bonus becomes more
                    achievable when you can survive one duplicate.
                  </li>
                  <li>
                    <strong className="text-green-400">Play FLIP THREE on yourself:</strong> If you're desperate,
                    the risk is reduced with Second Chance protection.
                  </li>
                </ul>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-2">Without Second Chance: Be Careful</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-300 ml-2">
                  <li>
                    <strong className="text-red-400">Stay earlier:</strong> One duplicate ends your turn
                    with 0 points. Don't push your luck too far.
                  </li>
                  <li>
                    <strong className="text-red-400">Avoid FLIP THREE:</strong> Drawing 3 cards without
                    protection is extremely risky.
                  </li>
                  <li>
                    <strong className="text-red-400">Count your numbers:</strong> The more numbers you have,
                    the higher the bust risk. Consider staying at 4-5 numbers.
                  </li>
                </ul>
              </div>

              <div className="bg-blue-900 border border-blue-500 p-4 rounded-lg">
                <p className="text-white font-semibold mb-2">Advanced Tip: Track Usage</p>
                <p className="text-gray-200 text-sm">
                  If you use your Second Chance early in a round, you're now vulnerable!
                  Consider staying on your next turn rather than continuing to draw cards.
                </p>
              </div>

              <div className="bg-purple-900 border border-purple-500 p-4 rounded-lg">
                <p className="text-white font-semibold mb-2">Remember:</p>
                <p className="text-gray-200 text-sm">
                  Second Chance cards don't carry over between rounds. Use them strategically
                  to maximize your score before the round ends!
                </p>
              </div>
            </div>
          </div>
        );

      case 'strategy-action-cards':
        return (
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-center text-white">Strategy: Action Cards</h2>
            <p className="text-gray-300">
              Knowing when and how to use action cards can turn the tide of the game!
            </p>

            <div className="space-y-3">
              <div className="bg-cyan-900 border border-cyan-500 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-2">FREEZE - Timing is Everything</h3>
                <p className="text-gray-200 text-sm mb-2"><strong>Offensive uses:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-xs text-gray-300 ml-2">
                  <li>Freeze an opponent who just started their turn (locks in low score)</li>
                  <li>Freeze someone who's been unlucky and has few points</li>
                  <li>Freeze early in the round to eliminate competition</li>
                </ul>
                <p className="text-gray-200 text-sm mb-2 mt-3"><strong>Defensive uses:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-xs text-gray-300 ml-2">
                  <li>Freeze yourself when you have a great hand (high numbers + modifiers)</li>
                  <li>Use it as insurance if you're worried about busting</li>
                  <li>Lock in a good score when you draw it instead of risking more draws</li>
                </ul>
              </div>

              <div className="bg-orange-900 border border-orange-500 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-2">FLIP THREE - High Risk, High Reward</h3>
                <p className="text-gray-200 text-sm mb-2"><strong>On opponents:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-xs text-gray-300 ml-2">
                  <li>Use when they have many numbers (higher bust chance)</li>
                  <li>Great for disrupting someone with a strong hand</li>
                  <li>Risky if they have Second Chance or few numbers</li>
                </ul>
                <p className="text-gray-200 text-sm mb-2 mt-3"><strong>On yourself:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-xs text-gray-300 ml-2">
                  <li>Only use if you have Second Chance protection</li>
                  <li>Good for catching up when you're behind</li>
                  <li>Might help you reach Flip 7 quickly</li>
                </ul>
              </div>

              <div className="bg-green-900 border border-green-500 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-2">General Tips</h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-300 ml-2">
                  <li>
                    <strong className="text-white">Save action cards for key moments:</strong> Don't waste
                    them early when scores are low.
                  </li>
                  <li>
                    <strong className="text-white">Watch your opponents:</strong> Track who has Second Chance,
                    who has high scores, and who's vulnerable.
                  </li>
                  <li>
                    <strong className="text-white">Combine strategically:</strong> FLIP THREE + opponent
                    without Second Chance = high bust chance for them!
                  </li>
                </ul>
              </div>

              <div className="bg-purple-900 border border-purple-500 p-4 rounded-lg">
                <p className="text-white font-semibold mb-2">Pro Tip: The Late Game</p>
                <p className="text-gray-200 text-sm">
                  If someone is close to 200 points, use FREEZE offensively to lock them at low scores,
                  or FLIP THREE to try to bust them. Defensive play won't help if they're about to win!
                </p>
              </div>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-center text-white">Tutorial Complete!</h2>
            <div className="bg-gradient-to-r from-green-600 to-blue-600 border-2 border-white p-6 rounded-lg">
              <p className="text-2xl font-bold text-white text-center mb-3">
                You're ready to play Flip 7!
              </p>
              <p className="text-lg text-gray-100 text-center">
                Remember: balance risk and reward, use your action cards wisely,
                and know when to stay!
              </p>
            </div>

            <div className="bg-gray-800 border border-gray-600 p-4 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-3 text-center">Quick Reference</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <p className="text-white font-semibold">Win Condition:</p>
                  <p className="text-gray-300">First to 200 points</p>
                </div>
                <div className="space-y-1">
                  <p className="text-white font-semibold">Number Cards:</p>
                  <p className="text-gray-300">One of each only (or bust!)</p>
                </div>
                <div className="space-y-1">
                  <p className="text-white font-semibold">Modifiers:</p>
                  <p className="text-gray-300">Can hold multiples, boost score</p>
                </div>
                <div className="space-y-1">
                  <p className="text-white font-semibold">Flip 7 Bonus:</p>
                  <p className="text-gray-300">7 unique numbers = +15 points</p>
                </div>
                <div className="space-y-1">
                  <p className="text-white font-semibold">Second Chance:</p>
                  <p className="text-gray-300">Saves you from one bust</p>
                </div>
                <div className="space-y-1">
                  <p className="text-white font-semibold">Action Cards:</p>
                  <p className="text-gray-300">FREEZE, FLIP THREE for tactics</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-900 border border-blue-500 p-4 rounded-lg text-center">
              <p className="text-blue-200">
                Ready to practice? Try the <strong className="text-white">Practice Mode</strong> to
                understand the math behind the game and get feedback on your decisions!
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isFirstStep = currentStep === 'welcome';
  const isLastStep = currentStep === 'complete';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border-4 border-gray-700 rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-t-lg flex justify-between items-center border-b-4 border-gray-700">
          <h1 className="text-2xl font-bold text-white">Flip 7 Tutorial</h1>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 text-3xl font-bold leading-none"
            aria-label="Close tutorial"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {getStepContent()}
        </div>

        {/* Navigation */}
        <div className="bg-gray-800 p-4 rounded-b-lg border-t-4 border-gray-700 flex justify-between items-center">
          <button
            onClick={prevStep}
            disabled={isFirstStep}
            className={`px-6 py-2 rounded-lg font-bold transition-all ${
              isFirstStep
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            Previous
          </button>

          <div className="text-gray-400 text-sm">
            Step {['welcome', 'objective', 'numbers', 'modifiers', 'actions-freeze', 'actions-flip-three',
              'actions-second-chance', 'bust', 'scoring', 'flip-seven', 'strategy-basics',
              'strategy-second-chance', 'strategy-action-cards', 'complete'].indexOf(currentStep) + 1} of 14
          </div>

          {isLastStep ? (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition-all"
            >
              Finish
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
