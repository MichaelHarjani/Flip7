# GameEngine — pure-function service that owns all Flip7 game logic.
#
# Takes a Game and a player action, validates it, updates state via the
# jsonb columns (deck, round_state, cumulative_scores), and returns a hash
# of events plus the mutated game. Does NOT broadcast, enqueue jobs, or
# make controller-level decisions — those concerns live elsewhere.
#
# Game rules are sourced from app_spec.txt §1. Authoritative.
class GameEngine
  # ────────────────────────────────────────────────────────────────
  # Errors
  # ────────────────────────────────────────────────────────────────
  class Error < StandardError; end
  class InvalidTurnError < Error; end
  class InvalidActionError < Error; end

  WINNING_SCORE = 200
  FLIP7_BONUS   = 15
  FLIP7_UNIQUE_COUNT = 7
  MAX_NUMBER_VALUE = 12

  # ────────────────────────────────────────────────────────────────
  # Public API
  # ────────────────────────────────────────────────────────────────

  # Start a new round: build fresh deck(s) based on player count, shuffle,
  # deal initial cards one per seat, and set the turn to the first active
  # player. Action cards dealt during the initial deal resolve immediately;
  # if one requires targeting (Freeze / Flip Three), dealing pauses and a
  # pending_action is recorded for the caller to resolve via resolve_action.
  def self.start_round(game)
    players = ordered_player_ids(game)
    raise InvalidActionError, "no seated players" if players.empty?

    deck = build_shuffled_deck(game.deck_count || 1)

    round_state = {
      "player_hands"        => players.each_with_object({}) { |pid, h| h[pid.to_s] = empty_hand },
      "player_statuses"     => players.each_with_object({}) { |pid, h| h[pid.to_s] = "active" },
      "player_scores"       => players.each_with_object({}) { |pid, h| h[pid.to_s] = 0 },
      "stay_order"          => [],
      "deal_phase"          => true,
      "deal_cursor"         => 0,
      "pending_action"      => nil,
      "pending_flip_three"  => { "target_id" => nil, "remaining" => 0, "drawer_id" => nil },
      "flip7_winner_id"     => nil,
      "events"              => []
    }

    # Bootstrap cumulative_scores keys for any newly-joined players.
    cumulative = game.cumulative_scores || {}
    players.each { |pid| cumulative[pid.to_s] ||= 0 }

    game.deck = deck
    game.round_state = round_state
    game.cumulative_scores = cumulative
    game.current_round = (game.current_round || 0) + 1
    game.current_turn_player_index = 0
    game.save!

    # Run the initial deal — one card per seat, resolving action cards as
    # they come up. If targeting is required, dealing pauses.
    perform_initial_deal(game)
    { events: game.round_state["events"], game: game }
  end

  # Player chooses to Hit. Validates turn ownership, draws top card, and
  # resolves by type. Number cards may bust (consuming a Second Chance if
  # available). Action cards that need targeting set pending_action and
  # return control to the caller without advancing the turn.
  def self.hit(game, user_id)
    validate_turn(game, user_id)
    round_state = game.round_state
    clear_events(round_state)

    raise InvalidActionError, "pending action must be resolved first" if round_state["pending_action"]
    raise InvalidActionError, "deal phase not complete" if round_state["deal_phase"]

    card = draw_top_card(game)
    raise InvalidActionError, "deck is empty" if card.nil?

    push_event(round_state, { "type" => "card_drawn", "user_id" => user_id, "card" => card })

    busted, advance = resolve_drawn_card_for(game, user_id, card)

    if advance && !round_state["pending_action"]
      after_action_advance(game, user_id, busted_out: busted)
    end

    game.round_state = round_state
    game.save!
    { events: round_state["events"], game: game }
  end

  # Player chooses to Stay. Appends to stay_order, marks stayed, advances turn.
  def self.stay(game, user_id)
    validate_turn(game, user_id)
    round_state = game.round_state
    clear_events(round_state)

    raise InvalidActionError, "pending action must be resolved first" if round_state["pending_action"]
    raise InvalidActionError, "deal phase not complete" if round_state["deal_phase"]

    mark_stayed(round_state, user_id)
    push_event(round_state, { "type" => "stayed", "user_id" => user_id })

    after_action_advance(game, user_id, busted_out: false)
    game.round_state = round_state
    game.save!
    { events: round_state["events"], game: game }
  end

  # Resolve an action card that requires targeting. Called after hit (or
  # start_round) drew a Freeze / Flip Three and set pending_action.
  # action_type: "freeze" | "flip_three"
  def self.resolve_action(game, user_id, action_type, target_id)
    round_state = game.round_state
    clear_events(round_state)

    pending = round_state["pending_action"]
    raise InvalidActionError, "no pending action" if pending.nil?
    raise InvalidActionError, "wrong drawer" unless pending["drawer_id"].to_s == user_id.to_s
    raise InvalidActionError, "wrong action type" unless pending["type"] == action_type

    target_status = round_state["player_statuses"][target_id.to_s]
    raise InvalidActionError, "target must be an active player" unless target_status == "active"

    drawer_was_dealing = round_state["deal_phase"]
    round_state["pending_action"] = nil

    case action_type
    when "freeze"
      mark_stayed(round_state, target_id)
      push_event(round_state, { "type" => "freeze_applied", "drawer_id" => user_id, "target_id" => target_id })
    when "flip_three"
      apply_flip_three(game, user_id, target_id)
    else
      raise InvalidActionError, "unknown action: #{action_type}"
    end

    # Advance turn logic, unless we are still mid-deal or a new pending_action fired.
    if !drawer_was_dealing && round_state["pending_action"].nil? && round_state["pending_flip_three"]["remaining"] == 0
      after_action_advance(game, user_id, busted_out: false)
    end

    game.round_state = round_state
    game.save!

    # Continue initial deal if we were in one and nothing else is pending.
    if drawer_was_dealing && round_state["pending_action"].nil? && round_state["pending_flip_three"]["remaining"] == 0
      perform_initial_deal(game)
    end

    { events: round_state["events"], game: game }
  end

  # Is the round over? All players stayed/busted, or a player has Flip 7.
  def self.check_round_end(game)
    rs = game.round_state || {}
    return false if rs["deal_phase"]
    return true if rs["flip7_winner_id"]
    statuses = (rs["player_statuses"] || {}).values
    return false if statuses.empty?
    statuses.all? { |s| s == "stayed" || s == "busted" }
  end

  # Score the completed round for every player per §1.4 rules and fold
  # each player's round score into cumulative_scores. Returns a hash:
  # { user_id => round_score }.
  def self.score_round(game)
    rs = game.round_state || {}
    hands = rs["player_hands"] || {}
    statuses = rs["player_statuses"] || {}
    cumulative = game.cumulative_scores || {}

    per_round = {}
    flip7_winner = rs["flip7_winner_id"]
    hands.each do |user_id, hand|
      is_flip7 = !flip7_winner.nil? && flip7_winner.to_s == user_id.to_s
      per_round[user_id] = compute_round_score(hand, statuses[user_id], is_flip7)
    end

    rs["player_scores"] = per_round
    per_round.each do |user_id, score|
      cumulative[user_id] = (cumulative[user_id] || 0) + score
    end

    game.round_state = rs
    game.cumulative_scores = cumulative
    game.save!
    per_round
  end

  # Is the game over? Any player reached 200+ cumulative.
  def self.check_game_end(game)
    (game.cumulative_scores || {}).values.any? { |v| v.to_i >= WINNING_SCORE }
  end

  # Auto-stay on turn timeout. Guards on turn_number matching so stale jobs
  # that fire after the turn has already advanced are no-ops.
  def self.timeout_turn(game, turn_number)
    return { events: [], game: game, stale: true } if game.turn_number.to_i != turn_number.to_i

    current_user_id = current_turn_user_id(game)
    return { events: [], game: game, stale: true } if current_user_id.nil?

    stay(game, current_user_id)
  end

  # ────────────────────────────────────────────────────────────────
  # Public utility (used by BotBrain too)
  # ────────────────────────────────────────────────────────────────

  # Expected bust probability: chance the next drawn card is a duplicate
  # number card. Pure — takes a hand hash and the remaining deck array.
  def self.bust_probability(hand, remaining_deck)
    return 0.0 if remaining_deck.nil? || remaining_deck.empty?

    number_cards = Array(hand["number_cards"] || hand[:number_cards])
    has_second_chance = hand["has_second_chance"] || hand[:has_second_chance]

    # Second Chance negates the first duplicate draw entirely.
    return 0.0 if has_second_chance

    held = number_cards.to_set
    duplicates = remaining_deck.count do |card|
      card_type(card) == "number" && held.include?(card_value(card))
    end
    duplicates.to_f / remaining_deck.size
  end

  # ────────────────────────────────────────────────────────────────
  # Private helpers
  # ────────────────────────────────────────────────────────────────

  def self.build_shuffled_deck(deck_count)
    deck_count = 1 if deck_count.nil? || deck_count < 1
    cards = []
    deck_count.times do
      cards.concat(single_deck_cards)
    end
    cards.shuffle
  end

  def self.single_deck_cards
    cards = []
    # Number cards: pyramid. N copies of value N for N in 0..12.
    # N=0 → 1 copy of "0" (special case per spec).
    cards << { "type" => "number", "value" => 0 }
    (1..MAX_NUMBER_VALUE).each do |n|
      n.times { cards << { "type" => "number", "value" => n } }
    end
    # Action cards: 3 of each
    3.times { cards << { "type" => "action", "action" => "freeze" } }
    3.times { cards << { "type" => "action", "action" => "flip_three" } }
    3.times { cards << { "type" => "action", "action" => "second_chance" } }
    # Modifier cards
    [2, 4, 6, 8, 10].each do |v|
      cards << { "type" => "modifier", "modifier" => "plus", "value" => v }
    end
    cards << { "type" => "modifier", "modifier" => "times", "value" => 2 }
    cards
  end

  def self.ordered_player_ids(game)
    game.game_players
      .order(:seat_position)
      .pluck(:user_id)
      .map(&:to_i)
  end

  def self.empty_hand
    {
      "number_cards"      => [],
      "modifiers"         => [],
      "has_second_chance" => false
    }
  end

  def self.clear_events(round_state)
    round_state["events"] = []
  end

  def self.push_event(round_state, event)
    round_state["events"] ||= []
    round_state["events"] << event
  end

  def self.draw_top_card(game)
    deck = game.deck || []
    return nil if deck.empty?
    card = deck.shift
    game.deck = deck
    card
  end

  def self.current_turn_user_id(game)
    players = ordered_player_ids(game)
    idx = game.current_turn_player_index
    return nil if idx.nil? || players.empty?
    players[idx % players.size]
  end

  def self.validate_turn(game, user_id)
    cur = current_turn_user_id(game)
    raise InvalidTurnError, "no current turn" if cur.nil?
    raise InvalidTurnError, "not your turn" unless cur.to_s == user_id.to_s
    status = (game.round_state["player_statuses"] || {})[user_id.to_s]
    raise InvalidTurnError, "player not active" unless status == "active"
  end

  # ── Initial deal ────────────────────────────────────────────────

  def self.perform_initial_deal(game)
    players = ordered_player_ids(game)
    rs = game.round_state

    while rs["deal_phase"]
      cursor = rs["deal_cursor"].to_i
      if cursor >= players.size
        rs["deal_phase"] = false
        rs["deal_cursor"] = 0
        game.round_state = rs
        game.save!
        return
      end

      target_user_id = players[cursor]
      card = draw_top_card(game)
      break if card.nil? # defensively stop if deck is somehow empty

      push_event(rs, { "type" => "initial_deal", "user_id" => target_user_id, "card" => card })
      _busted, _advance = resolve_drawn_card_for(game, target_user_id, card, initial_deal: true)

      # If a freeze / flip_three during initial deal raised a pending_action,
      # pause dealing until the caller resolves it.
      if rs["pending_action"]
        game.round_state = rs
        game.save!
        return
      end

      rs["deal_cursor"] = cursor + 1
    end

    rs["deal_phase"] = false
    rs["deal_cursor"] = 0
    # Place turn with the first active player after deal completes.
    first_active_idx = first_active_index(game)
    game.current_turn_player_index = first_active_idx || 0
    game.round_state = rs
    game.save!
  end

  # ── Card resolution ────────────────────────────────────────────

  # Resolves a freshly drawn card for a given user. Returns [busted, should_advance_turn].
  # In initial_deal mode, turn advancement is handled by the deal loop instead.
  def self.resolve_drawn_card_for(game, user_id, card, initial_deal: false)
    rs = game.round_state
    uid = user_id.to_s
    hand = rs["player_hands"][uid]

    case card_type(card)
    when "number"
      value = card_value(card)
      if hand["number_cards"].include?(value)
        # duplicate → bust unless Second Chance
        if hand["has_second_chance"]
          hand["has_second_chance"] = false
          push_event(rs, { "type" => "second_chance_used", "user_id" => user_id, "value" => value })
          # Duplicate card is discarded (not added to hand).
          return [false, !initial_deal]
        else
          rs["player_statuses"][uid] = "busted"
          push_event(rs, { "type" => "busted", "user_id" => user_id, "value" => value })
          return [true, !initial_deal]
        end
      else
        hand["number_cards"] << value
        # Flip 7 check: 7 unique number cards.
        if hand["number_cards"].uniq.size >= FLIP7_UNIQUE_COUNT
          rs["flip7_winner_id"] = user_id
          mark_stayed(rs, user_id)
          push_event(rs, { "type" => "flip7", "user_id" => user_id })
        end
        return [false, !initial_deal]
      end

    when "modifier"
      hand["modifiers"] << { "modifier" => card["modifier"], "value" => card["value"] }
      push_event(rs, { "type" => "modifier_added", "user_id" => user_id, "card" => card })
      return [false, !initial_deal]

    when "action"
      case card["action"]
      when "second_chance"
        if hand["has_second_chance"]
          push_event(rs, { "type" => "second_chance_replaced", "user_id" => user_id })
        end
        hand["has_second_chance"] = true
        push_event(rs, { "type" => "second_chance_gained", "user_id" => user_id })
        return [false, !initial_deal]
      when "freeze", "flip_three"
        rs["pending_action"] = { "type" => card["action"], "drawer_id" => user_id }
        push_event(rs, { "type" => "action_pending", "drawer_id" => user_id, "action" => card["action"] })
        # Don't advance turn — caller must call resolve_action first.
        return [false, false]
      else
        raise InvalidActionError, "unknown action card: #{card["action"]}"
      end
    else
      raise InvalidActionError, "unknown card type: #{card_type(card)}"
    end
  end

  # Apply a Flip Three: target draws three consecutive cards. Each can
  # trigger a bust (negated by Second Chance). If one of those three cards
  # is itself an action card requiring a target, we raise a new
  # pending_action; the remaining count is tracked so subsequent
  # resolve_action calls continue the sequence.
  def self.apply_flip_three(game, drawer_id, target_id)
    rs = game.round_state
    rs["pending_flip_three"] = { "target_id" => target_id, "remaining" => 3, "drawer_id" => drawer_id }
    push_event(rs, { "type" => "flip_three_start", "drawer_id" => drawer_id, "target_id" => target_id })

    draw_flip_three_cards(game)
  end

  def self.draw_flip_three_cards(game)
    rs = game.round_state
    pending = rs["pending_flip_three"]
    target_id = pending["target_id"]

    while pending["remaining"].to_i > 0
      # If the target is no longer active (e.g., busted mid-sequence), stop.
      if rs["player_statuses"][target_id.to_s] != "active"
        pending["remaining"] = 0
        push_event(rs, { "type" => "flip_three_halted", "target_id" => target_id })
        break
      end

      card = draw_top_card(game)
      break if card.nil?

      push_event(rs, { "type" => "flip_three_draw", "target_id" => target_id, "card" => card })
      _busted, _advance = resolve_drawn_card_for(game, target_id, card, initial_deal: false)
      pending["remaining"] = pending["remaining"].to_i - 1

      # If drawing triggered a new pending_action (freeze/flip_three drawn again),
      # pause here — the caller will resolve_action and we'll resume.
      if rs["pending_action"]
        break
      end
    end

    if pending["remaining"].to_i == 0 && rs["pending_action"].nil?
      push_event(rs, { "type" => "flip_three_end", "target_id" => target_id })
      rs["pending_flip_three"] = { "target_id" => nil, "remaining" => 0, "drawer_id" => nil }
    end
  end

  # ── Turn advancement ───────────────────────────────────────────

  def self.after_action_advance(game, _user_id, busted_out:)
    rs = game.round_state
    # If the round is over, don't advance.
    return if check_round_end(game)

    next_idx = next_active_index(game)
    if next_idx.nil?
      # Nobody left → round ends (check_round_end should already be true).
      return
    end
    game.current_turn_player_index = next_idx
    game.turn_number = (game.turn_number || 0) + 1
  end

  def self.first_active_index(game)
    players = ordered_player_ids(game)
    rs = game.round_state
    players.each_with_index do |pid, idx|
      return idx if rs["player_statuses"][pid.to_s] == "active"
    end
    nil
  end

  def self.next_active_index(game)
    players = ordered_player_ids(game)
    return nil if players.empty?
    rs = game.round_state
    current = game.current_turn_player_index.to_i
    players.size.times do |i|
      idx = (current + 1 + i) % players.size
      pid = players[idx]
      return idx if rs["player_statuses"][pid.to_s] == "active"
    end
    nil
  end

  def self.mark_stayed(round_state, user_id)
    uid = user_id.to_s
    return if round_state["player_statuses"][uid] == "stayed"
    round_state["player_statuses"][uid] = "stayed"
    round_state["stay_order"] ||= []
    round_state["stay_order"] << user_id unless round_state["stay_order"].include?(user_id)
  end

  # ── Scoring ────────────────────────────────────────────────────

  def self.compute_round_score(hand, status, is_flip7_winner)
    return 0 if status == "busted"

    number_cards = Array(hand["number_cards"])
    modifiers    = Array(hand["modifiers"])

    number_sum = number_cards.sum(&:to_i)
    if modifiers.any? { |m| m["modifier"] == "times" }
      number_sum *= 2
    end
    plus_sum = modifiers.select { |m| m["modifier"] == "plus" }.sum { |m| m["value"].to_i }

    score = number_sum + plus_sum
    score += FLIP7_BONUS if is_flip7_winner
    score
  end

  # ── Card accessors (tolerate symbol or string keys) ────────────

  def self.card_type(card)
    card["type"] || card[:type]
  end

  def self.card_value(card)
    card["value"] || card[:value]
  end

  # ── Bust check (public-ish for tests) ──────────────────────────

  # Returns true if adding `new_card` to `hand` would cause a bust.
  # (Does not consider Second Chance — that's handled at resolve time.)
  def self.check_bust(hand, new_card)
    return false unless card_type(new_card) == "number"
    Array(hand["number_cards"]).include?(card_value(new_card))
  end

  require "set"
end
