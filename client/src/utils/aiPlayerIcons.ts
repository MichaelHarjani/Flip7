/**
 * AI Character Icon Utilities
 * Maps character names to their icon image paths
 */

// Character icon mappings - will be populated after extraction
export const AI_CHARACTER_ICONS: Record<string, string> = {
  'Wall-E': '/src/assets/ai-icons/Wall-E.png',
  'R2-D2': '/src/assets/ai-icons/R2-D2.png',
  'Herbie': '/src/assets/ai-icons/Herbie.png',
  'C-3PO': '/src/assets/ai-icons/C-3PO.png',
  'EVE': '/src/assets/ai-icons/EVE.png',
  'Baymax': '/src/assets/ai-icons/Baymax.png',
  '7 of 9': '/src/assets/ai-icons/7-of-9.png',
  'T-800': '/src/assets/ai-icons/T-800.png',
  'HAL 9000': '/src/assets/ai-icons/HAL-9000.png',
  'Ben 10': '/src/assets/ai-icons/Ben-10.png',
};

/**
 * Get the icon path for an AI character name
 * @param characterName - The character name
 * @returns The path to the character's icon, or a default robot emoji
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
  return '🤖';
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

