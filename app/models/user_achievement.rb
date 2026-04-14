class UserAchievement < ApplicationRecord
  belongs_to :user
  belongs_to :achievement
  belongs_to :game, optional: true

  validates :user_id, uniqueness: { scope: :achievement_id }
  validates :progress, numericality: { greater_than_or_equal_to: 0 }

  scope :unlocked, -> { where.not(unlocked_at: nil) }
  scope :in_progress, -> { where(unlocked_at: nil) }
end
