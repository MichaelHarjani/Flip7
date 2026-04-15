class MatchmakingChannel < ApplicationCable::Channel
  def subscribed
    return reject unless current_user

    stream_for current_user
    elo = current_user.elo_rating || EloCalculator::STARTING_ELO
    MatchmakingQueue.add(current_user.id, elo)
  end

  def unsubscribed
    MatchmakingQueue.remove(current_user.id) if current_user
  end

  # Broadcasts a match-found notification to a specific user. Used by
  # MatchmakingWorkerJob when it pairs two players.
  def self.broadcast_match(user_id, game_id)
    user = User.find_by(id: user_id)
    return unless user

    broadcast_to(user, { type: "match_found", game_id: game_id })
  end
end
