# Game Engine + Bot AI

Extracted from `app_spec.txt` §6 and §13.

## Core Service: `GameEngine`

Location: `app/services/game_engine.rb`

All game logic is server-authoritative. No game state is computed client-side. The GameEngine is a pure-function service — it takes the current game state and a player action, validates it, and returns the new game state plus a list of events to broadcast.

### Public Interface

```ruby
class GameEngine
  # Start a new round: build fresh deck(s) based on player count, shuffle, deal initial cards
  def self.start_round(game)

  # Player chooses to Hit
  def self.hit(game, user_id)

  # Player chooses to Stay
  def self.stay(game, user_id)

  # Resolve action card targeting
  def self.resolve_action(game, user_id, action_type, target_id)

  # Check if round is over (all players stayed/busted, or Flip 7)
  def self.check_round_end(game)

  # Calculate scores for completed round
  def self.score_round(game)

  # Check if game is over (anyone at 200+)
  def self.check_game_end(game)

  # Handle turn timeout (auto-stay)
  def self.timeout_turn(game, turn_number)

  private

  # Validate that it's the player's turn
  def self.validate_turn(game, user_id)

  # Draw a card from the deck, resolve its type
  def self.draw_card(game, user_id)

  # Check for bust (duplicate number card)
  def self.check_bust(hand, new_card)

  # Calculate expected bust probability for bot AI
  def self.bust_probability(hand, remaining_deck)
end
```

## State Machine (AASM)

```ruby
class Game < ApplicationRecord
  include AASM

  aasm column: :status do
    state :waiting, initial: true
    state :in_progress
    state :completed
    state :abandoned
    state :expired

    event :start do
      transitions from: :waiting, to: :in_progress,
        guard: :enough_players?,
        after: -> { GameEngine.start_round(self) }
    end

    event :complete do
      transitions from: :in_progress, to: :completed,
        after: :finalize_game
    end

    event :abandon do
      transitions from: [:waiting, :in_progress], to: :abandoned
    end

    event :expire do
      transitions from: :waiting, to: :expired
    end
  end
end
```

## Concurrency Control

**Optimistic Locking:** The `lock_version` column on Games uses ActiveRecord's built-in optimistic locking. If two requests try to modify the same game simultaneously, the second one raises `ActiveRecord::StaleObjectError` — caught and retried (once) or returned as a conflict error.

**Advisory Locks:** For critical sections where Sidekiq workers and web processes both modify a game (e.g., turn timeout firing while player submits action), use PostgreSQL advisory locks via the `with_advisory_lock` gem:

```ruby
Game.with_advisory_lock("game_#{game.id}") do
  game.reload
  # Perform action...
  game.save!
end
```

## Turn Timer Architecture

**Server-Side (authoritative):**
1. On turn start: `game.update!(turn_expires_at: 10.seconds.from_now, turn_number: game.turn_number + 1)`
2. Enqueue: `TurnTimeoutJob.set(wait: 10.seconds).perform_later(game.id, game.turn_number)`
3. When job fires: check if `turn_number` still matches (guard against stale execution). If yes, auto-Stay.

**Client-Side (visual only):**
1. Broadcast `turn_expires_at` timestamp to all clients
2. Stimulus `timer_controller.js` runs a local countdown from that absolute timestamp
3. Visual countdown bar + seconds remaining
4. On expiry, client can optimistically show "Time's up" but the server enforces the actual timeout

---

## Simulation Engine (Bot AI)

The existing Flip7 simulation engine (TypeScript, at `/Users/michael/Projects/flip7-simulations`) should be ported to Ruby as a service object for bot decision-making.

### Optimal Strategy

The simulation engine determines the optimal play by calculating the expected value of hitting vs staying at each decision point, given:
- Current hand (unique number cards held)
- Remaining deck composition (94 minus all face-up cards across all players)
- Probability of drawing each remaining card type
- Expected value of future draws if current draw is safe

The key insight from the original simulation: **the optimal strategy is NOT a simple threshold.** It depends on the specific cards in your hand and what's left in the deck. A hand with low cards (1, 2, 3) is safer to hit because the high-count cards (10, 11, 12) are unlikely to duplicate. A hand with 10 and 12 is much more dangerous.

### Ruby Port

```ruby
# app/services/bot_brain.rb
class BotBrain
  def initialize(strategy:, game_state:, player_id:)
    @strategy = strategy
    @game = game_state
    @player_id = player_id
  end

  def decide
    case @strategy
    when "conservative" then conservative_decision
    when "balanced"     then balanced_decision
    when "aggressive"   then aggressive_decision
    when "optimal"      then optimal_decision
    end
  end

  def choose_action_target(action_type)
    # Returns target user_id for Freeze/Flip Three
    # Or nil for Second Chance (self-only)
  end

  private

  def optimal_decision
    probability = bust_probability
    ev_hit = expected_value_of_hitting
    ev_stay = current_hand_value

    ev_hit > ev_stay ? :hit : :stay
  end

  def bust_probability
    hand_values = current_hand_number_values
    remaining = remaining_deck
    duplicates_in_deck = hand_values.sum { |v| remaining.count(v) }
    duplicates_in_deck.to_f / remaining.size
  end

  def remaining_deck
    # Full deck(s) (94 × deck_count) minus all visible cards (all players' hands + discards)
  end
end
```

### Bot Strategies (summary)

| Strategy | Description | Risk Profile |
|----------|-------------|--------------|
| Conservative | Stays at 3–4 cards or 20+ points | Low risk, consistent scores |
| Balanced | Stays at 4–5 cards or 30+ points, considers deck composition | Medium risk |
| Aggressive | Pushes for 5–6 cards, chases high scores | High risk, high variance |
| Optimal | Uses probability calculations from simulation engine | Mathematically optimal play |

### Bot Action Card Targeting

- **Conservative bots:** Freeze the leading player, Flip Three the leading player, keep Second Chance
- **Balanced bots:** Freeze whoever has the most to lose, Flip Three the closest competitor
- **Aggressive bots:** May self-target Flip Three to chase Flip 7, Freeze trailing players to prevent comeback
- **Optimal bots:** Calculate expected value change for each possible target

### Bot Turn Delay

Bots wait 1–2 seconds before acting (randomized) to feel more natural. No 10-second timer for bot turns.
