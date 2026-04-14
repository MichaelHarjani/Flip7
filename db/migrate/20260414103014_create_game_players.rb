class CreateGamePlayers < ActiveRecord::Migration[8.1]
  def change
    create_table :game_players do |t|
      t.references :game, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.integer :seat_position, null: false
      t.boolean :is_bot, null: false, default: false
      t.string :bot_strategy
      t.boolean :connected, null: false, default: true
      t.datetime :disconnected_at

      t.timestamps
    end

    add_index :game_players, [:game_id, :user_id], unique: true
    add_index :game_players, [:game_id, :seat_position], unique: true
  end
end
