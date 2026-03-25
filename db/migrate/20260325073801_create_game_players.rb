class CreateGamePlayers < ActiveRecord::Migration[8.1]
  def change
    create_table :game_players do |t|
      t.references :game, null: false, foreign_key: true
      t.string :name, null: false
      t.integer :player_index, null: false
      t.boolean :is_ai, default: false
      t.boolean :is_connected, default: true
      t.string :session_token

      t.timestamps
    end

    add_index :game_players, :session_token
  end
end
