# Data Model

Full database schemas for flip7-app. Extracted from `app_spec.txt` §3.

## users

```ruby
# Table: users
# Managed by Devise + OmniAuth
create_table :users do |t|
  # Devise core
  t.string :email, null: false, index: { unique: true }
  t.string :encrypted_password, null: false, default: ""

  # OmniAuth
  t.string :provider    # "google_oauth2"
  t.string :uid         # Google user ID
  t.string :name        # Display name from Google
  t.string :avatar_url  # Google profile photo URL

  # Game stats
  t.integer :elo_rating, null: false, default: 1000
  t.integer :games_played, null: false, default: 0
  t.integer :games_won, null: false, default: 0
  t.integer :total_rounds_played, null: false, default: 0
  t.integer :total_flip7s, null: false, default: 0
  t.integer :highest_round_score, null: false, default: 0
  t.integer :ranked_wins, null: false, default: 0
  t.integer :ranked_losses, null: false, default: 0
  t.integer :current_win_streak, null: false, default: 0
  t.integer :best_win_streak, null: false, default: 0

  t.timestamps
end
```

## games

```ruby
create_table :games do |t|
  t.string :room_code, limit: 4          # Jackbox-style join code (casual mode)
  t.string :mode, null: false             # "casual", "ranked", "solo"
  t.string :status, null: false, default: "waiting"
    # waiting → in_progress → completed / abandoned / expired
  t.integer :min_players, null: false, default: 2
  t.integer :max_players                  # nil = unlimited (casual), 2 = ranked
  t.integer :deck_count, null: false, default: 1  # ceil(player_count / 10)
  t.integer :current_round, null: false, default: 0
  t.integer :current_turn_player_index    # Index into players array
  t.integer :turn_number, null: false, default: 0  # Global turn counter for stale job detection
  t.datetime :turn_expires_at             # Absolute timestamp for turn deadline
  t.jsonb :deck, null: false, default: [] # Remaining cards in the shuffled deck
  t.jsonb :round_state, null: false, default: {}
    # {
    #   player_hands: { user_id => { number_cards: [], modifiers: [], has_second_chance: false } },
    #   player_statuses: { user_id => "active" | "stayed" | "busted" },
    #   player_scores: { user_id => 0 },
    #   stay_order: [],        # Array of user_ids in order they stayed (for tiebreaking)
    #   deal_phase: false,     # True during initial deal
    #   pending_flip_three: { target_id: nil, remaining: 0 }
    # }
  t.jsonb :cumulative_scores, null: false, default: {}  # { user_id => cumulative_total }
  t.integer :winner_id                    # User ID of winner (null until game ends)
  t.integer :rematch_of                   # Self-ref: game_id of previous game (for rematch chain)
  t.integer :lock_version, null: false, default: 0  # Optimistic locking

  t.timestamps

  t.index :room_code, unique: true, where: "status IN ('waiting', 'in_progress')"
  t.index :status
  t.index :mode
end
```

## game_players

```ruby
create_table :game_players do |t|
  t.references :game, null: false, foreign_key: true
  t.references :user, null: false, foreign_key: true
  t.integer :seat_position, null: false        # 0-indexed turn order
  t.boolean :is_bot, null: false, default: false
  t.string :bot_strategy                       # "conservative", "balanced", "aggressive", "optimal"
  t.boolean :connected, null: false, default: true
  t.datetime :disconnected_at

  t.timestamps

  t.index [:game_id, :user_id], unique: true
  t.index [:game_id, :seat_position], unique: true
end
```

## match_results

Denormalized for fast leaderboard queries.

```ruby
create_table :match_results do |t|
  t.references :game, null: false, foreign_key: true
  t.references :user, null: false, foreign_key: true
  t.integer :final_score, null: false
  t.integer :placement, null: false       # 1st, 2nd, 3rd...
  t.integer :rounds_played, null: false
  t.integer :total_flip7s, null: false, default: 0
  t.integer :highest_round_score, null: false, default: 0
  t.integer :elo_before
  t.integer :elo_after
  t.integer :elo_change
  t.string :mode, null: false             # Denormalized from game

  t.timestamps

  t.index [:user_id, :created_at]
  t.index [:mode, :created_at]
end
```

## achievements + user_achievements

```ruby
# Table: achievements (seed data — 32 achievements, see docs/achievements.md)
create_table :achievements do |t|
  t.string :key, null: false, index: { unique: true }  # "flip7_first", "glutton", etc.
  t.string :name, null: false
  t.text :description, null: false
  t.string :category, null: false     # "flip7", "risk", "score", "strategic", "special", "anti"
  t.string :rarity, null: false       # "common", "rare", "epic", "legendary"
  t.string :icon, null: false         # Emoji
  t.boolean :is_anti, null: false, default: false
  t.integer :tier_target              # For tiered achievements (e.g., 5, 10, 25)
  t.string :parent_key                # Links tiers: "flip7_5" parent is "flip7_first"

  t.timestamps
end

create_table :user_achievements do |t|
  t.references :user, null: false, foreign_key: true
  t.references :achievement, null: false, foreign_key: true
  t.references :game, foreign_key: true   # Game where it was earned (nullable for lifetime achievements)
  t.integer :progress, null: false, default: 0   # Current count toward tier_target
  t.datetime :unlocked_at

  t.timestamps

  t.index [:user_id, :achievement_id], unique: true
end
```

## friendships

```ruby
create_table :friendships do |t|
  t.references :user, null: false, foreign_key: true
  t.references :friend, null: false, foreign_key: { to_table: :users }
  t.string :status, null: false, default: "pending"  # pending, accepted, declined
  t.datetime :accepted_at

  t.timestamps

  t.index [:user_id, :friend_id], unique: true
  t.index [:friend_id, :user_id]  # For reverse lookups
end
```
