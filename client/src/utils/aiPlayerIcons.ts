/**
 * AI Character Icon Utilities
 * Maps character names to their icon image paths
 * Flip 7 Card Game Characters
 */

// Character icon mappings - will be populated after extraction
export const AI_CHARACTER_ICONS: Record<string, string> = {
  'Lucky Seven': '/src/assets/ai-icons/Lucky-Seven.png',
  'Ace Diamond': '/src/assets/ai-icons/Ace-Diamond.png',
  'Queen Hearts': '/src/assets/ai-icons/Queen-Hearts.png',
  'Wild Card': '/src/assets/ai-icons/Wild-Card.png',
  'Chip Master': '/src/assets/ai-icons/Chip-Master.png',
  'Blaze': '/src/assets/ai-icons/Blaze.png',
  'Shuffle': '/src/assets/ai-icons/Shuffle.png',
  'Professor Odds': '/src/assets/ai-icons/Professor-Odds.png',
  'Maverick': '/src/assets/ai-icons/Maverick.png',
  'Lady Luck': '/src/assets/ai-icons/Lady-Luck.png',
  'Royal Flush': '/src/assets/ai-icons/Royal-Flush.png',
  'Jack Spades': '/src/assets/ai-icons/Jack-Spades.png',
  'The Joker': '/src/assets/ai-icons/The-Joker.png',
  'High Stakes': '/src/assets/ai-icons/High-Stakes.png',
  'Double Down': '/src/assets/ai-icons/Double-Down.png',
  'Snake Eyes': '/src/assets/ai-icons/Snake-Eyes.png',
  'Full House': '/src/assets/ai-icons/Full-House.png',
  'All In Annie': '/src/assets/ai-icons/All-In-Annie.png',
  'Card Shark': '/src/assets/ai-icons/Card-Shark.png',
  'Pocket Aces': '/src/assets/ai-icons/Pocket-Aces.png',
};

/**
 * Get the icon path for an AI character name
 * @param characterName - The character name
 * @returns The path to the character's icon, or a default card emoji
 */
export function getAICharacterIcon(characterName: string): string {
  // Try to get the icon path
  const iconPath = AI_CHARACTER_ICONS[characterName];

  if (iconPath) {
    // In Vite, we need to import images dynamically or use them as assets
    // For now, return the path - we'll handle the import in the component
    return iconPath;
  }

  // Fallback to emoji if icon not found
  return '🎴';
}

/**
 * Get icon as an imported image module (for use in components)
 * This will be used once the icons are extracted
 */
export function getAICharacterIconImport(characterName: string): string {
  const iconPath = AI_CHARACTER_ICONS[characterName];
  if (!iconPath) return '';
  
  // Return the path that can be used with Vite's asset handling
  return iconPath.replace('/src/', '');
}

