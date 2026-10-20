# GameFlow — the round/game lifecycle around GameEngine.
#
# GameEngine resolves single actions; nothing in it decides when a round is
# over or the game is won. Callers (MovesController, BotTurnJob, game
# creation) run GameFlow.after_move after every engine call. When the round
# has ended it is scored once, recorded in game.round_history, and either the
# game is finalized (someone reached 200) or the round waits in a
# "round_over" state until a player asks for the next one (next_round).
#
# Ported from the earlier flip7 build's GameService#end_round /
# start_next_round, adapted to GameEngine's jsonb state.
class GameFlow
  # Returns :round_over, :game_over, or nil (round still running).
  def self.after_move(game)
    return nil unless game.in_progress?

    rs = game.round_state || {}
    return nil if rs["round_over"]
    return nil unless GameEngine.check_round_end(game)

    round_scores = GameEngine.score_round(game)
    record_round(game, round_scores)

    if GameEngine.check_game_end(game)
      GameFinalizer.finalize(game)
      :game_over
    else
      :round_over
    end
  end

  # Start the next round. Guarded by round number so that several players
  # (or a double click, or the auto-advance timer) asking at once only
  # advance the game a single round. Returns true if a round was started.
  def self.next_round(game, from_round)
    return false unless game.in_progress?
    return false unless (game.round_state || {})["round_over"]
    return false unless game.current_round == from_round.to_i

    GameEngine.start_round(game)
    after_move(game)
    true
  end

  # Round summary kept for the round-end screen, the game-end "round by
  # round" table, and the largest-round highlight.
  def self.record_round(game, round_scores)
    rs = game.round_state
    statuses = rs["player_statuses"] || {}
    flip7_winner = rs["flip7_winner_id"]

    game.round_history = (game.round_history || []) + [{
      "round"           => game.current_round,
      "scores"          => round_scores,
      "busted"          => statuses.select { |_, s| s == "busted" }.keys,
      "flip7_winner_id" => flip7_winner,
      "hands"           => rs["player_hands"]
    }]
    rs["round_over"] = true
    game.round_state = rs
    game.save!

    update_player_stats(game, round_scores, flip7_winner)
  end

  def self.update_player_stats(game, round_scores, flip7_winner)
    humans = game.game_players.includes(:user).order(:seat_position).reject(&:is_bot).map(&:user)
    # Pass-and-play guests are throwaway users; only the device owner's
    # profile stats count.
    humans = humans.first(1) if game.mode == "local"
    humans.each do |user|
      score = round_scores[user.id.to_s].to_i
      user.update!(
        total_rounds_played: user.total_rounds_played + 1,
        total_flip7s: user.total_flip7s + (flip7_winner.to_s == user.id.to_s ? 1 : 0),
        highest_round_score: [user.highest_round_score, score].max
      )
    end
  end

  # { "round" =>, "user_id" =>, "score" => } for the best single round of
  # the game, or nil before any points are scored.
  def self.largest_round(game)
    best = nil
    Array(game.round_history).each do |entry|
      entry["scores"].each do |uid, score|
        next unless score.to_i.positive?
        if best.nil? || score.to_i > best["score"]
          best = { "round" => entry["round"], "user_id" => uid.to_i, "score" => score.to_i }
        end
      end
    end
    best
  end

  private_class_method :record_round, :update_player_stats
end
