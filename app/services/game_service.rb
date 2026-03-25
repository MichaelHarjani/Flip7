# Ported from server/src/services/gameService.ts
# Manages game state transitions: rounds, dealing, hitting, staying, action cards

class GameService
  attr_reader :state

  def initialize(state)
    @state = state.deep_symbolize_keys
  end

  # --- Class methods for game creation ---

  def self.create_game(player_names:, ai_difficulties: [], target_score: 200)
    players = player_names.each_with_index.map do |name, index|
      ai_index = index - (player_names.length - ai_difficulties.length)
      is_ai = ai_index >= 0

      {
        id: "player-#{index}",
        name: name,
        is_ai: is_ai,
        cards: [],
        number_cards: [],
        modifier_cards: [],
        action_cards: [],
        score: 0,
        is_active: true,
        has_busted: false,
        has_second_chance: false,
        second_chance_used_by: nil,
        frozen_by: nil,
        ai_difficulty: is_ai ? (ai_difficulties[ai_index] || "moderate") : nil
      }
    end

    deck = DeckService.shuffle(DeckService.create_scaled_deck(players.length))

    {
      players: players,
      deck: deck,
      discard_pile: [],
      current_player_index: 0,
      round: 1,
      dealer_index: 0,
      game_status: "waiting",
      target_score: target_score,
      round_scores: {},
      round_history: [],
      largest_round: nil,
      pending_action_card: nil
    }
  end

  # --- Round management ---

  def start_round
    # Discard cards from previous round
    @state[:players].each do |player|
      @state[:discard_pile].concat(player[:cards]) if player[:cards].any?
    end

    # Reset players for new round
    @state[:players].each do |player|
      player[:cards] = []
      player[:number_cards] = []
      player[:modifier_cards] = []
      player[:action_cards] = []
      player[:is_active] = true
      player[:has_busted] = false
      player[:has_second_chance] = false
      player[:second_chance_used_by] = nil
      player[:frozen_by] = nil
    end

    @state[:round_scores] = {}
    @state[:game_status] = "playing"
    @state[:pending_action_card] = nil

    # Deal one card to each player
    @state[:players].each do |player|
      reshuffle_if_needed!
      card = @state[:deck].pop
      deal_card_to_player(player, card, initial_deal: true)
    end

    # Set current player to first active player after dealer
    set_first_player_after_dealer

    @state
  end

  def hit(player_id)
    player = find_player!(player_id)
    validate_can_act!(player)

    cards_to_draw = 1

    # Check for Flip Three in hand
    flip_three = player[:action_cards].find { |c| c[:action_type] == "flip_three" }
    if flip_three
      cards_to_draw = 3
      player[:action_cards].reject! { |c| c[:id] == flip_three[:id] }
      player[:cards].reject! { |c| c[:id] == flip_three[:id] }
      @state[:discard_pile] << flip_three
    end

    cards_to_draw.times do
      break if player[:has_busted] || GameLogic.flip7?(player)

      reshuffle_if_needed!
      card = @state[:deck].pop
      deal_card_to_player(player, card, resolving_flip_three: flip_three.present?)
    end

    # Move to next player if no pending action card
    if @state[:game_status] == "playing" && @state[:pending_action_card].nil?
      move_to_next_player
    end

    @state
  end

  def stay(player_id)
    player = find_player!(player_id)
    validate_can_act!(player)

    score = GameLogic.calculate_score(player)
    @state[:round_scores][player[:id]] = score
    player[:is_active] = false

    move_to_next_player
    check_round_end

    @state
  end

  def play_action_card(player_id, card_id, target_player_id)
    player = find_player!(player_id)
    card = player[:action_cards].find { |c| c[:id] == card_id }
    raise "Action card not found" unless card

    # Clear pending if this is the pending card
    if @state[:pending_action_card]&.dig(:card_id) == card_id &&
       @state[:pending_action_card]&.dig(:player_id) == player_id
      @state[:pending_action_card] = nil
    end

    # Determine target
    active = GameLogic.active_players(@state[:players])
    target = if target_player_id
      @state[:players].find { |p| p[:id] == target_player_id }
    elsif active.length == 1 && active[0][:id] == player_id
      player
    else
      raise "Must specify target player"
    end

    raise "Target not active" unless target && (target[:is_active] && !target[:has_busted])

    # Remove card from player's hand
    player[:action_cards].reject! { |c| c[:id] == card_id }
    player[:cards].reject! { |c| c[:id] == card_id }

    case card[:action_type]
    when "freeze"
      handle_freeze(target, card, player[:id])
      # Freeze card stays visible on the target
      target[:cards] << card
      reorganize_cards!(target)
    when "flip_three"
      handle_flip_three(target, card)
      @state[:discard_pile] << card
    end

    # Move to next player unless target has new pending action
    if @state[:game_status] == "playing"
      target_is_current = target[:id] == @state[:players][@state[:current_player_index]][:id]
      has_new_pending = @state[:pending_action_card] && @state[:pending_action_card][:player_id] == target[:id]

      unless target_is_current && has_new_pending
        move_to_next_player
      end
    end

    @state
  end

  def start_next_round
    @state[:dealer_index] = (@state[:dealer_index] + 1) % @state[:players].length
    @state[:round] += 1

    # Reshuffle if deck is low
    if @state[:deck].length < 10
      all_cards = @state[:deck] + @state[:discard_pile]
      @state[:deck] = DeckService.shuffle(all_cards)
      @state[:discard_pile] = []
    end

    start_round
  end

  private

  def deal_card_to_player(player, card, initial_deal: false, resolving_flip_three: false)
    # Handle action cards picked up during play (not initial deal)
    if !initial_deal && card[:type] == "action"
      case card[:action_type]
      when "flip_three"
        unless resolving_flip_three
          other_active = GameLogic.active_players(@state[:players]).reject { |p| p[:id] == player[:id] }
          if other_active.any?
            @state[:pending_action_card] = { player_id: player[:id], card_id: card[:id], action_type: "flip_three" }
            # Fall through to add card to hand
          else
            # No other targets — auto-resolve on self
            @state[:discard_pile] << card
            draw_three_for(player)
            return
          end
        end

      when "freeze"
        other_active = GameLogic.active_players(@state[:players]).reject { |p| p[:id] == player[:id] }
        if other_active.any?
          @state[:pending_action_card] = { player_id: player[:id], card_id: card[:id], action_type: "freeze" }
          # Fall through to add card to hand
        else
          # No other targets — auto-freeze self
          @state[:discard_pile] << card
          handle_freeze(player, card, player[:id])
          return
        end

      when "second_chance"
        consumed = handle_second_chance(player, card, initial_deal)
        return if consumed
        # Fall through to add card to hand
      end
    end

    # Handle second chance during initial deal
    if initial_deal && card[:type] == "action" && card[:action_type] == "second_chance"
      consumed = handle_second_chance(player, card, initial_deal)
      return if consumed
    end

    # Check for bust BEFORE adding card (number cards, not initial deal)
    should_bust = false
    if card[:type] == "number" && !initial_deal
      has_duplicate = player[:number_cards].any? { |c| c[:type] == "number" && c[:value] == card[:value] }

      if has_duplicate
        has_sc = player[:has_second_chance] ||
                 player[:action_cards].any? { |c| c[:type] == "action" && c[:action_type] == "second_chance" }

        if has_sc
          # Use Second Chance to prevent bust
          sc_card = player[:action_cards].find { |c| c[:action_type] == "second_chance" }
          player[:second_chance_used_by] = {
            type: card[:type],
            value: card[:value],
            second_chance_card_id: sc_card&.dig(:id)
          }
          # Check if any unused SC cards remain
          remaining = player[:action_cards].count { |c| c[:action_type] == "second_chance" }
          player[:has_second_chance] = false if remaining <= 1

          @state[:discard_pile] << card
          return
        else
          should_bust = true
        end
      end
    end

    # Add card to hand
    player[:cards] << card
    reorganize_cards!(player)

    if should_bust
      player[:has_busted] = true
      player[:is_active] = false
    end

    # Check for Flip 7
    end_round if GameLogic.flip7?(player)
  end

  def handle_freeze(target, _card, frozen_by_id)
    score = GameLogic.calculate_score(target)
    @state[:round_scores][target[:id]] = score
    target[:is_active] = false
    target[:frozen_by] = frozen_by_id
  end

  def handle_flip_three(target, _card)
    draw_three_for(target)
  end

  def handle_second_chance(player, card, _initial_deal)
    has_existing = player[:has_second_chance] ||
                   player[:action_cards].any? { |c| c[:type] == "action" && c[:action_type] == "second_chance" }

    if has_existing
      # Already has one — give to another player who doesn't
      others = GameLogic.active_players(@state[:players]).reject do |p|
        p[:id] == player[:id] ||
        p[:has_second_chance] ||
        p[:action_cards].any? { |c| c[:action_type] == "second_chance" }
      end

      if others.any?
        recipient = others.first
        recipient[:has_second_chance] = true
        recipient[:cards] << card
        reorganize_cards!(recipient)
      else
        @state[:discard_pile] << card
      end
      true # consumed
    else
      player[:has_second_chance] = true
      false # add to hand
    end
  end

  def draw_three_for(player)
    3.times do
      break if player[:has_busted] || GameLogic.flip7?(player)

      reshuffle_if_needed!
      break if @state[:deck].empty?

      new_card = @state[:deck].pop
      deal_card_to_player(player, new_card, resolving_flip_three: true)
    end
  end

  def move_to_next_player
    active = GameLogic.active_players(@state[:players])
    if active.empty?
      end_round
      return
    end

    next_idx = (@state[:current_player_index] + 1) % @state[:players].length
    attempts = 0
    while attempts < @state[:players].length
      p = @state[:players][next_idx]
      if p[:is_active] && !p[:has_busted]
        @state[:current_player_index] = next_idx
        return
      end
      next_idx = (next_idx + 1) % @state[:players].length
      attempts += 1
    end

    end_round
  end

  def check_round_end
    active = GameLogic.active_players(@state[:players])
    end_round if active.empty?
  end

  def end_round
    return if @state[:game_status] == "round_end" || @state[:game_status] == "game_end"

    @state[:game_status] = "round_end"

    player_scores = {}
    player_busts = {}
    player_cards = {}

    @state[:players].each do |player|
      round_score = player[:has_busted] ? 0 : GameLogic.calculate_score(player)
      player[:score] += round_score
      @state[:round_scores][player[:id]] = round_score

      player_scores[player[:id]] = round_score
      player_busts[player[:id]] = player[:has_busted]
      player_cards[player[:id]] = player[:cards].map(&:dup)
    end

    # Record round history
    @state[:round_history] ||= []
    @state[:round_history] << {
      round_number: @state[:round],
      player_scores: player_scores,
      player_busts: player_busts,
      player_cards: player_cards
    }

    # Update largest round
    max_entry = player_scores.max_by { |_, v| v }
    if max_entry && max_entry[1] > 0
      current_largest = @state[:largest_round]&.dig(:score) || 0
      if max_entry[1] > current_largest
        max_player = @state[:players].find { |p| p[:id] == max_entry[0] }
        @state[:largest_round] = {
          round_number: @state[:round],
          player_id: max_player[:id],
          player_name: max_player[:name],
          score: max_entry[1],
          cards: player_cards[max_entry[0]]
        }
      end
    end

    # Discard Second Chance cards at round end
    @state[:players].each do |player|
      sc_cards = player[:action_cards].select { |c| c[:action_type] == "second_chance" }
      sc_cards.each do |sc|
        @state[:discard_pile] << sc
        player[:cards].reject! { |c| c[:id] == sc[:id] }
      end
      reorganize_cards!(player) if sc_cards.any?
      player[:has_second_chance] = false
      player[:second_chance_used_by] = nil
    end

    # Check for game end
    target = @state[:target_score] || 200
    winner = @state[:players].find { |p| p[:score] >= target }
    @state[:game_status] = "game_end" if winner
  end

  def set_first_player_after_dealer
    dealer_idx = @state[:dealer_index]
    next_idx = (dealer_idx + 1) % @state[:players].length
    attempts = 0

    while attempts < @state[:players].length
      if @state[:players][next_idx][:is_active]
        @state[:current_player_index] = next_idx
        return
      end
      next_idx = (next_idx + 1) % @state[:players].length
      attempts += 1
    end
  end

  def reshuffle_if_needed!
    return if @state[:deck].any?

    # Collect card IDs in player hands
    in_hands = Set.new
    @state[:players].each { |p| p[:cards].each { |c| in_hands << c[:id] } }

    available = @state[:discard_pile].reject { |c| in_hands.include?(c[:id]) }
    raise "No cards available to reshuffle" if available.empty?

    @state[:deck] = DeckService.shuffle(available)
    @state[:discard_pile].reject! { |c| !in_hands.include?(c[:id]) }
  end

  def reorganize_cards!(player)
    organized = GameLogic.organize_cards(player[:cards])
    player[:number_cards] = organized[:number_cards]
    player[:modifier_cards] = organized[:modifier_cards]
    player[:action_cards] = organized[:action_cards]
  end

  def find_player!(player_id)
    player = @state[:players].find { |p| p[:id] == player_id }
    raise "Player not found: #{player_id}" unless player
    player
  end

  def validate_can_act!(player)
    raise "Player not active" unless player[:is_active] && !player[:has_busted]

    if @state[:pending_action_card] && @state[:pending_action_card][:player_id] == player[:id]
      raise "Must resolve pending action card first"
    end
  end
end
