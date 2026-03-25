class Game < ApplicationRecord
  has_many :game_players, dependent: :destroy

  enum :status, { waiting: 0, playing: 1, round_end: 2, game_end: 3 }
  enum :mode, { single_player: 0, local_multiplayer: 1, online_multiplayer: 2 }

  validates :status, presence: true
  validates :mode, presence: true

  def self.generate_room_code
    loop do
      code = SecureRandom.alphanumeric(6).upcase
      break code unless exists?(room_code: code)
    end
  end

  def human_players
    game_players.where(is_ai: false)
  end

  def ai_players
    game_players.where(is_ai: true)
  end

  def broadcast_update
    ActionCable.server.broadcast("game_#{id}", { action: "refresh" })
  end
end
