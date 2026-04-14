class CreateUserAchievements < ActiveRecord::Migration[8.1]
  def change
    create_table :user_achievements do |t|
      t.references :user, null: false, foreign_key: true
      t.references :achievement, null: false, foreign_key: true
      t.references :game, foreign_key: true
      t.integer :progress, null: false, default: 0
      t.datetime :unlocked_at

      t.timestamps

      t.index [:user_id, :achievement_id], unique: true
    end
  end
end
