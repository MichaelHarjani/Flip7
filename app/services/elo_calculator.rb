class EloCalculator
  STARTING_ELO = 1000
  PROVISIONAL_K = 48
  ESTABLISHED_K = 32
  PROVISIONAL_THRESHOLD = 20
  ELO_FLOOR = 100

  # Calculates new Elo ratings after a game.
  #
  # Accepts either ActiveRecord User objects (or any object responding to
  # :elo_rating and :games_played) or plain hashes of the shape
  # { elo_rating: Integer, games_played: Integer }.
  #
  # Returns a hash:
  #   {
  #     winner_new_rating: Integer,
  #     loser_new_rating:  Integer,
  #     winner_delta:      Integer,
  #     loser_delta:       Integer
  #   }
  def self.calculate(winner:, loser:)
    winner_elo   = rating_of(winner)
    loser_elo    = rating_of(loser)
    winner_games = games_of(winner)
    loser_games  = games_of(loser)

    winner_k = k_factor(winner_games)
    loser_k  = k_factor(loser_games)

    winner_expected = expected_score(winner_elo, loser_elo)
    loser_expected  = expected_score(loser_elo, winner_elo)

    winner_raw = winner_elo + winner_k * (1.0 - winner_expected)
    loser_raw  = loser_elo  + loser_k  * (0.0 - loser_expected)

    winner_new = [winner_raw.round, ELO_FLOOR].max
    loser_new  = [loser_raw.round, ELO_FLOOR].max

    {
      winner_new_rating: winner_new,
      loser_new_rating:  loser_new,
      winner_delta:      winner_new - winner_elo,
      loser_delta:       loser_new - loser_elo
    }
  end

  # Expected score for `self_rating` against `opponent_rating`.
  # Returns a Float in (0.0, 1.0).
  def self.expected_score(self_rating, opponent_rating)
    1.0 / (1.0 + 10.0**((opponent_rating - self_rating) / 400.0))
  end

  # K-factor: provisional (48) for the first 20 games, then established (32).
  def self.k_factor(games_played)
    games_played < PROVISIONAL_THRESHOLD ? PROVISIONAL_K : ESTABLISHED_K
  end

  def self.rating_of(player)
    player.respond_to?(:elo_rating) ? player.elo_rating : player[:elo_rating]
  end

  def self.games_of(player)
    player.respond_to?(:games_played) ? player.games_played : player[:games_played]
  end
end
