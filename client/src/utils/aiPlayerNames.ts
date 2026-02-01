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

