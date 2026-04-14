class CreateGames < ActiveRecord::Migration[8.1]
  def change
    create_table :games do |t|
      t.string :room_code, limit: 4
      t.string :mode, null: false
      t.string :status, null: false, default: "waiting"
      t.integer :min_players, null: false, default: 2
      t.integer :max_players
      t.integer :deck_count, null: false, default: 1
      t.integer :current_round, null: false, default: 0
      t.integer :current_turn_player_index
      t.integer :turn_number, null: false, default: 0
      t.datetime :turn_expires_at
      t.jsonb :deck, null: false, default: []
      t.jsonb :round_state, null: false, default: {}
      t.jsonb :cumulative_scores, null: false, default: {}
      t.integer :winner_id
      t.integer :rematch_of
      t.integer :lock_version, null: false, default: 0

      t.timestamps
    end

    add_index :games, :room_code, unique: true, where: "status IN ('waiting', 'in_progress')"
    add_index :games, :status
    add_index :games, :mode
  end
end
