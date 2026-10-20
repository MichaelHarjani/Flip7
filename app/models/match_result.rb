class MatchResult < ApplicationRecord
  belongs_to :game
  belongs_to :user

  validates :final_score, :placement, :rounds_played, :mode, presence: true
  validates :mode, inclusion: { in: %w[solo casual ranked local] }

  scope :for_mode, ->(mode) { where(mode: mode) }
  scope :recent, -> { order(created_at: :desc) }
end
