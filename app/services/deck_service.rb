# Ported from shared/utils/cards.ts
# Card distribution:
#   Number cards: 12×12, 11×11, 10×10, ..., 2×2, 1×1, 0×1 = 79 total
#   Modifier cards: +2×3, +4×3, +6×3, +8×3, +10×3, x2×1 = 16 total
#   Action cards: FREEZE×3, FLIP_THREE×3, SECOND_CHANCE×3 = 9 total
#   Total: 104 cards per deck

class DeckService
  MODIFIER_VALUES = [ 2, 4, 6, 8, 10 ].freeze
  ACTION_TYPES = %w[freeze flip_three second_chance].freeze

  def self.create_deck
    cards = []
    id = 0

    # Number cards: value copies equal to value (12×12, 11×11, ... 1×1), plus 1×0
    (1..12).reverse_each do |value|
      value.times do
        cards << { id: "number-#{id}", type: "number", value: value }
        id += 1
      end
    end
    cards << { id: "number-#{id}", type: "number", value: 0 }
    id += 1

    # Modifier cards: +2, +4, +6, +8, +10 (3 each)
    MODIFIER_VALUES.each do |value|
      3.times do
        cards << { id: "modifier-#{id}", type: "modifier", modifier_type: "add", modifier_value: value }
        id += 1
      end
    end

    # x2 multiplier (1 copy)
    cards << { id: "modifier-#{id}", type: "modifier", modifier_type: "multiply", modifier_value: 2 }
    id += 1

    # Action cards: freeze, flip_three, second_chance (3 each)
    ACTION_TYPES.each do |action_type|
      3.times do
        cards << { id: "action-#{id}", type: "action", action_type: action_type }
        id += 1
      end
    end

    cards
  end

  def self.create_scaled_deck(player_count)
    num_decks = [ 1, (player_count / 10.0).ceil ].max
    combined = []

    num_decks.times do |deck_num|
      create_deck.each do |card|
        combined << card.merge(id: "deck#{deck_num}-#{card[:id]}")
      end
    end

    combined
  end

  def self.shuffle(cards)
    cards.shuffle
  end
end
