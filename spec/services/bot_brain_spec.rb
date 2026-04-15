require "rails_helper"

RSpec.describe BotBrain do
  # ────────────────────────────────────────────────────────────────
  # Helpers
  # ────────────────────────────────────────────────────────────────
  def number_card(value)
    { "type" => "number", "value" => value }
  end

  # Build a fake game_state via duck-typed double. BotBrain only needs
  # round_state, deck, and cumulative_scores — making this much faster
  # than touching ActiveRecord factories.
  def fake_game(hands:, statuses:, deck: [], cumulative: {})
    instance_double(
      "Game",
      round_state: {
        "player_hands"    => hands,
        "player_statuses" => statuses
      },
      deck: deck,
      cumulative_scores: cumulative
    )
  end

  def hand(number_cards: [], second_chance: false, modifiers: [])
    {
      "number_cards"      => number_cards,
      "modifiers"         => modifiers,
      "has_second_chance" => second_chance
    }
  end

  # A "safe" deck that contains no duplicates of the held cards, so that
  # GameEngine.bust_probability returns 0 and the threshold logic is the
  # sole driver of the decision under test.
  SAFE_DECK = [
    { "type" => "action", "action" => "freeze" },
    { "type" => "action", "action" => "second_chance" },
    { "type" => "modifier", "modifier" => "plus", "value" => 4 }
  ].freeze

  # The bot under test owns id 42 unless otherwise specified.
  BOT_ID = 42

  def make(strategy, my_hand, statuses: { "42" => "active" }, deck: SAFE_DECK, cumulative: {})
    game = fake_game(
      hands: { "42" => my_hand },
      statuses: statuses,
      deck: deck,
      cumulative: cumulative
    )
    described_class.new(strategy: strategy, game_state: game, player_id: BOT_ID)
  end

  # ────────────────────────────────────────────────────────────────
  # Construction
  # ────────────────────────────────────────────────────────────────
  describe ".new" do
    it "raises on unknown strategy" do
      game = fake_game(hands: { "42" => hand }, statuses: { "42" => "active" })
      expect {
        described_class.new(strategy: "yolo", game_state: game, player_id: 42)
      }.to raise_error(BotBrain::InvalidStrategyError)
    end
  end

  # ────────────────────────────────────────────────────────────────
  # decide — empty hand
  # ────────────────────────────────────────────────────────────────
  describe "#decide with empty hand" do
    it "conservative hits with an empty hand" do
      brain = make("conservative", hand(number_cards: []))
      expect(brain.decide).to eq(:hit)
    end

    it "balanced hits with an empty hand" do
      brain = make("balanced", hand(number_cards: []))
      expect(brain.decide).to eq(:hit)
    end

    it "aggressive hits with an empty hand" do
      brain = make("aggressive", hand(number_cards: []))
      expect(brain.decide).to eq(:hit)
    end
  end

  # ────────────────────────────────────────────────────────────────
  # decide — high-value hand (4 cards, 30 points)
  # ────────────────────────────────────────────────────────────────
  describe "#decide with high-value hand (4 unique cards, 30 points)" do
    # 3 + 6 + 9 + 12 = 30 — values that don't accidentally duplicate
    # against SAFE_DECK
    let(:high_value) { hand(number_cards: [3, 6, 9, 12]) }

    it "conservative stays (>=3 unique and >=20 value)" do
      brain = make("conservative", high_value)
      expect(brain.decide).to eq(:stay)
    end

    it "balanced stays (>=4 unique and >=30 value)" do
      brain = make("balanced", high_value)
      expect(brain.decide).to eq(:stay)
    end

    it "aggressive hits (only stays at >=5 unique and >=45 value)" do
      brain = make("aggressive", high_value)
      expect(brain.decide).to eq(:hit)
    end
  end

  # ────────────────────────────────────────────────────────────────
  # decide — 6 unique number cards, low total value, "safe" deck
  # ────────────────────────────────────────────────────────────────
  describe "#decide with 6 unique number cards close to Flip 7" do
    # 0 + 1 + 2 + 3 + 4 + 5 = 15, well below all value thresholds
    let(:six_cards) { hand(number_cards: [0, 1, 2, 3, 4, 5]) }

    it "conservative hits (value 15 < 20 threshold, even with 6 unique)" do
      brain = make("conservative", six_cards)
      expect(brain.decide).to eq(:hit)
    end

    it "balanced hits (value 15 < 30 threshold)" do
      brain = make("balanced", six_cards)
      expect(brain.decide).to eq(:hit)
    end

    it "aggressive hits (value 15 < 45 threshold)" do
      brain = make("aggressive", six_cards)
      expect(brain.decide).to eq(:hit)
    end
  end

  # ────────────────────────────────────────────────────────────────
  # Strategies measurably differ on the same input
  # ────────────────────────────────────────────────────────────────
  describe "strategies measurably differ" do
    it "aggressive hits more aggressively than conservative on the same hand" do
      moderate = hand(number_cards: [3, 6, 9, 12]) # 4 unique, 30 value
      conservative = make("conservative", moderate).decide
      aggressive  = make("aggressive", moderate).decide
      expect(conservative).to eq(:stay)
      expect(aggressive).to eq(:hit)
    end

    it "balanced respects the bust probability threshold (>0.35 → stay)" do
      # 3 unique cards held; deck loaded with duplicates so bust_prob > 0.35.
      held_hand = hand(number_cards: [4, 5, 6])
      duplicate_deck = [
        number_card(4), number_card(5), number_card(6),
        number_card(4), number_card(5),
        number_card(11) # one safe card
      ]
      # 5 duplicates / 6 cards ≈ 0.83 bust prob.
      brain = make("balanced", held_hand, deck: duplicate_deck)
      expect(brain.decide).to eq(:stay)
    end

    it "second chance neutralizes bust risk so a low-value hand still hits" do
      # 1 unique held; deck full of duplicates; second chance flips bust → 0.
      held_hand = hand(number_cards: [7], second_chance: true)
      dangerous_deck = [number_card(7), number_card(7), number_card(7)]
      brain = make("conservative", held_hand, deck: dangerous_deck)
      expect(brain.decide).to eq(:hit)
    end
  end

  # ────────────────────────────────────────────────────────────────
  # Targeting
  # ────────────────────────────────────────────────────────────────
  describe "#choose_action_target" do
    let(:bot_hand) { hand(number_cards: [5]) }
    let(:opp_a_hand) { hand(number_cards: []) }
    let(:opp_b_hand) { hand(number_cards: []) }

    let(:multi_player_state) do
      instance_double(
        "Game",
        round_state: {
          "player_hands" => {
            "42"  => bot_hand,
            "100" => opp_a_hand,
            "200" => opp_b_hand
          },
          "player_statuses" => {
            "42"  => "active",
            "100" => "active",
            "200" => "active"
          }
        },
        deck: SAFE_DECK,
        # 100 is leading; 200 is trailing
        cumulative_scores: { "42" => 30, "100" => 90, "200" => 10 }
      )
    end

    it "returns nil for second_chance (self-only)" do
      brain = make("conservative", bot_hand)
      expect(brain.choose_action_target(:second_chance)).to be_nil
    end

    it "conservative freezes the leading active player" do
      brain = described_class.new(strategy: "conservative", game_state: multi_player_state, player_id: BOT_ID)
      expect(brain.choose_action_target(:freeze)).to eq(100)
    end

    it "balanced flip_threes the leading active player" do
      brain = described_class.new(strategy: "balanced", game_state: multi_player_state, player_id: BOT_ID)
      expect(brain.choose_action_target(:flip_three)).to eq(100)
    end

    it "aggressive freezes the trailing active player to prevent comeback" do
      brain = described_class.new(strategy: "aggressive", game_state: multi_player_state, player_id: BOT_ID)
      expect(brain.choose_action_target(:freeze)).to eq(200)
    end

    it "aggressive self-targets flip_three when chasing Flip 7 (fewer than 5 unique cards)" do
      brain = described_class.new(strategy: "aggressive", game_state: multi_player_state, player_id: BOT_ID)
      expect(brain.choose_action_target(:flip_three)).to eq(BOT_ID)
    end

    it "aggressive flip_threes the leader when already at 5+ unique cards" do
      five_card_hand = hand(number_cards: [1, 2, 3, 4, 5])
      state = instance_double(
        "Game",
        round_state: {
          "player_hands" => {
            "42"  => five_card_hand,
            "100" => opp_a_hand,
            "200" => opp_b_hand
          },
          "player_statuses" => {
            "42"  => "active",
            "100" => "active",
            "200" => "active"
          }
        },
        deck: SAFE_DECK,
        cumulative_scores: { "42" => 30, "100" => 90, "200" => 10 }
      )
      brain = described_class.new(strategy: "aggressive", game_state: state, player_id: BOT_ID)
      expect(brain.choose_action_target(:flip_three)).to eq(100)
    end

    it "skips inactive players when choosing a target" do
      state = instance_double(
        "Game",
        round_state: {
          "player_hands" => {
            "42"  => bot_hand,
            "100" => opp_a_hand,
            "200" => opp_b_hand
          },
          "player_statuses" => {
            "42"  => "active",
            "100" => "busted",  # leader, but inactive
            "200" => "active"
          }
        },
        deck: SAFE_DECK,
        cumulative_scores: { "42" => 30, "100" => 90, "200" => 10 }
      )
      brain = described_class.new(strategy: "conservative", game_state: state, player_id: BOT_ID)
      # Only active opponent is 200, so freeze targets 200 even though 100 is "leader" by score.
      expect(brain.choose_action_target(:freeze)).to eq(200)
    end

    it "falls back to self when there are no active opponents" do
      lone_state = instance_double(
        "Game",
        round_state: {
          "player_hands"    => { "42" => bot_hand },
          "player_statuses" => { "42" => "active" }
        },
        deck: SAFE_DECK,
        cumulative_scores: { "42" => 30 }
      )
      brain = described_class.new(strategy: "balanced", game_state: lone_state, player_id: BOT_ID)
      expect(brain.choose_action_target(:freeze)).to eq(BOT_ID)
    end
  end

  # ────────────────────────────────────────────────────────────────
  # Duck typing — works with a plain object responding to the right methods
  # ────────────────────────────────────────────────────────────────
  describe "duck typing" do
    it "works with any object that responds to round_state, deck, cumulative_scores" do
      ad_hoc = Struct.new(:round_state, :deck, :cumulative_scores).new(
        {
          "player_hands"    => { "7" => hand(number_cards: [3, 6, 9, 12]) },
          "player_statuses" => { "7" => "active" }
        },
        SAFE_DECK,
        { "7" => 0 }
      )
      brain = described_class.new(strategy: "balanced", game_state: ad_hoc, player_id: 7)
      expect(brain.decide).to eq(:stay) # 4 unique, 30 value → balanced stays
    end
  end
end
