/**
 * Check if a player has busted (duplicate number cards)
 * Returns true if busted, false otherwise
 *
 * A bust occurs when a player draws a number card that matches
 * a number card they already have. For example:
 * - Player has: 5, 7, 10
 * - Player draws: 7 (BUST! - already has 7)
 * - Player draws: 3 (OK - new unique number)
 *
 * Note: You CANNOT bust on:
 * - Action cards (FREEZE, FLIP THREE, SECOND CHANCE)
 * - Modifier cards (+2, +4, +6, +8, +10, x2)
 * - The initial card dealt at the start of a round
 */
export function checkBust(player, newCard) {
    if (newCard.type !== 'number' || newCard.value === undefined) {
        return false; // Can't bust on non-number cards
    }
    // Check if player already has this number (before adding the new card)
    // Count how many cards with this value the player already has
    const existingCount = player.numberCards.filter(card => card.type === 'number' && card.value === newCard.value).length;
    // If player already has this number, it's a bust
    return existingCount > 0;
}
/**
 * Check if a player has achieved Flip 7 (7 unique number cards)
 */
export function hasFlip7(player) {
    const uniqueNumbers = new Set(player.numberCards
        .filter(card => card.type === 'number' && card.value !== undefined)
        .map(card => card.value));
    return uniqueNumbers.size >= 7;
}
/**
 * Calculate player's base score (without Flip 7 bonus)
 */
export function calculateBaseScore(player) {
    // Step 1: Add the value of Number cards
    let score = player.numberCards.reduce((sum, card) => {
        if (card.type === 'number' && card.value !== undefined) {
            return sum + card.value;
        }
        return sum;
    }, 0);
    // Step 2: If you have the x2 multiplier, double your score
    const x2Card = player.modifierCards.find(card => card.modifierType === 'multiply' && card.modifierValue === 2);
    if (x2Card) {
        score = score * 2;
    }
    // Step 3: Add any additional bonus points (+2, +4, +6, +8, +10)
    const addModifiers = player.modifierCards.filter(card => card.modifierType === 'add' && card.modifierValue !== undefined);
    for (const modifier of addModifiers) {
        if (modifier.modifierValue) {
            score += modifier.modifierValue;
        }
    }
    return score;
}
/**
 * Calculate player's score for the current round (including Flip 7 bonus)
 */
export function calculateScore(player) {
    let score = calculateBaseScore(player);
    // If you Flip 7 Number cards, score an additional 15 points
    if (hasFlip7(player)) {
        score += 15;
    }
    return score;
}
/**
 * Organize player cards into separate arrays
 */
export function organizePlayerCards(cards) {
    return {
        numberCards: cards.filter(card => card.type === 'number'),
        modifierCards: cards.filter(card => card.type === 'modifier'),
        actionCards: cards.filter(card => card.type === 'action'),
    };
}
/**
 * Get active players (not busted, not stayed)
 */
export function getActivePlayers(players) {
    return players.filter(player => player.isActive && !player.hasBusted);
}
