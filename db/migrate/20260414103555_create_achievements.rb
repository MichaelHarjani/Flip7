class CreateAchievements < ActiveRecord::Migration[8.1]
  def change
    create_table :achievements do |t|
      t.string :key, null: false
      t.string :name, null: false
      t.text :description, null: false
      t.string :category, null: false
      t.string :rarity, null: false
      t.string :icon, null: false
      t.boolean :is_anti, null: false, default: false
      t.integer :tier_target
      t.string :parent_key

      t.timestamps
    end

    add_index :achievements, :key, unique: true
  end
end
