class GamesController < ApplicationController
  before_action :authenticate_user!, except: [:show]
  before_action :set_game, only: [:show, :join]

  def new
    @game = Game.new
  end

  def create
    mode = params.dig(:game, :mode) || "casual"
    min_players = params.dig(:game, :min_players)&.to_i || 2
    max_players = params.dig(:game, :max_players)&.to_i

    @game = Game.new(
      mode: mode,
      min_players: min_players,
      max_players: max_players,
      room_code: mode == "casual" ? RoomCodeGenerator.generate : nil
    )

    if @game.save
      @game.game_players.create!(user: current_user, seat_position: 0)
      RoomExpiryJob.set(wait: 5.minutes).perform_later(@game.id) if mode == "casual"
      redirect_to @game, notice: "Game created"
    else
      render :new, status: :unprocessable_entity
    end
  end

  def show
    # Stub view — real game board comes in p2-solo-game-flow
  end

  def join
    existing = @game.game_players.find_by(user: current_user)
    if existing
      redirect_to @game, notice: "You're already in this game"
      return
    end

    if @game.max_players && @game.game_players.count >= @game.max_players
      redirect_to root_path, alert: "Game is full"
      return
    end

    next_seat = @game.game_players.maximum(:seat_position).to_i + 1
    @game.game_players.create!(user: current_user, seat_position: next_seat)
    redirect_to @game
  end

  private

  def set_game
    @game = Game.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    redirect_to root_path, alert: "Game not found"
  end
end
