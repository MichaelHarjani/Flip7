class GamesController < ApplicationController
  # Bot seat names (from the earlier f7 build).
  BOT_NAMES = %w[Ada Boris Cleo Dex Ember Flynn Gus Hana Ivy Juno Kaz Lux].freeze

  before_action :authenticate_user!, except: [:show]
  before_action :set_game, only: [:show, :join, :start]

  def new
    @mode = params[:mode] || "casual"
    @game = Game.new
  end

  def create
    mode = params.dig(:game, :mode) || "casual"
    if mode == "solo"
      create_solo_game
    elsif mode == "local"
      create_local_game
    else
      create_casual_game
    end
  end

  def show
    @board = GameBoard.new(@game, controlled_user_ids: controlled_user_ids)
  end

  # The host (seat 0) starts a casual game once enough players have joined.
  def start
    host = @game.game_players.order(:seat_position).first
    unless host&.user_id == current_user.id
      redirect_to @game, alert: "Only the host can start the game", status: :see_other
      return
    end

    @game.with_lock do
      if @game.may_start?
        @game.start!
        GameEngine.start_round(@game)
        GameFlow.after_move(@game)
      end
    end
    BotTurnJob.perform_later(@game.id) if @game.game_players.exists?(is_bot: true)
    redirect_to @game, status: :see_other
  rescue AASM::InvalidTransition
    redirect_to @game, alert: "Not enough players yet", status: :see_other
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

  # Seats the viewer may act for on this device: themselves, or — for the
  # owner of a pass-and-play game — every human seat.
  def controlled_user_ids
    return [] unless user_signed_in?
    return [] unless @game.game_players.exists?(user_id: current_user.id)
    if @game.mode == "local" && @game.game_players.order(:seat_position).first&.user_id == current_user.id
      @game.game_players.where(is_bot: false).order(:seat_position).pluck(:user_id)
    else
      [current_user.id]
    end
  end

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
      bot_names = BOT_NAMES.sample(bot_count)
      strategies.each_with_index do |strategy, i|
        bot_user = find_or_create_bot_user(strategy: strategy)
        @game.game_players.create!(
          user: bot_user,
          seat_position: i + 1,
          is_bot: true,
          bot_strategy: strategy,
          display_name: bot_names[i]
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

  # Pass-and-play (from the earlier flip7 build): several people share this
  # device. Seat 0 is the signed-in owner; the other named seats get
  # throwaway guest users so the engine can key them like anyone else.
  def create_local_game
    names = Array(params.dig(:game, :player_names)).map { |n| n.to_s.strip.first(20) }.reject(&:blank?).first(8)
    names[0] ||= current_user.name.presence || "Player 1"
    bot_count = params.dig(:game, :bot_count).to_i.clamp(0, 4)

    if names.size + bot_count < 2
      @mode = "local"
      @game = Game.new(mode: "local")
      flash.now[:alert] = "Add at least one more player or a bot"
      render :new, status: :unprocessable_entity
      return
    end

    @game = Game.new(mode: "local", min_players: 2, max_players: names.size + bot_count)
    Game.transaction do
      @game.save!
      @game.game_players.create!(user: current_user, seat_position: 0, display_name: names[0])
      names.drop(1).each_with_index do |name, i|
        guest = User.create!(email: "local-#{SecureRandom.hex(6)}@flip7.local", password: SecureRandom.hex(16), name: name)
        @game.game_players.create!(user: guest, seat_position: i + 1, display_name: name)
      end
      (BOT_NAMES - names).sample(bot_count).each_with_index do |bot_name, i|
        strategy = BotBrain::STRATEGIES.sample
        @game.game_players.create!(
          user: find_or_create_bot_user(strategy: strategy),
          seat_position: names.size + i, is_bot: true, bot_strategy: strategy, display_name: bot_name
        )
      end
      @game.start!
      GameEngine.start_round(@game)
      GameFlow.after_move(@game)
    end

    BotTurnJob.perform_later(@game.id) if bot_count.positive?
    redirect_to @game
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
