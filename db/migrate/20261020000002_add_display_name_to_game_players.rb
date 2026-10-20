class AddDisplayNameToGamePlayers < ActiveRecord::Migration[8.1]
  def change
    add_column :game_players, :display_name, :string
  end
end
