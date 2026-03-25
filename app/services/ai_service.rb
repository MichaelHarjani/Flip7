# Ported from server/src/ai/aiPlayer.ts
# AI decision-making for bot players

class AiService
  THRESHOLDS = {
    "conservative" => { max_bust_prob: 0.15, min_score_to_stay: 25, flip7_threshold: 5 },
    "moderate"     => { max_bust_prob: 0.25, min_score_to_stay: 30, flip7_threshold: 6 },
    "aggressive"   => { max_bust_prob: 0.35, min_score_to_stay: 40, flip7_threshold: 6 }
  }.freeze

  # Returns { action: "hit"|"stay", action_card: { card_id:, target_player_id: } | nil }
  def self.decide(player, state, difficulty = "moderate")
    # Priority: resolve pending action card
    if state[:pending_action_card] && state[:pending_action_card][:player_id] == player[:id]
      pending = state[:pending_action_card]
      target_id = select_action_target(player, state, pending[:action_type])
      return { action: "stay", action_card: { card_id: pending[:card_id], target_player_id: target_id } }
    end

    return { action: "stay" } if GameLogic.flip7?(player)
    return { action: "stay" } if player[:has_busted]

    current_score = GameLogic.calculate_score(player)
    bust_prob = calculate_bust_probability(player, state[:deck], state[:discard_pile])

    unique_numbers = player[:number_cards]
      .select { |c| c[:type] == "number" && !c[:value].nil? }
      .map { |c| c[:value] }
      .uniq
    flip7_progress = unique_numbers.size

    opponents = state[:players].reject { |p| p[:id] == player[:id] }
    max_opponent_score = opponents.map { |p| p[:score] }.max || 0
    is_behind = player[:score] < max_opponent_score

    threshold = THRESHOLDS[difficulty] || THRESHOLDS["moderate"]
    should_hit = true

    # Stay if bust probability too high
    should_hit = false if bust_prob > threshold[:max_bust_prob]

    # Stay if good score and close to Flip 7
    should_hit = false if current_score >= threshold[:min_score_to_stay] && flip7_progress >= threshold[:flip7_threshold]

    # Stay if very high score
    should_hit = false if current_score >= 50

    # Be more aggressive when behind
    if is_behind && difficulty != "conservative"
      should_hit = true if bust_prob < threshold[:max_bust_prob] + 0.1
    end

    # Go for Flip 7 if close
    expected_value = calculate_expected_value(player, state[:deck], state[:discard_pile], current_score)
    if flip7_progress >= 5 && expected_value > current_score * 0.8
      should_hit = true
    end

    { action: should_hit ? "hit" : "stay" }
  end

  private

  def self.calculate_bust_probability(player, deck, discard_pile)
    drawn_numbers = player[:number_cards]
      .select { |c| c[:type] == "number" && !c[:value].nil? }
      .map { |c| c[:value] }
      .to_set

    remaining = deck + discard_pile
    number_cards = remaining.select { |c| c[:type] == "number" && !c[:value].nil? }

    return 1.0 if number_cards.empty?

    bust_cards = number_cards.count { |c| drawn_numbers.include?(c[:value]) }
    bust_cards.to_f / number_cards.size
  end

  def self.calculate_expected_value(player, deck, discard_pile, current_score)
    bust_prob = calculate_bust_probability(player, deck, discard_pile)
    avg_card_value = 6.5
    new_score_estimate = current_score + avg_card_value
    (1 - bust_prob) * new_score_estimate
  end

  def self.select_action_target(player, state, action_type)
    active = GameLogic.active_players(state[:players])
    others = active.reject { |p| p[:id] == player[:id] }

    return player[:id] if others.empty?

    case action_type
    when "freeze"
      # Target highest scoring opponent
      best = others.max_by do |p|
        score = state[:round_scores]&.dig(p[:id]) || GameLogic.calculate_score(p)
        unique = p[:number_cards].select { |c| c[:type] == "number" }.map { |c| c[:value] }.uniq.size
        [ score, unique ]
      end
      best[:id]
    when "flip_three"
      # Always target self
      player[:id]
    else
      others.first[:id]
    end
  end
end
