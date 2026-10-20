class GamesController < ApplicationController
  before_action :authenticate_user!, except: [:show]
  before_action :set_game, only: [:show, :join]

  def new
    @mode = params[:mode] || "casual"
    @game = Game.new
  end

  def create
    mode = params.dig(:game, :mode) || "casual"
    if mode == "solo"
      create_solo_game
    else
      create_casual_game
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

  def create_casual_game
    min_players = params.dig(:game, :min_players)&.to_i || 2
    max_players = params.dig(:game, :max_players)&.to_i

    @game = Game.new(
      mode: "casual",
      min_players: min_players,
      max_players: max_players,
      room_code: RoomCodeGenerator.generate
    )

    if @game.save
      @game.game_players.create!(user: current_user, seat_position: 0)
      RoomExpiryJob.set(wait: 5.minutes).perform_later(@game.id)
      redirect_to @game, notice: "Game created"
    else
      @mode = "casual"
      render :new, status: :unprocessable_entity
    end
  end

  def create_solo_game
    bot_count = params.dig(:game, :bot_count).to_i
    bot_count = 1 if bot_count < 1
    bot_count = 9 if bot_count > 9

    # Bot strategies are assigned automatically for variety — random per bot.
    strategies = Array.new(bot_count) { BotBrain::STRATEGIES.sample }

    @game = Game.new(
      mode: "solo",
      min_players: 2,
      max_players: bot_count + 1,
      room_code: nil
    )

    Game.transaction do
      @game.save!
      @game.game_players.create!(
        user: current_user,
        seat_position: 0,
        is_bot: false
      )
      strategies.each_with_index do |strategy, i|
        bot_user = find_or_create_bot_user(strategy: strategy)
        @game.game_players.create!(
          user: bot_user,
          seat_position: i + 1,
          is_bot: true,
          bot_strategy: strategy
        )
      end
      @game.start! if @game.may_start?
      GameEngine.start_round(@game)
      GameFlow.after_move(@game)
    end

    BotTurnJob.perform_later(@game.id)
    redirect_to @game, notice: "Game started"
  rescue ActiveRecord::RecordInvalid, AASM::InvalidTransition => e
    @mode = "solo"
    @game ||= Game.new(mode: "solo")
    flash.now[:alert] = "Could not start solo game: #{e.message}"
    render :new, status: :unprocessable_entity
  end

  def find_or_create_bot_user(strategy:)
    suffix = SecureRandom.hex(4)
    User.create!(
      email: "bot-#{strategy}-#{suffix}@flip7.local",
      password: SecureRandom.hex(16),
      name: "Bot (#{strategy.capitalize})"
    )
  end
end
