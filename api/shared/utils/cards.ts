import type { Card } from '../types/index.js';

// Card distribution according to rules:
// Number cards: 12×12, 11×11, 10×10, 9×9, 8×8, 7×7, 6×6, 5×5, 4×4, 3×3, 2×2, 1×1, 0×1
// Modifier cards: +2×3, +4×3, +6×3, +8×3, +10×3, x2×1
// Action cards: FREEZE×3, FLIP THREE×3, SECOND CHANCE×3

export function createDeck(): Card[] {
  const deck: Card[] = [];
  let cardId = 0;

  // Number cards: 12 down to 1, then 0
  for (let value = 12; value >= 1; value--) {
    const quantity = value;
    for (let i = 0; i < quantity; i++) {
      deck.push({
        id: `number-${cardId++}`,
        type: 'number',
        value: value,
      });
    }
  }
  
  // Zero card (1 copy)
  deck.push({
    id: `number-${cardId++}`,
    type: 'number',
    value: 0,
  });

  // Modifier cards: +2, +4, +6, +8, +10 (3 each)
  const modifierValues = [2, 4, 6, 8, 10];
  for (const value of modifierValues) {
    for (let i = 0; i < 3; i++) {
      deck.push({
        id: `modifier-${cardId++}`,
        type: 'modifier',
        modifierType: 'add',
        modifierValue: value,
      });
    }
  }

  // x2 multiplier (1 copy)
  deck.push({
    id: `modifier-${cardId++}`,
    type: 'modifier',
    modifierType: 'multiply',
    modifierValue: 2,
  });

  // Action cards: FREEZE, FLIP THREE, SECOND CHANCE (3 each)
  const actionTypes: Array<'freeze' | 'flipThree' | 'secondChance'> = [
    'freeze',
    'flipThree',
    'secondChance',
  ];
  
  for (const actionType of actionTypes) {
    for (let i = 0; i < 3; i++) {
      deck.push({
        id: `action-${cardId++}`,
        type: 'action',
        actionType: actionType,
      });
    }
  }

  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Create a deck scaled for the number of players
 * Uses 1 deck for 1-10 players, 2 decks for 11-20, etc.
 */
export function createScaledDeck(playerCount: number): Card[] {
  const numberOfDecks = Math.max(1, Math.ceil(playerCount / 10));
  const combinedDeck: Card[] = [];
  
  for (let deckNum = 0; deckNum < numberOfDecks; deckNum++) {
    const deck = createDeck();
    // Add deck number prefix to card IDs to ensure uniqueness
    for (const card of deck) {
      combinedDeck.push({
        ...card,
        id: `deck${deckNum}-${card.id}`,
      });
    }
  }
  
  return combinedDeck;
}

