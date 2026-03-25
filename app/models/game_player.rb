class GamePlayer < ApplicationRecord
  belongs_to :game

  validates :name, presence: true
  validates :player_index, presence: true

  before_create :generate_session_token, unless: :is_ai?

  def is_ai?
    is_ai
  end

  private

  def generate_session_token
    self.session_token ||= SecureRandom.hex(16)
  end
end
