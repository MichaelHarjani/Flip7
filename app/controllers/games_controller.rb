class GamesController < ApplicationController
  before_action :set_game, only: [ :show, :hit, :stay, :play_action_card, :next_round, :ai_turn ]

  def new
    @mode = params[:mode] || "single_player"
  end

  def create
    mode = params[:mode] || "single_player"

    if mode == "local_multiplayer"
      create_local_game
    else
      create_single_player_game
    end
  end

  def show
    # Auto-process AI turns if it's an AI's turn when page loads
    state = @game.state.deep_symbolize_keys
    if state[:game_status] == "playing"
      current = state[:players][state[:current_player_index]]
      if current && current[:is_ai]
        process_ai_turns_if_needed
        @game.reload
      end
    end

    @state = @game.state.deep_symbolize_keys
    @players = @state[:players]
    @current_player = @players[@state[:current_player_index]]
    @current_player_index = @state[:current_player_index]
    @is_local = @game.local_multiplayer?
    @is_online = @game.online_multiplayer?

    if @is_local
      # In local mode, the current player is whoever's turn it is
      @my_player_index = @current_player_index
      @my_player = @current_player
      @is_my_turn = @state[:game_status] == "playing" && @current_player[:is_active] && !@current_player[:has_busted]
    elsif @is_online
      @my_player_index = find_my_player_index
      @my_player = @my_player_index ? @players[@my_player_index] : nil
      @is_my_turn = @my_player_index == @current_player_index
    else
      # Single player — always player 0
      @my_player_index = find_my_player_index
      @my_player = @my_player_index ? @players[@my_player_index] : nil
      @is_my_turn = @my_player_index == @current_player_index
    end
  end

  def hit
    state = @game.state.deep_symbolize_keys
    unless state[:game_status] == "playing"
      redirect_to game_path(@game) and return
    end

    player_id = current_acting_player_id(state)
    player = state[:players].find { |p| p[:id] == player_id }

    unless player && player[:is_active] && !player[:has_busted]
      redirect_to game_path(@game) and return
    end

    svc = GameService.new(@game.state)
    svc.hit(player_id)
    @game.update!(state: svc.state, status: game_status_from(svc.state))

    process_ai_turns_if_needed
    @game.broadcast_update if @game.online_multiplayer?

    redirect_to game_path(@game)
  end

  def stay
    state = @game.state.deep_symbolize_keys
    unless state[:game_status] == "playing"
      redirect_to game_path(@game) and return
    end

    player_id = current_acting_player_id(state)
    player = state[:players].find { |p| p[:id] == player_id }

    unless player && player[:is_active] && !player[:has_busted]
      redirect_to game_path(@game) and return
    end

    svc = GameService.new(@game.state)
    svc.stay(player_id)
    @game.update!(state: svc.state, status: game_status_from(svc.state))

    process_ai_turns_if_needed
    @game.broadcast_update if @game.online_multiplayer?

    redirect_to game_path(@game)
  end

  def play_action_card
    state = @game.state.deep_symbolize_keys
    unless state[:game_status] == "playing"
      redirect_to game_path(@game) and return
    end

    player_id = current_acting_player_id(state)

    svc = GameService.new(@game.state)
    svc.play_action_card(player_id, params[:card_id], params[:target_player_id])
    @game.update!(state: svc.state, status: game_status_from(svc.state))

    process_ai_turns_if_needed
    @game.broadcast_update if @game.online_multiplayer?

    redirect_to game_path(@game)
  end

  def next_round
    svc = GameService.new(@game.state)
    svc.start_next_round
    @game.update!(state: svc.state, status: game_status_from(svc.state))

    process_ai_turns_if_needed
    @game.broadcast_update if @game.online_multiplayer?

    redirect_to game_path(@game)
  end

  def ai_turn
    process_ai_turns_if_needed
    redirect_to game_path(@game)
  end

  private

  def set_game
    @game = Game.find(params[:id])
  end

  # Determine which player is acting right now
  def current_acting_player_id(state)
    if @game.local_multiplayer?
      # In local mode, the current player is always whoever's turn it is
      state[:players][state[:current_player_index]][:id]
    else
      # In single/online mode, use session token to find the player
      idx = find_my_player_index
      state[:players][idx][:id]
    end
  end

  def find_my_player_index
    gp = @game.game_players.find_by(session_token: current_session_token)
    gp&.player_index || 0
  end

  def game_status_from(state)
    s = state.is_a?(Hash) ? (state[:game_status] || state["game_status"]) : "playing"
    case s
    when "waiting" then :waiting
    when "playing" then :playing
    when "round_end" then :round_end
    when "game_end" then :game_end
    else :playing
    end
  end

  def create_single_player_game
    player_name = params[:player_name].presence || "You"
    ai_count = (params[:ai_count] || 2).to_i.clamp(1, 3)
    ai_difficulty = params[:ai_difficulty] || "moderate"

    ai_names = [ "Bot Alpha", "Bot Beta", "Bot Gamma" ].first(ai_count)
    all_names = [ player_name ] + ai_names
    ai_difficulties = ai_names.map { ai_difficulty }

    state = GameService.create_game(
      player_names: all_names,
      ai_difficulties: ai_difficulties
    )

    game = Game.create!(
      mode: :single_player,
      status: :waiting,
      state: state,
      settings: { ai_difficulty: ai_difficulty }
    )

    all_names.each_with_index do |name, idx|
      game.game_players.create!(
        name: name,
        player_index: idx,
        is_ai: idx > 0,
        session_token: idx == 0 ? current_session_token : nil
      )
    end

    svc = GameService.new(game.state)
    svc.start_round
    game.update!(state: svc.state, status: :playing)

    @game = game
    process_ai_turns_if_needed

    redirect_to game_path(game)
  end

  def create_local_game
    player_count = (params[:player_count] || 2).to_i.clamp(2, 4)
    names = (params[:player_names] || []).first(player_count).map.with_index do |name, i|
      name.presence || "Player #{i + 1}"
    end
    # Pad if not enough names
    while names.length < player_count
      names << "Player #{names.length + 1}"
    end

    state = GameService.create_game(
      player_names: names,
      ai_difficulties: []
    )

    game = Game.create!(
      mode: :local_multiplayer,
      status: :waiting,
      state: state,
      settings: {}
    )

    names.each_with_index do |name, idx|
      game.game_players.create!(
        name: name,
        player_index: idx,
        is_ai: false,
        session_token: current_session_token # All share the same session in local mode
      )
    end

    svc = GameService.new(game.state)
    svc.start_round
    game.update!(state: svc.state, status: :playing)

    redirect_to game_path(game)
  end

  def process_ai_turns_if_needed
    state = @game.state.deep_symbolize_keys
    return unless state[:game_status] == "playing"

    loop do
      state = @game.state.deep_symbolize_keys
      break unless state[:game_status] == "playing"

      current = state[:players][state[:current_player_index]]
      break unless current[:is_ai]

      svc = GameService.new(@game.state)
      difficulty = current[:ai_difficulty] || "moderate"

      if state[:pending_action_card] && state[:pending_action_card][:player_id] == current[:id]
        decision = AiService.decide(current, state, difficulty)
        if decision[:action_card]
          svc.play_action_card(current[:id], decision[:action_card][:card_id], decision[:action_card][:target_player_id])
        end
      else
        decision = AiService.decide(current, state, difficulty)
        if decision[:action] == "hit"
          svc.hit(current[:id])
        else
          svc.stay(current[:id])
        end
      end

      @game.update!(state: svc.state, status: game_status_from(svc.state))
    end
  end
end
