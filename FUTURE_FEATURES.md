# Future Features Backlog

A prioritized list of features to improve the Flip 7 experience, inspired by Chess.com and other polished gaming platforms.

---

## Functional Features

### High Priority
- [ ] **Player Ratings & Ranked Matchmaking** - Elo-style rating system with skill-based matching
- [ ] **Leaderboards** - Global, friends, and weekly rankings
- [ ] **Game History & Replay** - Save games with move-by-move playback
- [ ] **Friends List & Social Graph** - Add friends, see online status, direct challenges
- [ ] **In-Game Chat** - Text chat in lobbies and during games

### Medium Priority
- [ ] **Achievements & Progression** - Badges, trophies, daily streaks, unlockables
- [ ] **Daily Challenges / Puzzles** - Daily engagement hooks to keep users coming back
- [ ] **Spectator Mode** - Watch live games without participating
- [ ] **Tournaments** - Bracket-style competitive play
- [ ] **Clubs / Teams** - Group features for communities

### Lower Priority
- [ ] **Premium Cosmetics** - Custom card backs, themes, avatars
- [ ] **Post-Game Analysis** - AI suggestions on optimal plays
- [ ] **Keyboard Shortcuts** - Quick actions for power users

---

## UI/UX Improvements

### High Priority
- [ ] **Sound Effects** - Audio feedback for card draws, busts, wins, button clicks
- [ ] **Card Deal Animations** - Cards slide/flip into position when dealt
- [ ] **Toast Notifications** - Replace browser `alert()` with elegant toast messages
- [ ] **Victory/Defeat Animations** - More dramatic end-game screens
- [ ] **Fix Mobile Text Blur** - Replace zoom-based scaling with proper responsive CSS

### Medium Priority
- [ ] **Smooth Screen Transitions** - Fade/slide between views instead of instant swaps
- [ ] **Animated Score Changes** - Numbers count up/down with +/- indicators
- [ ] **Player Avatars** - Initials + colored circles instead of just text names
- [ ] **Loading Skeletons** - Placeholder cards/UI while content loads
- [ ] **Timer Urgency Visuals** - Visual cues when time is running low (if turn timers added)

### Lower Priority
- [ ] **Micro-interactions** - Subtle hover effects, button press feedback, toggle animations
- [ ] **Theme Auto-Detection** - Match system dark/light preference
- [ ] **Haptic Feedback** - Vibration on mobile for key actions
- [ ] **PWA Support** - Installable app with offline capability

---

## Design System Fixes

### High Priority
- [ ] **Full Theme System Adoption** - Replace hardcoded colors (gray-800, blue-600) with theme variables
- [ ] **Consistent Border Scaling** - Standardize border-2/border-4 usage across components
- [ ] **Minimum Text Size** - Enforce 12px minimum (currently some text is 9-10px)
- [ ] **Focus Indicators** - Add visible focus rings for keyboard navigation

### Medium Priority
- [ ] **Reusable Component Library** - Extract Button, Modal, Card container components
- [ ] **Design Tokens** - Centralize colors/spacing in CSS variables or constants
- [ ] **Consistent Spacing Scale** - Standardize padding/margin patterns
- [ ] **Form Validation Messages** - Show inline errors, not just disabled buttons

### Lower Priority
- [ ] **Component Documentation** - Storybook or similar for component reference
- [ ] **Light Theme Option** - Currently dark-only

---

## Accessibility Improvements

### High Priority
- [ ] **Colorblind Support** - Add text labels or patterns, not just color indicators
- [ ] **Keyboard Navigation** - Arrow keys or hotkeys for Hit/Stay actions
- [ ] **Screen Reader Support** - ARIA labels for game states and actions

### Medium Priority
- [ ] **Focus Trap in Modals** - Prevent focus from leaving dialogs
- [ ] **Semantic HTML** - Use proper dialog, section, nav elements
- [ ] **Better Error Recovery** - Add retry buttons to error states

### Lower Priority
- [ ] **High Contrast Mode** - For users with low vision
- [ ] **Font Size Controls** - User-adjustable text sizing

---

## Technical Improvements

- [ ] **Turn Timer** - Optional countdown to prevent stalling
- [ ] **AFK Detection** - Warn/kick inactive players in multiplayer
- [ ] **Reconnection UX** - Better feedback during disconnect/reconnect
- [ ] **Rate Limiting** - Prevent spam actions
- [ ] **Push Notifications** - Alert users when it's their turn (mobile)

---

## Notes

Features should be implemented incrementally. Focus on high-impact, user-facing improvements first. Sound effects and basic animations would significantly improve the feel of the game with relatively low effort.
