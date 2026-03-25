# Ported from shared/utils/gameLogic.ts
# Pure functions for game rule calculations

module GameLogic
  # Check if drawing new_card would cause a bust (duplicate number)
  # Cannot bust on: action cards, modifier cards, or initial deal
  def self.bust?(player, new_card)
    return false unless new_card[:type] == "number"

    existing_numbers = player[:number_cards]
      .select { |c| c[:type] == "number" }
      .map { |c| c[:value] }

    existing_numbers.include?(new_card[:value])
  end

  # Check if player has 7 unique number cards (Flip 7)
  def self.flip7?(player)
    unique_numbers = player[:number_cards]
      .select { |c| c[:type] == "number" && !c[:value].nil? }
      .map { |c| c[:value] }
      .uniq

    unique_numbers.size >= 7
  end

  # Calculate player's round score
  # 1. Sum number card values
  # 2. Apply x2 multiplier if present
  # 3. Add modifier bonuses (+2, +4, +6, +8, +10)
  # 4. Add Flip 7 bonus (+15) if applicable
  def self.calculate_score(player)
    # Step 1: Sum number cards
    score = player[:number_cards]
      .select { |c| c[:type] == "number" && !c[:value].nil? }
      .sum { |c| c[:value] }

    # Step 2: x2 multiplier
    has_x2 = player[:modifier_cards].any? { |c| c[:modifier_type] == "multiply" && c[:modifier_value] == 2 }
    score *= 2 if has_x2

    # Step 3: Add modifiers
    player[:modifier_cards]
      .select { |c| c[:modifier_type] == "add" && c[:modifier_value] }
      .each { |c| score += c[:modifier_value] }

    # Step 4: Flip 7 bonus
    score += 15 if flip7?(player)

    score
  end

  # Organize cards into separate arrays by type
  def self.organize_cards(cards)
    {
      number_cards: cards.select { |c| c[:type] == "number" },
      modifier_cards: cards.select { |c| c[:type] == "modifier" },
      action_cards: cards.select { |c| c[:type] == "action" }
    }
  end

  # Get players who are still active (not busted, not stayed/frozen)
  def self.active_players(players)
    players.select { |p| p[:is_active] && !p[:has_busted] }
  end
end
