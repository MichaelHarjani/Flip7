# Frontend + Deployment

Extracted from `app_spec.txt` §9 and §10.

## Page Structure

```
/ ...................... Landing page (hero + play options)
/play/solo ............. Solo game setup (bot count + difficulty)
/play/casual ........... Create or join a casual room
/join .................. Enter room code
/join/:code ............ Direct join link (shareable)
/play/ranked ........... Ranked matchmaking queue
/game/:id .............. Active game view
/profile ............... User stats, achievements, match history
/profile/:id ........... Public profile
/friends ............... Friends list + pending requests
/stats ................. Personal statistics dashboard
/leaderboard ........... Ranked Elo leaderboard
/rules ................. How to play (interactive tutorial)
```

## Stimulus Controllers

Each controller is small and focused (15–40 lines):

| Controller | Responsibility |
|-----------|----------------|
| `card_flip_controller` | CSS 3D card flip animation (perspective + rotateY) |
| `timer_controller` | Visual countdown bar from `turn_expires_at` timestamp |
| `action_target_controller` | Player selection UI when action card is drawn |
| `toast_controller` | Achievement unlock notifications (auto-dismiss) |
| `lobby_controller` | Player presence list, ready state |
| `matchmaking_controller` | Queue status, cancel button, expanding range indicator |
| `score_animation_controller` | Animate score counter incrementing |
| `sound_controller` | Optional SFX (card flip, bust, Flip 7 fanfare) |

## Card Flip Animation (CSS-only)

```css
.card {
  perspective: 1000px;
  width: 80px;
  height: 120px;
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.card.flipped .card-inner {
  transform: rotateY(180deg);
}

.card-front, .card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 8px;
}

.card-back {
  /* Card back design */
}

.card-front {
  transform: rotateY(180deg);
  /* Card face with value */
}
```

The `card_flip_controller` simply toggles the `.flipped` class — the CSS transition handles the rest at 60fps via GPU-accelerated transforms.

## Mobile Responsiveness

DaisyUI + Tailwind's mobile-first breakpoints handle layout:
- **Mobile (default):** Single column, cards in a horizontal scroll, action buttons full-width, large touch targets (min 44px)
- **Tablet (md:):** Two-column layout, player list sidebar
- **Desktop (lg:):** Full board view with all players visible simultaneously

Key mobile UX considerations:
- Hit/Stay buttons are large, bottom-anchored, thumb-reachable
- Cards are swipeable horizontally when hand gets large
- Turn timer is always visible (sticky top bar)
- Action card targeting uses a bottom sheet modal, not a dropdown
- Achievement toasts slide in from top, auto-dismiss after 3 seconds

## Theming

DaisyUI provides 30+ themes switchable via a data attribute. Default theme: `dark`. Users can select their preferred theme in profile settings. Theme options surfaced: dark, light, cyberpunk, retro, dracula, night.

---

## Deployment (Railway)

### Services

| Service | Type | Notes |
|---------|------|-------|
| Web | Rails 8 (Puma) | Handles HTTP + WebSocket via Action Cable |
| Worker | Sidekiq | Turn timers, matchmaking, cleanup jobs |
| PostgreSQL | Railway managed | Primary database |
| Redis | Railway managed | Action Cable adapter + Sidekiq backend + matchmaking queue |

### Environment Variables

```
RAILS_MASTER_KEY=<from credentials>
DATABASE_URL=<railway postgres>
REDIS_URL=<railway redis>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
RAILS_ENV=production
RAILS_SERVE_STATIC_FILES=true
WEB_CONCURRENCY=2
RAILS_MAX_THREADS=5
```

### Custom Domain

1. Add `flip7.michaelharjani.com` as custom domain in Railway dashboard
2. Create CNAME record: `flip7` → Railway-provided target
3. Railway handles SSL automatically

### Deployment Flow

```
git push origin main → Railway auto-deploys → zero-downtime via rolling restart
```

`Procfile`:
```
web: bin/rails server -p $PORT
worker: bundle exec sidekiq
release: bin/rails db:migrate
```

### Railway Caveat

From parent `/Users/michael/Projects/CLAUDE.md`:
- Railway deployments frequently get SKIPPED due to aggressive build caching. Always force a redeploy if the deployment shows as SKIPPED (e.g., add a build trigger comment or use `railway up --force`).
- Never deploy application code to a Postgres/database service. Always verify the target service name before deploying.
- When Railway deployments fail or get stuck, inform the user early rather than attempting repeated workarounds.
