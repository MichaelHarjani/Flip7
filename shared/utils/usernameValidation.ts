/**
 * Username validation utility
 * Validates usernames for length, format, and content restrictions
 */

// Username constraints
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 16;

// Allowed characters: letters, numbers, underscores
const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

// Reserved usernames that cannot be used
const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'mod', 'moderator',
  'system', 'support', 'help', 'info',
  'flip7', 'flip_7', 'official', 'staff',
  'root', 'null', 'undefined', 'anonymous',
  'guest', 'user', 'player', 'test',
  'api', 'www', 'mail', 'email',
]);

// Common profanity and offensive terms (lowercase)
// This is a basic list - production should use a more comprehensive library
const PROFANITY_LIST = new Set([
  // Slurs and hate speech
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded',
  'spic', 'chink', 'gook', 'kike', 'wetback', 'beaner',
  'tranny', 'dyke', 'cunt', 'twat',
  // Sexual terms
  'fuck', 'shit', 'ass', 'asshole', 'bitch', 'dick',
  'cock', 'penis', 'vagina', 'pussy', 'tits', 'boobs',
  'porn', 'porno', 'sex', 'sexy', 'nude', 'naked',
  'cum', 'jizz', 'whore', 'slut', 'hoe',
  // Violence
  'kill', 'murder', 'rape', 'terrorist', 'nazi', 'hitler',
  // Drugs
  'cocaine', 'heroin', 'meth',
]);

// Patterns that look like attempts to bypass filters
const LEET_SPEAK_MAP: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
  '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i',
};

export interface UsernameValidationResult {
  valid: boolean;
  error?: string;
  suggestion?: string;
}

/**
 * Normalize text for profanity checking (convert leet speak, lowercase)
 */
function normalizeForProfanityCheck(text: string): string {
  let normalized = text.toLowerCase();

  // Convert leet speak
  for (const [leet, letter] of Object.entries(LEET_SPEAK_MAP)) {
    normalized = normalized.split(leet).join(letter);
  }

  // Remove repeated characters (e.g., "fuuuck" -> "fuck")
  normalized = normalized.replace(/(.)\1{2,}/g, '$1$1');

  // Remove underscores and common separators for checking
  const withoutSeparators = normalized.replace(/[_\-\.]/g, '');

  return withoutSeparators;
}

/**
 * Check if username contains profanity
 */
function containsProfanity(username: string): boolean {
  const normalized = normalizeForProfanityCheck(username);

  // Check exact matches
  if (PROFANITY_LIST.has(normalized)) {
    return true;
  }

  // Check if any profane word is contained within the username
  for (const word of PROFANITY_LIST) {
    if (word.length >= 3 && normalized.includes(word)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if username is reserved
 */
function isReserved(username: string): boolean {
  return RESERVED_USERNAMES.has(username.toLowerCase());
}

/**
 * Validate a username
 */
export function validateUsername(username: string): UsernameValidationResult {
  // Trim whitespace
  const trimmed = username.trim();

  // Check if empty
  if (!trimmed) {
    return {
      valid: false,
      error: 'Username is required',
    };
  }

  // Check minimum length
  if (trimmed.length < USERNAME_MIN_LENGTH) {
    return {
      valid: false,
      error: `Username must be at least ${USERNAME_MIN_LENGTH} characters`,
    };
  }

  // Check maximum length
  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `Username must be at most ${USERNAME_MAX_LENGTH} characters`,
    };
  }

  // Check allowed characters
  if (!USERNAME_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: 'Username can only contain letters, numbers, and underscores',
    };
  }

  // Check if starts with number
  if (/^[0-9]/.test(trimmed)) {
    return {
      valid: false,
      error: 'Username cannot start with a number',
    };
  }

  // Check reserved usernames
  if (isReserved(trimmed)) {
    return {
      valid: false,
      error: 'This username is reserved',
    };
  }

  // Check profanity
  if (containsProfanity(trimmed)) {
    return {
      valid: false,
      error: 'Username contains inappropriate content',
    };
  }

  return { valid: true };
}

/**
 * Generate username suggestions based on a base name
 */
export function generateUsernameSuggestions(baseName: string, count: number = 3): string[] {
  const suggestions: string[] = [];
  const cleaned = baseName
    .replace(/[^a-zA-Z0-9_]/g, '')
    .slice(0, USERNAME_MAX_LENGTH - 4);

  if (!cleaned) {
    return ['Player' + Math.floor(Math.random() * 9999)];
  }

  // Add random numbers
  for (let i = 0; i < count; i++) {
    const suffix = Math.floor(Math.random() * 9999);
    const suggestion = `${cleaned}${suffix}`.slice(0, USERNAME_MAX_LENGTH);
    if (validateUsername(suggestion).valid) {
      suggestions.push(suggestion);
    }
  }

  return suggestions;
}
