class MovesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_game
  before_action :ensure_player_in_game

  def hit
    GameEngine.hit(@game, current_user.id)
    maybe_advance_bots
    redirect_to @game
  rescue GameEngine::InvalidTurnError => e
    head :forbidden
  rescue GameEngine::Error, ActiveRecord::RecordInvalid => e
    redirect_to @game, alert: e.message
  end

  def stay
    GameEngine.stay(@game, current_user.id)
    maybe_advance_bots
    redirect_to @game
  rescue GameEngine::InvalidTurnError => e
    head :forbidden
  rescue GameEngine::Error, ActiveRecord::RecordInvalid => e
    redirect_to @game, alert: e.message
  end

  def target
    action_type = params[:action_type].to_s
    target_id = params[:target_id].to_i
    GameEngine.resolve_action(@game, current_user.id, action_type, target_id)
    maybe_advance_bots
    redirect_to @game
  rescue GameEngine::InvalidTurnError => e
    head :forbidden
  rescue GameEngine::Error, ActiveRecord::RecordInvalid => e
    redirect_to @game, alert: e.message
  end

  private

  def set_game
    @game = Game.find(params[:game_id])
  end

  def ensure_player_in_game
    return if @game.game_players.exists?(user_id: current_user.id)
    head :forbidden
  end

  def maybe_advance_bots
    return unless @game.mode == "solo"
    BotTurnJob.perform_later(@game.id)
  end
end
