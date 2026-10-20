class GamePlayer < ApplicationRecord
  belongs_to :game
  belongs_to :user

  # Lobby presence: joining or leaving refreshes everyone in the waiting room.
  after_commit -> { game.broadcast_refresh_later }, on: [:create, :destroy]

  validates :seat_position, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :user_id, uniqueness: { scope: :game_id }
  validates :seat_position, uniqueness: { scope: :game_id }
end
