// Extracted from physical Flip 7 cards - authentic vintage carnival aesthetic
export const flip7Colors = {
  // Background colors - warm wood tones
  background: {
    primary: '#2d1810',      // Dark wood/brown (deep background)
    secondary: '#3d2518',    // Medium wood tone
    tertiary: '#4d3520',     // Lighter wood accent
    card: '#f5f1e8',         // Cream/ivory card base
  },

  // Card border and decorative elements
  decorative: {
    border: '#8b4513',       // Saddle brown
    ornament: '#d4af37',     // Antique gold
    vintage: '#c19a6b',      // Camel/tan
    accent: '#cd853f',       // Peru/copper
  },

  // Number cards - each number has unique color from physical deck
  numbers: {
    zero: '#1e90ff',         // Dodger blue (0)
    one: '#6b8e23',          // Olive green (1)
    two: '#daa520',          // Goldenrod yellow (2)
    three: '#8b1a3d',        // Deep magenta/burgundy (3)
    four: '#4682b4',         // Steel blue (4)
    five: '#2e8b57',         // Sea green (5)
    six: '#8b4789',          // Purple/violet (6)
    seven: '#a0522d',        // Sienna brown (7)
    eight: '#9acd32',        // Yellow-green (8)
    nine: '#ff8c00',         // Dark orange (9)
    ten: '#dc143c',          // Crimson red (10)
    eleven: '#4169e1',       // Royal blue (11)
    twelve: '#708090',       // Slate gray (12)
  },

  // Modifier cards - warm golden/amber tones
  modifiers: {
    base: '#f4a460',         // Sandy brown base
    plus2: '#daa520',        // Goldenrod
    plus4: '#f4a460',        // Sandy brown
    plus6: '#cd853f',        // Peru
    plus8: '#d2691e',        // Chocolate
    plus10: '#b8860b',       // Dark goldenrod
    multiplier: '#daa520',   // Goldenrod for x2
  },

  // Action cards - bright accent colors
  actions: {
    freeze: '#87ceeb',       // Sky blue (from freeze card)
    flipThree: '#ffd700',    // Gold yellow (from flip three)
    secondChance: '#ff1493', // Deep pink/magenta (from second chance)
  },

  // Text colors
  text: {
    primary: '#2d1810',      // Dark brown (on light cards)
    secondary: '#5d4037',    // Medium brown
    light: '#f5f1e8',        // Cream (on dark backgrounds)
    accent: '#8b4513',       // Saddle brown
  },

  // UI element colors
  ui: {
    gold: '#d4af37',         // Antique gold (for current player border)
    success: '#2e8b57',      // Sea green
    danger: '#8b1a3d',       // Deep magenta
    warning: '#daa520',      // Goldenrod
    info: '#4682b4',         // Steel blue
  },
};

// Map of number values to their colors
const numberColorMap: Record<number, string> = {
  0: flip7Colors.numbers.zero,
  1: flip7Colors.numbers.one,
  2: flip7Colors.numbers.two,
  3: flip7Colors.numbers.three,
  4: flip7Colors.numbers.four,
  5: flip7Colors.numbers.five,
  6: flip7Colors.numbers.six,
  7: flip7Colors.numbers.seven,
  8: flip7Colors.numbers.eight,
  9: flip7Colors.numbers.nine,
  10: flip7Colors.numbers.ten,
  11: flip7Colors.numbers.eleven,
  12: flip7Colors.numbers.twelve,
};

// Helper function to get number card color
export function getNumberCardColor(value: number): string {
  return numberColorMap[value] || flip7Colors.numbers.zero;
}

// Helper function to get contrasting text color for a number card
export function getNumberCardTextColor(value: number): string {
  // Lighter colors need dark text, darker colors need light text
  const lightColorNumbers = [2, 8]; // goldenrod and yellow-green are light
  return lightColorNumbers.includes(value) ? flip7Colors.text.primary : '#ffffff';
}

// Helper function to get modifier card color based on value
export function getModifierCardColor(value: number | string): string {
  const numValue = typeof value === 'string' ? parseInt(value.replace('+', '').replace('x', '')) : value;

  if (typeof value === 'string' && value.startsWith('x')) {
    return flip7Colors.modifiers.multiplier;
  }

  const colorMap: Record<number, string> = {
    2: flip7Colors.modifiers.plus2,
    4: flip7Colors.modifiers.plus4,
    6: flip7Colors.modifiers.plus6,
    8: flip7Colors.modifiers.plus8,
    10: flip7Colors.modifiers.plus10,
  };
  return colorMap[numValue] || flip7Colors.modifiers.base;
}

// Helper function to get action card color
export function getActionCardColor(actionType: string): string {
  const colorMap: Record<string, string> = {
    freeze: flip7Colors.actions.freeze,
    flipThree: flip7Colors.actions.flipThree,
    secondChance: flip7Colors.actions.secondChance,
  };
  return colorMap[actionType] || flip7Colors.actions.freeze;
}

// Helper function to get action card text color
export function getActionCardTextColor(actionType: string): string {
  // Freeze (sky blue) needs dark text, others can use dark text too
  return flip7Colors.text.primary;
}

// CSS custom properties for use in stylesheets
export const flip7CSSVariables = {
  '--flip7-bg-primary': flip7Colors.background.primary,
  '--flip7-bg-secondary': flip7Colors.background.secondary,
  '--flip7-bg-tertiary': flip7Colors.background.tertiary,
  '--flip7-card-base': flip7Colors.background.card,
  '--flip7-border': flip7Colors.decorative.border,
  '--flip7-gold': flip7Colors.decorative.ornament,
  '--flip7-vintage': flip7Colors.decorative.vintage,
  '--flip7-copper': flip7Colors.decorative.accent,
};
