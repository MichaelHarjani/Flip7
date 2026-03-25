class GameChannel < ApplicationCable::Channel
  def subscribed
    game = Game.find_by(id: params[:game_id])
    if game
      stream_from "game_#{game.id}"
    else
      reject
    end
  end

  def unsubscribed
  end
end
