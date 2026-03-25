class RoomsController < ApplicationController
  def new
  end

  def create
    player_name = params[:player_name].presence || "Player 1"

    room_code = Game.generate_room_code

    game = Game.create!(
      room_code: room_code,
      mode: :online_multiplayer,
      status: :waiting,
      state: {},
      settings: { max_players: 4 }
    )

    game.game_players.create!(
      name: player_name,
      player_index: 0,
      is_ai: false,
      session_token: current_session_token
    )

    redirect_to room_path(game)
  end

  def show
    @game = Game.find(params[:id])

    # If game already started, redirect to game board
    if @game.playing? || @game.round_end? || @game.game_end?
      redirect_to game_path(@game) and return
    end

    @players = @game.game_players.order(:player_index)
    @is_host = @game.game_players.find_by(player_index: 0)&.session_token == current_session_token
    @room_code = @game.room_code
  end

  def join
    # GET form for entering room code
  end

  def process_join
    room_code = params[:room_code]&.strip&.upcase
    player_name = params[:player_name].presence || "Player #{rand(100..999)}"

    game = Game.find_by(room_code: room_code, status: :waiting)

    unless game
      flash[:error] = "Room not found or game already started"
      redirect_to join_rooms_path and return
    end

    max_players = game.settings&.dig("max_players") || 4
    if game.game_players.count >= max_players
      flash[:error] = "Room is full"
      redirect_to join_rooms_path and return
    end

    # Check if already in this room
    existing = game.game_players.find_by(session_token: current_session_token)
    unless existing
      game.game_players.create!(
        name: player_name,
        player_index: game.game_players.count,
        is_ai: false,
        session_token: current_session_token
      )
      game.broadcast_update
    end

    redirect_to room_path(game)
  end

  def start
    game = Game.find(params[:id])

    # Only host can start
    host = game.game_players.find_by(player_index: 0)
    unless host&.session_token == current_session_token
      flash[:error] = "Only the host can start the game"
      redirect_to room_path(game) and return
    end

    if game.game_players.count < 2
      flash[:error] = "Need at least 2 players"
      redirect_to room_path(game) and return
    end

    # Build game state from players
    players = game.game_players.order(:player_index)

    state = GameService.create_game(
      player_names: players.map(&:name),
      ai_difficulties: []
    )

    # Assign proper player IDs
    players.each_with_index do |gp, idx|
      state[:players][idx][:id] = "player-#{idx}"
    end

    svc = GameService.new(state)
    svc.start_round

    game.update!(state: svc.state, status: :playing)
    game.broadcast_update

    redirect_to game_path(game)
  end
end
