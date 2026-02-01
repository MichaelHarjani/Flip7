// Predefined avatars for Flip 7
// Each avatar has an ID and emoji representation

export interface PredefinedAvatar {
  id: string;
  emoji: string;
  name: string;
  category: 'suits' | 'numbers' | 'special';
}

export const PREDEFINED_AVATARS: PredefinedAvatar[] = [
  // Card Suits
  { id: 'spade', emoji: '♠️', name: 'Spade', category: 'suits' },
  { id: 'heart', emoji: '♥️', name: 'Heart', category: 'suits' },
  { id: 'diamond', emoji: '♦️', name: 'Diamond', category: 'suits' },
  { id: 'club', emoji: '♣️', name: 'Club', category: 'suits' },

  // Lucky Numbers
  { id: 'seven', emoji: '7️⃣', name: 'Lucky Seven', category: 'numbers' },
  { id: 'ace', emoji: '🅰️', name: 'Ace', category: 'numbers' },

  // Special Card Themes
  { id: 'joker', emoji: '🃏', name: 'Joker', category: 'special' },
  { id: 'crown', emoji: '👑', name: 'Royal Crown', category: 'special' },
  { id: 'star', emoji: '⭐', name: 'Star Player', category: 'special' },
  { id: 'fire', emoji: '🔥', name: 'On Fire', category: 'special' },
  { id: 'dice', emoji: '🎲', name: 'Risk Taker', category: 'special' },
  { id: 'trophy', emoji: '🏆', name: 'Champion', category: 'special' },
];

export function getAvatarById(id: string): PredefinedAvatar | undefined {
  return PREDEFINED_AVATARS.find(avatar => avatar.id === id);
}

export function getAvatarsByCategory(category: PredefinedAvatar['category']): PredefinedAvatar[] {
  return PREDEFINED_AVATARS.filter(avatar => avatar.category === category);
}

export function getDefaultAvatar(): PredefinedAvatar {
  return PREDEFINED_AVATARS[0]; // Spade
}

// Generate a color for an avatar based on its ID
export function getAvatarColor(avatarId: string): string {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ];

  let hash = 0;
  for (let i = 0; i < avatarId.length; i++) {
    hash = avatarId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
