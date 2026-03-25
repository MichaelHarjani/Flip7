class CreateGames < ActiveRecord::Migration[8.1]
  def change
    create_table :games do |t|
      t.string :room_code
      t.jsonb :state, default: {}
      t.integer :status, default: 0
      t.integer :mode, default: 0
      t.jsonb :settings, default: {}

      t.timestamps
    end

    add_index :games, :room_code, unique: true, where: "room_code IS NOT NULL"
    add_index :games, :status
  end
end
