class Game < ApplicationRecord
  include AASM

  # Every save (moves, bot turns, round changes) tells subscribed pages to
  # refresh; the layout morphs them in place, so all players stay in sync.
  broadcasts_refreshes

  has_many :game_players, dependent: :destroy
  has_many :users, through: :game_players
  has_many :match_results, dependent: :destroy
  belongs_to :winner, class_name: "User", optional: true
  belongs_to :rematch_source, class_name: "Game", foreign_key: :rematch_of, optional: true

  validates :mode, presence: true, inclusion: { in: %w[solo casual ranked local] }
  validates :min_players, numericality: { greater_than_or_equal_to: 2 }

  aasm column: :status do
    state :waiting, initial: true
    state :in_progress
    state :completed
    state :abandoned
    state :expired

    event :start do
      transitions from: :waiting, to: :in_progress, guard: :enough_players?
    end

    event :complete do
      transitions from: :in_progress, to: :completed
    end

    event :abandon do
      transitions from: [:waiting, :in_progress], to: :abandoned
    end

    event :expire do
      transitions from: :waiting, to: :expired
    end
  end

  def enough_players?
    game_players.count >= min_players
  end
end
