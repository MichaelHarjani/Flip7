class CreateMatchResults < ActiveRecord::Migration[8.1]
  def change
    create_table :match_results do |t|
      t.references :game, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.integer :final_score, null: false
      t.integer :placement, null: false
      t.integer :rounds_played, null: false
      t.integer :total_flip7s, null: false, default: 0
      t.integer :highest_round_score, null: false, default: 0
      t.integer :elo_before
      t.integer :elo_after
      t.integer :elo_change
      t.string :mode, null: false

      t.timestamps
    end

    add_index :match_results, [:user_id, :created_at]
    add_index :match_results, [:mode, :created_at]
  end
end
