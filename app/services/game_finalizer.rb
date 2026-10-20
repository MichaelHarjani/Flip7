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
    return nil if cumulative.size < 2

    # Final standings: the engine's tie-broken winner first, then everyone
    # else by score.
    winner_id = GameEngine.winner_id(game)
    standing_ids = [winner_id] +
      cumulative.sort_by { |_id, score| -score.to_i }.map { |id, _| id.to_i }.reject { |id| id == winner_id }
    standings = User.find(standing_ids).index_by(&:id).values_at(*standing_ids)

    if game.mode == "ranked"
      finalize_ranked(game, standings.first, standings.last, cumulative)
    else
      finalize_unranked(game, standings, cumulative)
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

  # Every seat gets a MatchResult with its placement (solo / casual games
  # can have up to 10+ players); only the winner's games_won increments.
  def self.finalize_unranked(game, standings, cumulative)
    match_results = []

    ActiveRecord::Base.transaction do
      standings.each_with_index do |user, idx|
        match_results << MatchResult.create!(
          game: game,
          user: user,
          final_score: (cumulative[user.id.to_s] || 0).to_i,
          placement: idx + 1,
          rounds_played: game.current_round.to_i,
          mode: game.mode
        )
        user.update!(
          games_played: user.games_played + 1,
          games_won: user.games_won + (idx.zero? ? 1 : 0)
        )
      end

      game.update!(winner_id: standings.first.id)
      complete_game(game)
    end

    { winner: standings.first, loser: standings.last, match_results: match_results }
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
