/**
 * List of AI player character names
 */
const AI_CHARACTER_NAMES = [
  'Wall-E',
  'R2-D2',
  'Herbie',
  'C-3PO',
  'EVE',
  'Baymax',
  '7 of 9',
  'T-800',
  'HAL 9000',
  'Ben 10',
] as const;

/**
 * Character icon mappings - paths to icon images
 * These will be populated after extracting icons from the sprite sheet
 * Using Vite's public directory - files in public/ are served at root
 */
const CHARACTER_ICONS: Record<string, string> = {
  'Wall-E': '/assets/ai-icons/Wall-E.png',
  'R2-D2': '/assets/ai-icons/R2-D2.png',
  'Herbie': '/assets/ai-icons/Herbie.png',
  'C-3PO': '/assets/ai-icons/C-3PO.png',
  'EVE': '/assets/ai-icons/EVE.png',
  'Baymax': '/assets/ai-icons/Baymax.png',
  '7 of 9': '/assets/ai-icons/7-of-9.png',
  'T-800': '/assets/ai-icons/T-800.png',
  'HAL 9000': '/assets/ai-icons/HAL-9000.png',
  'Ben 10': '/assets/ai-icons/Ben-10.png',
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

