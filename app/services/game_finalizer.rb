class GameFinalizer
  # Finalizes a game by recording MatchResults and (for ranked games)
  # updating Elo ratings + ranked W/L counts. Idempotent: a second call
  # is a no-op once MatchResults exist for the game.
  #
  # Returns:
  #   { winner:, loser:, match_results: [...] } on success
  #   nil if already finalized or fewer than 2 players
  def self.finalize(game)
    return nil if MatchResult.where(game: game).exists?

    cumulative = game.cumulative_scores || {}
    sorted = cumulative.sort_by { |_id, score| -score.to_i }
    return nil if sorted.size < 2

    winner_id = sorted.first[0].to_i
    loser_id  = sorted.last[0].to_i
    winner = User.find(winner_id)
    loser  = User.find(loser_id)

    if game.mode == "ranked"
      finalize_ranked(game, winner, loser, cumulative)
    else
      finalize_unranked(game, winner, loser, cumulative)
    end
  end

  def self.finalize_ranked(game, winner, loser, cumulative)
    result = EloCalculator.calculate(winner: winner, loser: loser)

    winner_match = nil
    loser_match  = nil

    ActiveRecord::Base.transaction do
      winner_before = winner.elo_rating
      loser_before  = loser.elo_rating

      winner_match = MatchResult.create!(
        game: game,
        user: winner,
        final_score: (cumulative[winner.id.to_s] || 0).to_i,
        placement: 1,
        rounds_played: game.current_round.to_i,
        elo_before: winner_before,
        elo_after: result[:winner_new_rating],
        elo_change: result[:winner_delta],
        mode: "ranked"
      )

      loser_match = MatchResult.create!(
        game: game,
        user: loser,
        final_score: (cumulative[loser.id.to_s] || 0).to_i,
        placement: 2,
        rounds_played: game.current_round.to_i,
        elo_before: loser_before,
        elo_after: result[:loser_new_rating],
        elo_change: result[:loser_delta],
        mode: "ranked"
      )

      winner.update!(
        elo_rating: result[:winner_new_rating],
        games_played: winner.games_played + 1,
        games_won: winner.games_won + 1,
        ranked_wins: winner.ranked_wins + 1
      )
      loser.update!(
        elo_rating: result[:loser_new_rating],
        games_played: loser.games_played + 1,
        ranked_losses: loser.ranked_losses + 1
      )

      game.update!(winner_id: winner.id)
      complete_game(game)
    end

    { winner: winner, loser: loser, match_results: [winner_match, loser_match] }
  end

  def self.finalize_unranked(game, winner, loser, cumulative)
    winner_match = nil
    loser_match  = nil

    ActiveRecord::Base.transaction do
      winner_match = MatchResult.create!(
        game: game,
        user: winner,
        final_score: (cumulative[winner.id.to_s] || 0).to_i,
        placement: 1,
        rounds_played: game.current_round.to_i,
        mode: game.mode
      )
      loser_match = MatchResult.create!(
        game: game,
        user: loser,
        final_score: (cumulative[loser.id.to_s] || 0).to_i,
        placement: 2,
        rounds_played: game.current_round.to_i,
        mode: game.mode
      )

      winner.update!(
        games_played: winner.games_played + 1,
        games_won: winner.games_won + 1
      )
      loser.update!(
        games_played: loser.games_played + 1
      )

      game.update!(winner_id: winner.id)
      complete_game(game)
    end

    { winner: winner, loser: loser, match_results: [winner_match, loser_match] }
  end

  def self.complete_game(game)
    if game.respond_to?(:may_complete?) && game.may_complete?
      game.complete!
    else
      game.update_columns(status: "completed") unless game.status == "completed"
    end
  end

  private_class_method :finalize_ranked, :finalize_unranked, :complete_game
end
