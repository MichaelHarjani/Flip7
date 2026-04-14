# Real-Time Layer + Background Jobs + Auth

Extracted from `app_spec.txt` §7, §8, §11.

## Action Cable Channels

### GameChannel

```ruby
# app/channels/game_channel.rb
class GameChannel < ApplicationCable::Channel
  def subscribed
    @game = Game.find(params[:game_id])
    stream_for @game

    # On reconnect: send full state sync
    GameChannel.broadcast_to(@game, {
      type: "state_sync",
      html: render_game_state(@game, current_user)
    })
  end

  def unsubscribed
    # Enqueue disconnect handler with grace period
    PlayerDisconnectJob.set(wait: 30.seconds)
      .perform_later(@game.id, current_user.id)
  end
end
```

### LobbyChannel

```ruby
# app/channels/lobby_channel.rb
class LobbyChannel < ApplicationCable::Channel
  def subscribed
    @game = Game.find(params[:game_id])
    stream_for @game
    # Broadcast player joined
  end
end
```

### MatchmakingChannel

```ruby
# app/channels/matchmaking_channel.rb
class MatchmakingChannel < ApplicationCable::Channel
  def subscribed
    stream_for current_user
    # Subscribe to personal matchmaking updates
  end
end
```

## Broadcast Strategy

All game state updates go through Action Cable. **Turbo Streams are the sole update path during active gameplay.** This avoids the "Turbo + ActionCable trap" where dual update paths cause state divergence.

**Broadcast types:**
- `turbo_stream` — Replace/append/remove HTML partials for game state changes
- `state_sync` — Full game state HTML on reconnect
- `notification` — Achievement unlocks, matchmaking found, chat messages

**What gets broadcast:**
- Card drawn (card reveal animation + updated hand)
- Player stayed (status change)
- Player busted (bust animation + status change)
- Action card played (target selection UI or resolution)
- Round ended (scores summary)
- Game ended (final standings + Elo changes for ranked)
- Turn timer start (timestamp for client-side countdown)
- Player connected/disconnected (lobby presence)

## Private vs Public Information

The server must enforce information hiding. Each player's broadcast contains:
- **Their own hand:** Fully visible (all cards, modifiers, Second Chance status)
- **Other players' hands:** Card count visible, card values visible (Flip7 is open information — all cards are dealt face-up)
- **Deck:** Card count remaining visible, composition hidden
- **Discard pile:** Not tracked in standard rules

Since Flip7 deals all cards face-up, there is no hidden information between players. The only hidden information is the remaining deck composition.

---

## Authentication (Devise + OmniAuth)

### Gems

```ruby
gem 'devise'
gem 'omniauth'
gem 'omniauth-google-oauth2'
gem 'omniauth-rails_csrf_protection'  # Required for Rails 7+
```

### User Model

```ruby
class User < ApplicationRecord
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :omniauthable, omniauth_providers: [:google_oauth2]

  def self.from_omniauth(auth)
    where(provider: auth.provider, uid: auth.uid).first_or_create do |user|
      user.email = auth.info.email
      user.password = Devise.friendly_token[0, 20]
      user.name = auth.info.name
      user.avatar_url = auth.info.image
    end
  end
end
```

### Google Cloud Console Setup

- Create OAuth 2.0 Client ID
- Authorized redirect URI: `https://flip7.michaelharjani.com/users/auth/google_oauth2/callback`
- Scopes: `email`, `profile` (minimal)

### Guest Play

Solo mode supports guest play without login. Guests:
- Can play solo games with bots
- Cannot earn achievements or track stats
- Cannot access multiplayer
- See a persistent "Sign in to save progress" prompt
- If they sign in mid-session, their current solo game's results are NOT retroactively saved

---

## Background Jobs (Sidekiq)

| Job | Trigger | Purpose |
|-----|---------|---------|
| `TurnTimeoutJob` | Turn start (10s delay) | Auto-Stay if player doesn't act. Check `turn_number` guard before acting. |
| `MatchmakingWorkerJob` | Recurring (every 5s) | Pair ranked queue players with expanding Elo range |
| `PlayerDisconnectJob` | WebSocket disconnect (30s delay) | Forfeit if no reconnect. Used by GameChannel unsubscribed callback. |
| `RoomExpiryJob` | Room creation (5min delay) | Expire empty waiting rooms |
| `AchievementCheckJob` | Round/game end | Evaluate and unlock achievements via AchievementEvaluator service |
| `CleanupAbandonedGamesJob` | Recurring (hourly, via sidekiq-cron) | Mark stale games as abandoned |
| `BotTurnJob` | Bot's turn (1-2s randomized delay) | Execute bot decision via BotBrain.decide |

All jobs should be idempotent where possible. Jobs that operate on Game state must use advisory locks (see `docs/game_engine.md` §Concurrency Control).

### Matchmaking Algorithm (expanding range)

```
0s:  ±50 Elo
10s: ±100 Elo
20s: ±200 Elo
30s: ±500 Elo
60s: match with any available player
```

Queue is a Redis sorted set keyed by Elo rating. Match found → both players notified via `MatchmakingChannel` → game record created and both redirected to `/game/:id`.

### Elo System

- Starting Elo: 1000
- K-factor: 48 for first 20 games (provisional), then 32
- Formula: `new_rating = current + K * (actual - expected)` where `expected = 1.0 / (1.0 + 10**((opponent - self) / 400.0))`
- Win = 1.0, Loss = 0.0 (no draws in Flip7)
- Elo floor: 100 (cannot drop below)
- Updated immediately on game completion
- Implemented in `app/services/elo_calculator.rb`

### Disconnect Handling

- 30-second grace period on disconnect (tracked via `PlayerDisconnectJob`)
- If player reconnects within 30s: game resumes from last state (GameChannel subscribed callback sends `state_sync`)
- If player does NOT reconnect within 30s: they forfeit, opponent wins, Elo updated as if the disconnecter lost
- Repeated disconnects (3+ in 24 hours) trigger a 15-minute matchmaking cooldown
