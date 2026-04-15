require "rails_helper"

RSpec.describe GameEngine do
  # ────────────────────────────────────────────────────────────────
  # Helpers
  # ────────────────────────────────────────────────────────────────
  def build_game(player_count: 2, deck_count: 1, mode: "casual", min_players: 2)
    game = create(:game, mode: mode, min_players: min_players, deck_count: deck_count)
    users = Array.new(player_count) { create(:user) }
    users.each_with_index do |u, i|
      create(:game_player, game: game, user: u, seat_position: i)
    end
    game.reload
    [game, users]
  end

  def number_card(value)
    { "type" => "number", "value" => value }
  end

  def action_card(name)
    { "type" => "action", "action" => name }
  end

  def modifier_card(kind, value)
    { "type" => "modifier", "modifier" => kind, "value" => value }
  end

  # Replace the game's deck deterministically so we can script outcomes.
  # First element of `stack` is drawn first (top of deck).
  def stack_deck!(game, stack)
    game.update!(deck: stack)
  end

  # Bypass initial deal and set the round state directly for tests that
  # care about hit/stay/scoring rather than the dealing path.
  def seed_round!(game, users, hands: nil, statuses: nil, deck: [], turn_index: 0, deal_phase: false)
    hands    ||= users.each_with_object({}) { |u, h| h[u.id.to_s] = { "number_cards" => [], "modifiers" => [], "has_second_chance" => false } }
    statuses ||= users.each_with_object({}) { |u, h| h[u.id.to_s] = "active" }
    game.update!(
      deck: deck,
      round_state: {
        "player_hands"       => hands,
        "player_statuses"    => statuses,
        "player_scores"      => users.each_with_object({}) { |u, h| h[u.id.to_s] = 0 },
        "stay_order"         => [],
        "deal_phase"         => deal_phase,
        "deal_cursor"        => 0,
        "pending_action"     => nil,
        "pending_flip_three" => { "target_id" => nil, "remaining" => 0, "drawer_id" => nil },
        "flip7_winner_id"    => nil,
        "events"             => []
      },
      cumulative_scores: users.each_with_object({}) { |u, h| h[u.id.to_s] = 0 },
      current_turn_player_index: turn_index,
      turn_number: 0
    )
  end

  # ────────────────────────────────────────────────────────────────
  # Deck generation
  # ────────────────────────────────────────────────────────────────
  describe ".build_shuffled_deck" do
    it "builds a 94-card deck for deck_count=1" do
      deck = described_class.build_shuffled_deck(1)
      expect(deck.size).to eq(94)
    end

    it "builds a 188-card deck for deck_count=2 (multi-deck)" do
      deck = described_class.build_shuffled_deck(2)
      expect(deck.size).to eq(188)
    end

    it "builds a 282-card deck for deck_count=3 (21–30 players)" do
      deck = described_class.build_shuffled_deck(3)
      expect(deck.size).to eq(282)
    end

    it "contains 79 number cards per deck (pyramid distribution)" do
      deck = described_class.build_shuffled_deck(1)
      number_cards = deck.select { |c| c["type"] == "number" }
      expect(number_cards.size).to eq(79)
    end

    it "pyramid distribution: N copies of value N (N=1..12), 1 copy of 0" do
      deck = described_class.build_shuffled_deck(1)
      counts = Hash.new(0)
      deck.each { |c| counts[c["value"]] += 1 if c["type"] == "number" }
      expect(counts[0]).to eq(1)
      (1..12).each { |n| expect(counts[n]).to eq(n) }
    end

    it "contains exactly 3 of each action card per deck" do
      deck = described_class.build_shuffled_deck(1)
      actions = deck.select { |c| c["type"] == "action" }
      grouped = actions.group_by { |c| c["action"] }
      expect(grouped["freeze"].size).to eq(3)
      expect(grouped["flip_three"].size).to eq(3)
      expect(grouped["second_chance"].size).to eq(3)
    end

    it "contains exactly 6 modifier cards per deck: +2/+4/+6/+8/+10/×2" do
      deck = described_class.build_shuffled_deck(1)
      modifiers = deck.select { |c| c["type"] == "modifier" }
      expect(modifiers.size).to eq(6)
      plus_values = modifiers.select { |c| c["modifier"] == "plus" }.map { |c| c["value"] }.sort
      expect(plus_values).to eq([2, 4, 6, 8, 10])
      times_cards = modifiers.select { |c| c["modifier"] == "times" }
      expect(times_cards.size).to eq(1)
      expect(times_cards.first["value"]).to eq(2)
    end

    it "multi-deck has 2× of everything (158 number, 18 action, 12 modifier)" do
      deck = described_class.build_shuffled_deck(2)
      numbers = deck.count { |c| c["type"] == "number" }
      actions = deck.count { |c| c["type"] == "action" }
      mods    = deck.count { |c| c["type"] == "modifier" }
      expect(numbers).to eq(158)
      expect(actions).to eq(18)
      expect(mods).to eq(12)
    end

    it "shuffles (produces different orders across calls with overwhelming probability)" do
      a = described_class.build_shuffled_deck(1)
      b = described_class.build_shuffled_deck(1)
      # Chance of a == b is 1/94! which is astronomically tiny.
      expect(a).not_to eq(b)
    end

    it "defaults deck_count of nil or 0 to 1 deck" do
      expect(described_class.build_shuffled_deck(nil).size).to eq(94)
      expect(described_class.build_shuffled_deck(0).size).to eq(94)
    end
  end

  # ────────────────────────────────────────────────────────────────
  # start_round
  # ────────────────────────────────────────────────────────────────
  describe ".start_round" do
    it "builds a fresh deck and populates round_state for all players" do
      game, users = build_game(player_count: 3)
      deterministic_deck = [number_card(2), number_card(4), number_card(6)] +
        Array.new(91) { number_card(0) }
      allow(described_class).to receive(:build_shuffled_deck).and_return(deterministic_deck)
      described_class.start_round(game)
      game.reload
      expect(game.current_round).to eq(1)
      expect(game.round_state["player_hands"].keys).to match_array(users.map { |u| u.id.to_s })
      expect(game.round_state["player_statuses"].values.uniq).to contain_exactly("active")
      expect(game.round_state).to have_key("stay_order")
      expect(game.round_state["deal_phase"]).to be(false)
    end

    it "deals exactly one card to each player when the dealt cards are plain numbers" do
      game, users = build_game(player_count: 3)
      # Stub deck generation so the top 3 cards are safe numbers (no action cards).
      deterministic_deck = [number_card(2), number_card(4), number_card(6)] +
        Array.new(91) { number_card(0) }
      allow(described_class).to receive(:build_shuffled_deck).and_return(deterministic_deck)
      described_class.start_round(game)
      game.reload
      expect(game.deck.size + count_cards_in_hands(game)).to eq(94)
      users.each do |u|
        hand = game.round_state["player_hands"][u.id.to_s]
        expect(hand).to include("number_cards", "modifiers", "has_second_chance")
        expect(hand["number_cards"].size).to eq(1)
      end
    end

    it "full reshuffle: starting a second round rebuilds a 94-card deck" do
      game, users = build_game(player_count: 2)
      deterministic_deck = [number_card(2), number_card(4)] + Array.new(92) { number_card(0) }
      allow(described_class).to receive(:build_shuffled_deck).and_return(deterministic_deck)
      described_class.start_round(game)
      # Drain the deck artificially to simulate mid-round and then restart.
      game.update!(deck: [])
      described_class.start_round(game)
      game.reload
      # After reshuffle + initial deal, deck + cards in hands should equal 94 again.
      expect(game.deck.size + count_cards_in_hands(game)).to eq(94)
      expect(game.current_round).to eq(2)
    end

    it "multi-deck start_round yields 188 total cards (deck + hands)" do
      game, users = build_game(player_count: 3, deck_count: 2)
      deterministic_deck = [number_card(2), number_card(4), number_card(6)] +
        Array.new(185) { number_card(0) }
      allow(described_class).to receive(:build_shuffled_deck).and_return(deterministic_deck)
      described_class.start_round(game)
      game.reload
      expect(game.deck.size + count_cards_in_hands(game)).to eq(188)
    end

    it "sets current_turn_player_index to the first active player after deal" do
      game, users = build_game(player_count: 2)
      deterministic_deck = [number_card(2), number_card(4)] + Array.new(92) { number_card(0) }
      allow(described_class).to receive(:build_shuffled_deck).and_return(deterministic_deck)
      described_class.start_round(game)
      game.reload
      expect(game.current_turn_player_index).to eq(0)
    end

    it "pauses dealing when an action card needing targeting is dealt first" do
      game, users = build_game(player_count: 3)
      # Initialize round_state then rig the deck so first card is a Freeze.
      described_class.start_round(game)
      # Now force a fresh deal with a controlled deck.
      seed_round!(game, users, deal_phase: true)
      game.update!(
        deck: [action_card("freeze"), number_card(3), number_card(4), number_card(5)]
      )
      # Call perform_initial_deal via start_round-like path:
      described_class.send(:perform_initial_deal, game)
      game.reload
      expect(game.round_state["pending_action"]).to be_present
      expect(game.round_state["pending_action"]["type"]).to eq("freeze")
      expect(game.round_state["pending_action"]["drawer_id"]).to eq(users[0].id)
      expect(game.round_state["deal_phase"]).to be(true)
    end

    def count_cards_in_hands(game)
      total = 0
      (game.round_state["player_hands"] || {}).each_value do |hand|
        total += hand["number_cards"].size
        total += hand["modifiers"].size
        total += 1 if hand["has_second_chance"]
      end
      total
    end
  end

  # ────────────────────────────────────────────────────────────────
  # hit — happy path
  # ────────────────────────────────────────────────────────────────
  describe ".hit" do
    it "adds a unique number card to the hand and advances turn" do
      game, users = build_game(player_count: 2)
      seed_round!(game, users, deck: [number_card(7), number_card(3)])
      described_class.hit(game, users[0].id)
      game.reload
      expect(game.round_state["player_hands"][users[0].id.to_s]["number_cards"]).to eq([7])
      # Turn advances to next active player (index 1).
      expect(game.current_turn_player_index).to eq(1)
      expect(game.turn_number).to eq(1)
    end

    it "raises if it is not the player's turn" do
      game, users = build_game(player_count: 2)
      seed_round!(game, users, deck: [number_card(7)])
      expect {
        described_class.hit(game, users[1].id)
      }.to raise_error(GameEngine::InvalidTurnError)
    end

    it "busts the player when drawing a duplicate number" do
      game, users = build_game(player_count: 2)
      hands = {
        users[0].id.to_s => { "number_cards" => [7], "modifiers" => [], "has_second_chance" => false },
        users[1].id.to_s => { "number_cards" => [], "modifiers" => [], "has_second_chance" => false }
      }
      seed_round!(game, users, hands: hands, deck: [number_card(7)])
      described_class.hit(game, users[0].id)
      game.reload
      expect(game.round_state["player_statuses"][users[0].id.to_s]).to eq("busted")
    end

    it "uses Second Chance to save a would-be bust and keeps playing" do
      game, users = build_game(player_count: 2)
      hands = {
        users[0].id.to_s => { "number_cards" => [7], "modifiers" => [], "has_second_chance" => true },
        users[1].id.to_s => { "number_cards" => [], "modifiers" => [], "has_second_chance" => false }
      }
      seed_round!(game, users, hands: hands, deck: [number_card(7)])
      described_class.hit(game, users[0].id)
      game.reload
      hand = game.round_state["player_hands"][users[0].id.to_s]
      expect(hand["number_cards"]).to eq([7]) # duplicate discarded, not added
      expect(hand["has_second_chance"]).to be(false)
      expect(game.round_state["player_statuses"][users[0].id.to_s]).to eq("active")
    end

    it "adds a modifier card to the hand without busting" do
      game, users = build_game(player_count: 2)
      seed_round!(game, users, deck: [modifier_card("plus", 4)])
      described_class.hit(game, users[0].id)
      game.reload
      hand = game.round_state["player_hands"][users[0].id.to_s]
      expect(hand["modifiers"]).to eq([{ "modifier" => "plus", "value" => 4 }])
    end

    it "gains a Second Chance when drawing that action card" do
      game, users = build_game(player_count: 2)
      seed_round!(game, users, deck: [action_card("second_chance")])
      described_class.hit(game, users[0].id)
      game.reload
      expect(game.round_state["player_hands"][users[0].id.to_s]["has_second_chance"]).to be(true)
    end

    it "replacing an existing Second Chance when drawing a second one" do
      game, users = build_game(player_count: 2)
      hands = {
        users[0].id.to_s => { "number_cards" => [], "modifiers" => [], "has_second_chance" => true },
        users[1].id.to_s => { "number_cards" => [], "modifiers" => [], "has_second_chance" => false }
      }
      seed_round!(game, users, hands: hands, deck: [action_card("second_chance")])
      described_class.hit(game, users[0].id)
      game.reload
      expect(game.round_state["player_hands"][users[0].id.to_s]["has_second_chance"]).to be(true)
      events = game.round_state["events"]
      expect(events.map { |e| e["type"] }).to include("second_chance_replaced")
    end

    it "sets pending_action when drawing a Freeze, without advancing turn" do
      game, users = build_game(player_count: 2)
      seed_round!(game, users, deck: [action_card("freeze")])
      described_class.hit(game, users[0].id)
      game.reload
      expect(game.round_state["pending_action"]).to include("type" => "freeze", "drawer_id" => users[0].id)
      expect(game.current_turn_player_index).to eq(0) # turn NOT advanced
    end

    it "sets pending_action when drawing Flip Three, without advancing turn" do
      game, users = build_game(player_count: 2)
      seed_round!(game, users, deck: [action_card("flip_three")])
      described_class.hit(game, users[0].id)
      game.reload
      expect(game.round_state["pending_action"]).to include("type" => "flip_three", "drawer_id" => users[0].id)
      expect(game.current_turn_player_index).to eq(0)
    end

    it "detects Flip 7 when the drawer's 7th unique number card is drawn" do
      game, users = build_game(player_count: 2)
      hands = {
        users[0].id.to_s => { "number_cards" => [1, 2, 3, 4, 5, 6], "modifiers" => [], "has_second_chance" => false },
        users[1].id.to_s => { "number_cards" => [], "modifiers" => [], "has_second_chance" => false }
      }
      seed_round!(game, users, hands: hands, deck: [number_card(7)])
      described_class.hit(game, users[0].id)
      game.reload
      expect(game.round_state["flip7_winner_id"]).to eq(users[0].id)
      expect(game.round_state["player_statuses"][users[0].id.to_s]).to eq("stayed")
    end
  end

  # ────────────────────────────────────────────────────────────────
  # stay
  # ────────────────────────────────────────────────────────────────
  describe ".stay" do
    it "marks the player as stayed and appends them to stay_order" do
      game, users = build_game(player_count: 2)
      seed_round!(game, users, deck: [number_card(4)])
      described_class.stay(game, users[0].id)
      game.reload
      expect(game.round_state["player_statuses"][users[0].id.to_s]).to eq("stayed")
      expect(game.round_state["stay_order"]).to eq([users[0].id])
    end

    it "advances the turn to the next active player" do
      game, users = build_game(player_count: 3)
      seed_round!(game, users)
      described_class.stay(game, users[0].id)
      game.reload
      expect(game.current_turn_player_index).to eq(1)
      expect(game.turn_number).to eq(1)
    end

    it "raises if it's not the player's turn" do
      game, users = build_game(player_count: 2)
      seed_round!(game, users)
      expect {
        described_class.stay(game, users[1].id)
      }.to raise_error(GameEngine::InvalidTurnError)
    end

    it "stay_order accumulates multiple stayers in the order they acted" do
      game, users = build_game(player_count: 3)
      seed_round!(game, users)
      described_class.stay(game, users[0].id)
      described_class.stay(game, users[1].id)
      game.reload
      expect(game.round_state["stay_order"]).to eq([users[0].id, users[1].id])
    end
  end

  # ────────────────────────────────────────────────────────────────
  # resolve_action — Freeze & Flip Three
  # ────────────────────────────────────────────────────────────────
  describe ".resolve_action" do
    it "Freeze on another active player marks them stayed and advances turn" do
      game, users = build_game(player_count: 3)
      seed_round!(game, users, deck: [action_card("freeze")])
      described_class.hit(game, users[0].id)
      described_class.resolve_action(game, users[0].id, "freeze", users[1].id)
      game.reload
      expect(game.round_state["player_statuses"][users[1].id.to_s]).to eq("stayed")
      expect(game.round_state["stay_order"]).to include(users[1].id)
      # Turn advances — drawer (index 0) continues, next active is index 2 (user 1 frozen).
      expect(game.current_turn_player_index).to eq(2)
    end

    it "Freeze on self marks the drawer stayed" do
      game, users = build_game(player_count: 3)
      seed_round!(game, users, deck: [action_card("freeze")])
      described_class.hit(game, users[0].id)
      described_class.resolve_action(game, users[0].id, "freeze", users[0].id)
      game.reload
      expect(game.round_state["player_statuses"][users[0].id.to_s]).to eq("stayed")
      expect(game.current_turn_player_index).to eq(1)
    end

    it "Flip Three causes the target to draw exactly three cards" do
      game, users = build_game(player_count: 3)
      seed_round!(game, users, deck: [
        action_card("flip_three"),
        number_card(2),
        number_card(3),
        number_card(4)
      ])
      described_class.hit(game, users[0].id)
      described_class.resolve_action(game, users[0].id, "flip_three", users[1].id)
      game.reload
      hand = game.round_state["player_hands"][users[1].id.to_s]
      expect(hand["number_cards"]).to match_array([2, 3, 4])
    end

    it "Flip Three can bust the target mid-sequence" do
      game, users = build_game(player_count: 3)
      hands = {
        users[0].id.to_s => { "number_cards" => [], "modifiers" => [], "has_second_chance" => false },
        users[1].id.to_s => { "number_cards" => [5], "modifiers" => [], "has_second_chance" => false },
        users[2].id.to_s => { "number_cards" => [], "modifiers" => [], "has_second_chance" => false }
      }
      seed_round!(game, users, hands: hands, deck: [
        action_card("flip_three"),
        number_card(2),
        number_card(5), # busts
        number_card(4)
      ])
      described_class.hit(game, users[0].id)
      described_class.resolve_action(game, users[0].id, "flip_three", users[1].id)
      game.reload
      expect(game.round_state["player_statuses"][users[1].id.to_s]).to eq("busted")
    end

    it "Flip Three with Second Chance saves target from one bust" do
      game, users = build_game(player_count: 3)
      hands = {
        users[0].id.to_s => { "number_cards" => [], "modifiers" => [], "has_second_chance" => false },
        users[1].id.to_s => { "number_cards" => [5], "modifiers" => [], "has_second_chance" => true },
        users[2].id.to_s => { "number_cards" => [], "modifiers" => [], "has_second_chance" => false }
      }
      seed_round!(game, users, hands: hands, deck: [
        action_card("flip_three"),
        number_card(2),
        number_card(5), # would bust — Second Chance discards it
        number_card(4)
      ])
      described_class.hit(game, users[0].id)
      described_class.resolve_action(game, users[0].id, "flip_three", users[1].id)
      game.reload
      hand = game.round_state["player_hands"][users[1].id.to_s]
      expect(game.round_state["player_statuses"][users[1].id.to_s]).to eq("active")
      expect(hand["has_second_chance"]).to be(false)
      expect(hand["number_cards"]).to match_array([5, 2, 4])
    end

    it "raises if no pending action exists" do
      game, users = build_game(player_count: 2)
      seed_round!(game, users)
      expect {
        described_class.resolve_action(game, users[0].id, "freeze", users[1].id)
      }.to raise_error(GameEngine::InvalidActionError)
    end

    it "raises if the wrong user_id tries to resolve" do
      game, users = build_game(player_count: 3)
      seed_round!(game, users, deck: [action_card("freeze")])
      described_class.hit(game, users[0].id)
      expect {
        described_class.resolve_action(game, users[1].id, "freeze", users[2].id)
      }.to raise_error(GameEngine::InvalidActionError)
    end

    it "raises if the target is not an active player" do
      game, users = build_game(player_count: 3)
      statuses = {
        users[0].id.to_s => "active",
        users[1].id.to_s => "busted",
        users[2].id.to_s => "active"
      }
      seed_round!(game, users, statuses: statuses, deck: [action_card("freeze")])
      described_class.hit(game, users[0].id)
      expect {
        described_class.resolve_action(game, users[0].id, "freeze", users[1].id)
      }.to raise_error(GameEngine::InvalidActionError)
    end
  end

  # ────────────────────────────────────────────────────────────────
  # check_round_end
  # ────────────────────────────────────────────────────────────────
  describe ".check_round_end" do
    it "returns false while the deal phase is still running" do
      game, users = build_game(player_count: 2)
      seed_round!(game, users, deal_phase: true)
      expect(described_class.check_round_end(game)).to be(false)
    end

    it "returns false when at least one player is still active" do
      game, users = build_game(player_count: 2)
      statuses = { users[0].id.to_s => "active", users[1].id.to_s => "stayed" }
      seed_round!(game, users, statuses: statuses)
      expect(described_class.check_round_end(game)).to be(false)
    end

    it "returns true when all players have stayed or busted" do
      game, users = build_game(player_count: 2)
      statuses = { users[0].id.to_s => "stayed", users[1].id.to_s => "busted" }
      seed_round!(game, users, statuses: statuses)
      expect(described_class.check_round_end(game)).to be(true)
    end

    it "returns true when a Flip 7 has been scored" do
      game, users = build_game(player_count: 3)
      seed_round!(game, users)
      game.round_state["flip7_winner_id"] = users[0].id
      game.save!
      expect(described_class.check_round_end(game)).to be(true)
    end
  end

  # ────────────────────────────────────────────────────────────────
  # score_round
  # ────────────────────────────────────────────────────────────────
  describe ".score_round" do
    it "sums unique number cards" do
      game, users = build_game(player_count: 2)
      hands = {
        users[0].id.to_s => { "number_cards" => [3, 5, 7], "modifiers" => [], "has_second_chance" => false },
        users[1].id.to_s => { "number_cards" => [1, 2], "modifiers" => [], "has_second_chance" => false }
      }
      statuses = { users[0].id.to_s => "stayed", users[1].id.to_s => "stayed" }
      seed_round!(game, users, hands: hands, statuses: statuses)
      scores = described_class.score_round(game)
      expect(scores[users[0].id.to_s]).to eq(15)
      expect(scores[users[1].id.to_s]).to eq(3)
    end

    it "applies ×2 modifier before +N (correct order of operations)" do
      game, users = build_game(player_count: 2)
      # Numbers: 3+5+7 = 15. ×2 = 30. +4 = 34.
      hands = {
        users[0].id.to_s => {
          "number_cards" => [3, 5, 7],
          "modifiers" => [modifier_card("times", 2), modifier_card("plus", 4)],
          "has_second_chance" => false
        },
        users[1].id.to_s => { "number_cards" => [], "modifiers" => [], "has_second_chance" => false }
      }
      statuses = { users[0].id.to_s => "stayed", users[1].id.to_s => "stayed" }
      seed_round!(game, users, hands: hands, statuses: statuses)
      scores = described_class.score_round(game)
      expect(scores[users[0].id.to_s]).to eq(34)
    end

    it "+N modifiers are NOT doubled (×2 only multiplies number_sum)" do
      game, users = build_game(player_count: 2)
      # Numbers: 10. ×2 = 20. +10 = 30. If +N were doubled it would be 40.
      hands = {
        users[0].id.to_s => {
          "number_cards" => [10],
          "modifiers" => [modifier_card("times", 2), modifier_card("plus", 10)],
          "has_second_chance" => false
        },
        users[1].id.to_s => { "number_cards" => [], "modifiers" => [], "has_second_chance" => false }
      }
      statuses = { users[0].id.to_s => "stayed", users[1].id.to_s => "stayed" }
      seed_round!(game, users, hands: hands, statuses: statuses)
      scores = described_class.score_round(game)
      expect(scores[users[0].id.to_s]).to eq(30)
    end

    it "adds +15 Flip 7 bonus after all other scoring" do
      game, users = build_game(player_count: 2)
      # 1+2+3+4+5+6+7 = 28 + 15 bonus = 43
      hands = {
        users[0].id.to_s => { "number_cards" => [1, 2, 3, 4, 5, 6, 7], "modifiers" => [], "has_second_chance" => false },
        users[1].id.to_s => { "number_cards" => [], "modifiers" => [], "has_second_chance" => false }
      }
      statuses = { users[0].id.to_s => "stayed", users[1].id.to_s => "stayed" }
      seed_round!(game, users, hands: hands, statuses: statuses)
      game.round_state["flip7_winner_id"] = users[0].id
      game.save!
      scores = described_class.score_round(game)
      expect(scores[users[0].id.to_s]).to eq(43)
    end

    it "Flip 7 bonus stacks correctly with ×2 and +N modifiers" do
      # 1+2+3+4+5+6+7 = 28. ×2 = 56. +6 = 62. +15 Flip7 = 77.
      game, users = build_game(player_count: 2)
      hands = {
        users[0].id.to_s => {
          "number_cards" => [1, 2, 3, 4, 5, 6, 7],
          "modifiers" => [modifier_card("times", 2), modifier_card("plus", 6)],
          "has_second_chance" => false
        },
        users[1].id.to_s => { "number_cards" => [], "modifiers" => [], "has_second_chance" => false }
      }
      statuses = { users[0].id.to_s => "stayed", users[1].id.to_s => "stayed" }
      seed_round!(game, users, hands: hands, statuses: statuses)
      game.round_state["flip7_winner_id"] = users[0].id
      game.save!
      scores = described_class.score_round(game)
      expect(scores[users[0].id.to_s]).to eq(77)
    end

    it "busted players score 0 regardless of cards held" do
      game, users = build_game(player_count: 2)
      hands = {
        users[0].id.to_s => {
          "number_cards" => [10, 11, 12],
          "modifiers" => [modifier_card("times", 2), modifier_card("plus", 10)],
          "has_second_chance" => false
        },
        users[1].id.to_s => { "number_cards" => [], "modifiers" => [], "has_second_chance" => false }
      }
      statuses = { users[0].id.to_s => "busted", users[1].id.to_s => "stayed" }
      seed_round!(game, users, hands: hands, statuses: statuses)
      scores = described_class.score_round(game)
      expect(scores[users[0].id.to_s]).to eq(0)
    end

    it "folds round scores into cumulative_scores" do
      game, users = build_game(player_count: 2)
      hands = {
        users[0].id.to_s => { "number_cards" => [1, 2], "modifiers" => [], "has_second_chance" => false },
        users[1].id.to_s => { "number_cards" => [3], "modifiers" => [], "has_second_chance" => false }
      }
      statuses = { users[0].id.to_s => "stayed", users[1].id.to_s => "stayed" }
      seed_round!(game, users, hands: hands, statuses: statuses)
      game.update!(cumulative_scores: { users[0].id.to_s => 50, users[1].id.to_s => 40 })
      described_class.score_round(game)
      game.reload
      expect(game.cumulative_scores[users[0].id.to_s]).to eq(53)
      expect(game.cumulative_scores[users[1].id.to_s]).to eq(43)
    end
  end

  # ────────────────────────────────────────────────────────────────
  # check_game_end
  # ────────────────────────────────────────────────────────────────
  describe ".check_game_end" do
    it "returns false when nobody has 200 cumulative points" do
      game, users = build_game(player_count: 2)
      game.update!(cumulative_scores: { users[0].id.to_s => 150, users[1].id.to_s => 180 })
      expect(described_class.check_game_end(game)).to be(false)
    end

    it "returns true when a player is exactly at 200" do
      game, users = build_game(player_count: 2)
      game.update!(cumulative_scores: { users[0].id.to_s => 200, users[1].id.to_s => 100 })
      expect(described_class.check_game_end(game)).to be(true)
    end

    it "returns true when a player is over 200" do
      game, users = build_game(player_count: 2)
      game.update!(cumulative_scores: { users[0].id.to_s => 215, users[1].id.to_s => 100 })
      expect(described_class.check_game_end(game)).to be(true)
    end
  end

  # ────────────────────────────────────────────────────────────────
  # bust_probability
  # ────────────────────────────────────────────────────────────────
  describe ".bust_probability" do
    it "returns 0 when the hand has no number cards" do
      hand = { "number_cards" => [], "has_second_chance" => false }
      deck = [number_card(7), number_card(3)]
      expect(described_class.bust_probability(hand, deck)).to eq(0.0)
    end

    it "returns 0 when Second Chance is held" do
      hand = { "number_cards" => [7], "has_second_chance" => true }
      deck = [number_card(7), number_card(7)]
      expect(described_class.bust_probability(hand, deck)).to eq(0.0)
    end

    it "returns the fraction of duplicate number cards in the remaining deck" do
      hand = { "number_cards" => [5], "has_second_chance" => false }
      deck = [number_card(5), number_card(3), number_card(8), number_card(5)]
      # 2 fives out of 4 cards = 0.5
      expect(described_class.bust_probability(hand, deck)).to be_within(0.001).of(0.5)
    end

    it "counts only number-type cards toward bust risk, ignoring action/modifier" do
      hand = { "number_cards" => [7], "has_second_chance" => false }
      deck = [
        number_card(7),
        action_card("freeze"),
        modifier_card("plus", 4),
        number_card(2)
      ]
      # 1 duplicate out of 4 total = 0.25
      expect(described_class.bust_probability(hand, deck)).to be_within(0.001).of(0.25)
    end

    it "returns 0 when the remaining deck is empty" do
      hand = { "number_cards" => [7], "has_second_chance" => false }
      expect(described_class.bust_probability(hand, [])).to eq(0.0)
    end
  end

  # ────────────────────────────────────────────────────────────────
  # check_bust utility
  # ────────────────────────────────────────────────────────────────
  describe ".check_bust" do
    it "returns true when the new card duplicates a held number" do
      hand = { "number_cards" => [3, 7, 11] }
      expect(described_class.check_bust(hand, number_card(7))).to be(true)
    end

    it "returns false when the new card is a unique number" do
      hand = { "number_cards" => [3, 7, 11] }
      expect(described_class.check_bust(hand, number_card(5))).to be(false)
    end

    it "returns false for action/modifier cards" do
      hand = { "number_cards" => [3, 7] }
      expect(described_class.check_bust(hand, action_card("freeze"))).to be(false)
      expect(described_class.check_bust(hand, modifier_card("plus", 4))).to be(false)
    end
  end

  # ────────────────────────────────────────────────────────────────
  # timeout_turn
  # ────────────────────────────────────────────────────────────────
  describe ".timeout_turn" do
    it "auto-stays the current player when turn_number matches" do
      game, users = build_game(player_count: 2)
      seed_round!(game, users)
      game.update!(turn_number: 5)
      described_class.timeout_turn(game, 5)
      game.reload
      expect(game.round_state["player_statuses"][users[0].id.to_s]).to eq("stayed")
    end

    it "is a no-op if turn_number has already advanced (stale job guard)" do
      game, users = build_game(player_count: 2)
      seed_round!(game, users)
      game.update!(turn_number: 5)
      result = described_class.timeout_turn(game, 3) # stale
      expect(result[:stale]).to be(true)
      game.reload
      expect(game.round_state["player_statuses"][users[0].id.to_s]).to eq("active")
    end
  end

  # ────────────────────────────────────────────────────────────────
  # Full integration: start_round → hit → stay → score_round
  # ────────────────────────────────────────────────────────────────
  describe "full round integration" do
    it "can simulate a full round with deterministic deck manipulation" do
      game, users = build_game(player_count: 2)
      described_class.start_round(game)
      game.reload
      # Replace the remaining deck and reset hands so we can drive the round cleanly.
      seed_round!(game, users, deck: [number_card(5), number_card(8), number_card(2)])
      described_class.hit(game, users[0].id) # user 0 draws 5
      described_class.hit(game, users[1].id) # user 1 draws 8
      described_class.stay(game, users[0].id)
      described_class.stay(game, users[1].id)
      game.reload
      expect(described_class.check_round_end(game)).to be(true)
      scores = described_class.score_round(game)
      expect(scores[users[0].id.to_s]).to eq(5)
      expect(scores[users[1].id.to_s]).to eq(8)
      expect(game.cumulative_scores[users[0].id.to_s]).to eq(5)
      expect(game.cumulative_scores[users[1].id.to_s]).to eq(8)
    end
  end
end
