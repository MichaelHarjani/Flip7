class BotTurnJob < ApplicationJob
  queue_as :default

  MAX_ITERATIONS = 50

  def perform(game_id, iteration = 0)
    return if iteration >= MAX_ITERATIONS

    game = Game.find_by(id: game_id)
    return unless game
    return unless game.in_progress?

    current_player = current_player_for(game)
    return unless current_player&.is_bot

    # Light pacing for UX, but skip in tests so the suite stays fast.
    sleep(rand(0.05..0.25)) unless Rails.env.test?

    perform_bot_turn(game, current_player)

    game.reload
    return unless game.in_progress?

    next_player = current_player_for(game)
    if next_player&.is_bot
      self.class.perform_later(game_id, iteration + 1)
    end
  end

  private

  def current_player_for(game)
    idx = game.current_turn_player_index
    return nil if idx.nil?

    ordered = game.game_players.order(:seat_position).to_a
    ordered[idx % ordered.size]
  end

  def perform_bot_turn(game, bot_player)
    strategy = bot_player.bot_strategy.presence || "balanced"
    brain = BotBrain.new(
      strategy: strategy,
      game_state: game,
      player_id: bot_player.user_id
    )

    # If a pending action targets this bot's drawer slot, resolve it before deciding.
    pending = game.round_state["pending_action"]
    if pending && pending["drawer_id"].to_s == bot_player.user_id.to_s
      target_id = brain.choose_action_target(pending["type"]) || bot_player.user_id
      GameEngine.resolve_action(game, bot_player.user_id, pending["type"], target_id)
      return
    end

    decision = brain.decide
    if decision == :hit
      GameEngine.hit(game, bot_player.user_id)
      # If hitting raised a pending action, resolve immediately.
      game.reload
      pending = game.round_state["pending_action"]
      if pending && pending["drawer_id"].to_s == bot_player.user_id.to_s
        target_id = BotBrain.new(
          strategy: strategy,
          game_state: game,
          player_id: bot_player.user_id
        ).choose_action_target(pending["type"]) || bot_player.user_id
        GameEngine.resolve_action(game, bot_player.user_id, pending["type"], target_id)
      end
    else
      GameEngine.stay(game, bot_player.user_id)
    end
  rescue GameEngine::Error
    # Swallow: stale enqueue, deck empty, etc. Job will not re-enqueue.
  end
end
