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
#   - Second Chance is self-only → returns nil
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

  # Bust-probability ceilings per strategy.
  BUST_LIMITS = { "conservative" => 0.25, "balanced" => 0.35, "aggressive" => 0.55 }.freeze
  # How far behind the leader before balanced/aggressive bots push harder.
  COMEBACK_DEFICIT = 50

  # Returns :hit or :stay based on the bot's strategy and current state.
  #
  # The threshold rules decide first; three situational overrides (ported
  # from the earlier flip7 build's AiService, plus an endgame guard) then
  # adjust that call:
  #   1. Endgame: if banking this round reaches 200, stay — never risk a win.
  #   2. Flip 7 chase: one card from Flip 7 (6 unique) with a tolerable bust
  #      risk, balanced/aggressive bots go for the +15 and end the round.
  #   3. Comeback: far behind the leader, balanced/aggressive bots keep
  #      hitting a little past their usual bust ceiling.
  def decide
    hand = my_hand
    number_cards = Array(hand && (hand["number_cards"] || hand[:number_cards])) || []
    unique_count = number_cards.uniq.size
    total_value = number_cards.sum(&:to_i)
    bust_prob = GameEngine.bust_probability(hand || {}, deck_for_probability)
    limit = BUST_LIMITS.fetch(@strategy)

    round_score = GameEngine.compute_round_score(hand || {}, "active", false)
    return :stay if number_cards.any? && score_for(@player_id) + round_score >= GameEngine::WINNING_SCORE

    decision =
      case @strategy
      when "conservative"
        unique_count >= 3 && total_value >= 20 ? :stay : nil
      when "balanced"
        unique_count >= 4 && total_value >= 30 ? :stay : nil
      when "aggressive"
        unique_count >= 5 && total_value >= 45 ? :stay : nil
      end
    decision ||= bust_prob > limit ? :stay : :hit
    return decision if @strategy == "conservative" || decision == :hit

    return :hit if unique_count == GameEngine::FLIP7_UNIQUE_COUNT - 1 && bust_prob <= 0.45
    return :hit if deficit_to_leader >= COMEBACK_DEFICIT && bust_prob <= limit + 0.1

    :stay
  end

  # Returns target user_id for Freeze / Flip Three, or nil for Second Chance
  # (self-only). action_type can be a Symbol or String.
  def choose_action_target(action_type)
    type = action_type.to_s
    return nil if type == "second_chance"

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

  def deficit_to_leader
    others = cumulative_scores.reject { |id, _| id.to_s == @player_id.to_s }.values.map(&:to_i)
    return 0 if others.empty?
    others.max - score_for(@player_id).to_i
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
