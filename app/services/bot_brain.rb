# BotBrain — threshold-based decision-making for solo-mode bots.
#
# Three Phase 2 strategies (NOT optimal — that's Phase 7):
#   - conservative: stays at 3–4 unique cards or 20+ points; rarely pushes
#   - balanced:     stays at 4–5 unique cards or 30+ points; uses bust prob
#   - aggressive:   pushes for 5–6 unique cards, only stays at 45+ points
#
# Action card targeting (per docs/game_engine.md §Bot Action Card Targeting):
#   - conservative/balanced: target the leading active player
#   - aggressive: may self-target Flip Three to chase Flip 7,
#                 freezes a trailing player to prevent comeback
#   - surplus Second Chance (bot already holds one): give it to the
#     trailing eligible opponent — the least threatening beneficiary.
#     Returns nil when nobody can receive it.
#
# Duck-typed: @game only needs to respond to #round_state, #deck, and
# #cumulative_scores. This makes it cheap to test with doubles and lets
# the caller pass either a real Game record or a snapshot.
class BotBrain
  STRATEGIES = %w[conservative balanced aggressive].freeze

  class InvalidStrategyError < StandardError; end

  def initialize(strategy:, game_state:, player_id:)
    raise InvalidStrategyError, "unknown strategy: #{strategy.inspect}" unless STRATEGIES.include?(strategy.to_s)

    @strategy = strategy.to_s
    @game = game_state
    @player_id = player_id
  end

  # Returns :hit or :stay based on the bot's strategy and current state.
  def decide
    hand = my_hand
    number_cards = Array(hand && (hand["number_cards"] || hand[:number_cards])) || []
    unique_count = number_cards.uniq.size
    total_value = number_cards.sum(&:to_i)
    bust_prob = GameEngine.bust_probability(hand || {}, deck_for_probability)

    case @strategy
    when "conservative"
      return :stay if unique_count >= 3 && total_value >= 20
      return :stay if bust_prob > 0.25
    when "balanced"
      return :stay if unique_count >= 4 && total_value >= 30
      return :stay if bust_prob > 0.35
    when "aggressive"
      return :stay if unique_count >= 5 && total_value >= 45
      return :stay if bust_prob > 0.55
    end

    :hit
  end

  # Returns target user_id for Freeze / Flip Three / a surplus Second
  # Chance, or nil when no legal target exists. action_type can be a
  # Symbol or String.
  def choose_action_target(action_type)
    type = action_type.to_s
    if type == "second_chance"
      recipients = GameEngine.second_chance_recipient_ids(round_state, @player_id).map { |uid| cast_id(uid) }
      return active_trailing_id(recipients)
    end

    active = active_opponent_ids
    leader_id = active_leader_id(active)

    case @strategy
    when "conservative", "balanced"
      # Conservative & balanced both target the leader. If there are no
      # active opponents, fall back to self-target (only legal target).
      leader_id || @player_id
    when "aggressive"
      if type == "flip_three" && unique_hand_count < 5
        # Chase Flip 7: self-target Flip Three to draw three more cards.
        @player_id
      elsif type == "freeze"
        # Freeze a trailing player to prevent a comeback. Falls back to the
        # leader if there are no obvious trailing opponents (e.g., one
        # opponent), and finally to self if no opponents are active.
        trailing_id = active_trailing_id(active)
        trailing_id || leader_id || @player_id
      else
        # Aggressive Flip Three when already at 5+ unique cards: disrupt
        # the leader instead of self-targeting (drawing three more would
        # almost certainly bust).
        leader_id || @player_id
      end
    end
  end

  private

  # ── State accessors (tolerate string/symbol keys) ──────────────────

  def round_state
    @game.round_state || {}
  end

  def player_hands
    round_state["player_hands"] || round_state[:player_hands] || {}
  end

  def player_statuses
    round_state["player_statuses"] || round_state[:player_statuses] || {}
  end

  def my_hand
    player_hands[@player_id.to_s] || player_hands[@player_id]
  end

  def deck_for_probability
    @game.deck || []
  end

  def cumulative_scores
    @game.cumulative_scores || {}
  end

  def unique_hand_count
    hand = my_hand
    return 0 unless hand
    Array(hand["number_cards"] || hand[:number_cards]).uniq.size
  end

  # ── Targeting helpers ──────────────────────────────────────────────

  # All currently-active player ids EXCLUDING self, returned as integers.
  def active_opponent_ids
    player_statuses.each_with_object([]) do |(uid, status), acc|
      next unless status.to_s == "active"
      next if uid.to_s == @player_id.to_s
      acc << cast_id(uid)
    end
  end

  def active_leader_id(active)
    return nil if active.empty?
    active.max_by { |id| score_for(id) }
  end

  def active_trailing_id(active)
    return nil if active.empty?
    active.min_by { |id| score_for(id) }
  end

  def score_for(id)
    cumulative_scores[id.to_s] || cumulative_scores[id] || 0
  end

  def cast_id(uid)
    case uid
    when Integer then uid
    when String  then uid.match?(/\A-?\d+\z/) ? uid.to_i : uid
    else uid
    end
  end
end
