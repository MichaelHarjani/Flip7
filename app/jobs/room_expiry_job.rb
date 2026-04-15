class RoomExpiryJob < ApplicationJob
  queue_as :default

  def perform(game_id)
    game = Game.find_by(id: game_id)
    return unless game&.may_expire?
    if game.game_players.where(is_bot: false).count <= 1
      game.expire!
    end
  end
end
