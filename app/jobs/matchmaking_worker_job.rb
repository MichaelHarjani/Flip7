class MatchmakingWorkerJob < ApplicationJob
  queue_as :default

  # Expanding Elo range based on time spent in queue.
  # See docs/realtime.md §Matchmaking Algorithm.
  def self.range_for(wait_seconds)
    case wait_seconds
    when 0...10  then 50
    when 10...20 then 100
    when 20...30 then 200
    when 30...60 then 500
    else 100_000 # effectively any opponent
    end
  end

  def perform
    MatchmakingQueue.all_entries.each do |user_id, elo, wait|
      # Skip if this user was already paired earlier in this pass.
      next unless MatchmakingQueue.in_queue?(user_id)

      range = self.class.range_for(wait)
      opponent_id = MatchmakingQueue.find_match(user_id, elo, range)
      next unless opponent_id

      create_match(user_id, opponent_id)
    end
  end

  private

  def create_match(user_a_id, user_b_id)
    MatchmakingQueue.remove(user_a_id)
    MatchmakingQueue.remove(user_b_id)

    game = Game.create!(
      mode: "ranked",
      min_players: 2,
      max_players: 2,
      status: "waiting"
    )
    game.game_players.create!(user_id: user_a_id, seat_position: 0)
    game.game_players.create!(user_id: user_b_id, seat_position: 1)
    # Both seats are filled, so the duel starts right away.
    game.start!
    GameEngine.start_round(game)
    GameFlow.after_move(game)

    MatchmakingChannel.broadcast_match(user_a_id, game.id)
    MatchmakingChannel.broadcast_match(user_b_id, game.id)

    game
  end
end
