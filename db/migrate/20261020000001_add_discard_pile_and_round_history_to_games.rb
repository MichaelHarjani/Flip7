class AddDiscardPileAndRoundHistoryToGames < ActiveRecord::Migration[8.1]
  def change
    add_column :games, :discard_pile, :jsonb, default: [], null: false
    add_column :games, :round_history, :jsonb, default: [], null: false
  end
end
