/**
 * List of AI player character names
 * Flip 7 Card Game Characters - Each with unique personality
 */
const AI_CHARACTER_NAMES = [
  'Lucky Seven',    // The luckiest player - always finds a way
  'Ace Diamond',    // Flashy, confident high-roller
  'Queen Hearts',   // Charming, strategic mastermind
  'Wild Card',      // Unpredictable risk-taker
  'Chip Master',    // Calculated, methodical player
  'Blaze',          // Hot-headed, aggressive competitor
  'Shuffle',        // Quick and nimble dealer
  'Professor Odds', // Mathematical genius
  'Maverick',       // Rebellious gambler
  'Lady Luck',      // Mysterious fortune-blessed player
  'Royal Flush',    // Regal aristocrat with commanding presence
  'Jack Spades',    // Cool, mysterious jack-of-all-trades
  'The Joker',      // Chaotic trickster, comedy and chaos
  'High Stakes',    // Adrenaline junkie, thrives under pressure
  'Double Down',    // Bold risk-taker, doubles everything
  'Snake Eyes',     // Unlucky but persistent fighter
  'Full House',     // Steady, balanced tactician
  'All In Annie',   // Fearless gambler, never backs down
  'Card Shark',     // Cunning predator of the table
  'Pocket Aces',    // Cocky starter with premium hands
] as const;

/**
 * Character icon mappings - paths to icon images
 * These will be populated after extracting icons from the sprite sheet
 * Using Vite's public directory - files in public/ are served at root
 */
const CHARACTER_ICONS: Record<string, string> = {
  'Lucky Seven': '/assets/ai-icons/Lucky-Seven.png',
  'Ace Diamond': '/assets/ai-icons/Ace-Diamond.png',
  'Queen Hearts': '/assets/ai-icons/Queen-Hearts.png',
  'Wild Card': '/assets/ai-icons/Wild-Card.png',
  'Chip Master': '/assets/ai-icons/Chip-Master.png',
  'Blaze': '/assets/ai-icons/Blaze.png',
  'Shuffle': '/assets/ai-icons/Shuffle.png',
  'Professor Odds': '/assets/ai-icons/Professor-Odds.png',
  'Maverick': '/assets/ai-icons/Maverick.png',
  'Lady Luck': '/assets/ai-icons/Lady-Luck.png',
  'Royal Flush': '/assets/ai-icons/Royal-Flush.png',
  'Jack Spades': '/assets/ai-icons/Jack-Spades.png',
  'The Joker': '/assets/ai-icons/The-Joker.png',
  'High Stakes': '/assets/ai-icons/High-Stakes.png',
  'Double Down': '/assets/ai-icons/Double-Down.png',
  'Snake Eyes': '/assets/ai-icons/Snake-Eyes.png',
  'Full House': '/assets/ai-icons/Full-House.png',
  'All In Annie': '/assets/ai-icons/All-In-Annie.png',
  'Card Shark': '/assets/ai-icons/Card-Shark.png',
  'Pocket Aces': '/assets/ai-icons/Pocket-Aces.png',
};

/**
 * Get random unique AI player names
 * @param count - Number of names to return
 * @returns Array of unique random character names
 */
export function getRandomAINames(count: number): string[] {
  // Create a shuffled copy of the names array
  const shuffled = [...AI_CHARACTER_NAMES].sort(() => Math.random() - 0.5);
  
  // Return the requested number of names
  return shuffled.slice(0, Math.min(count, AI_CHARACTER_NAMES.length));
}

/**
 * Get the icon path for an AI character name
 * @param characterName - The character name
 * @returns The path to the character's icon, or null if not found
 */
export function getAICharacterIconPath(characterName: string): string | null {
  return CHARACTER_ICONS[characterName] || null;
}

