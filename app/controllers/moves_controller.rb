class MovesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_game
  before_action :ensure_player_in_game

  def hit
    play { GameEngine.hit(@game, acting_user_id) }
  end

  def stay
    play { GameEngine.stay(@game, acting_user_id) }
  end

  def target
    action_type = params[:action_type].to_s
    target_id = params[:target_id].to_i
    play { GameEngine.resolve_action(@game, acting_user_id, action_type, target_id) }
  end

  # Any seated player may start the next round once the current one is
  # over; GameFlow ignores repeat requests for a round already started.
  def next_round
    play { GameFlow.next_round(@game, params[:round]) }
  end

  private

  def set_game
    @game = Game.find(params[:game_id])
  end

  def ensure_player_in_game
    return if @game.game_players.exists?(user_id: current_user.id)
    head :forbidden
  end

  # On a pass-and-play device the owner acts for whichever human seat is up;
  # everywhere else you can only ever act as yourself.
  def acting_user_id
    requested = params[:as_user_id].presence&.to_i
    return current_user.id unless requested && requested != current_user.id
    return current_user.id unless @game.mode == "local"
    return current_user.id unless @game.game_players.order(:seat_position).first&.user_id == current_user.id
    @game.game_players.exists?(user_id: requested, is_bot: false) ? requested : current_user.id
  end

  def play
    yield
    GameFlow.after_move(@game)
    maybe_advance_bots
    redirect_to @game, status: :see_other
  rescue GameEngine::InvalidTurnError
    head :forbidden
  rescue ActiveRecord::StaleObjectError
    # Another player moved at the same moment; show them the fresh state.
    redirect_to @game, status: :see_other
  rescue GameEngine::Error, ActiveRecord::RecordInvalid => e
    redirect_to @game, alert: e.message, status: :see_other
  end

  def maybe_advance_bots
    return unless @game.in_progress? && @game.game_players.exists?(is_bot: true)
    BotTurnJob.perform_later(@game.id)
  end
end
