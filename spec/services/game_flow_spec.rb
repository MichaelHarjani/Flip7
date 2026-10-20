require "rails_helper"

RSpec.describe GameFlow do
  def build_game(player_count: 2, bots: false)
    game = create(:game, mode: bots ? "solo" : "casual", min_players: 2, status: "in_progress")
    users = Array.new(player_count) { create(:user) }
    users.each_with_index do |u, i|
      create(:game_player, game: game, user: u, seat_position: i,
                           is_bot: bots, bot_strategy: (bots ? BotBrain::STRATEGIES[i % 3] : nil))
    end
    [game.reload, users]
  end

  def finish_round!(game, users, scores_by_user)
    rs = game.round_state
    users.each do |u|
      rs["player_hands"][u.id.to_s] = { "number_cards" => [scores_by_user[u]], "modifiers" => [], "has_second_chance" => false }
      rs["player_statuses"][u.id.to_s] = "stayed"
    end
    rs["stay_order"] = users.map(&:id)
    # The random opening deal may have paused on an action card; clear it.
    rs["deal_phase"] = false
    rs["pending_action"] = nil
    rs["deferred_actions"] = []
    game.update!(round_state: rs)
  end

  def cards_in_play(game)
    rs = game.round_state
    in_hands = rs["player_hands"].values.sum do |h|
      h["number_cards"].size + h["modifiers"].size + (h["has_second_chance"] ? 1 : 0)
    end
    # A drawn Freeze / Flip Three / surplus Second Chance is in limbo until resolved.
    # Freezes / Flip Threes revealed during a Flip Three wait in deferred_actions.
    game.deck.size + game.discard_pile.size + in_hands + (rs["pending_action"] ? 1 : 0) +
      Array(rs["deferred_actions"]).size
  end

  describe ".after_move" do
    it "does nothing while the round is still running" do
      game, _users = build_game
      GameEngine.start_round(game)
      expect(described_class.after_move(game)).to be_nil
      expect(game.reload.round_history).to eq([])
    end

    it "scores a finished round once, records history, and waits for next_round" do
      game, users = build_game
      GameEngine.start_round(game)
      finish_round!(game, users, users[0] => 9, users[1] => 4)

      expect(described_class.after_move(game)).to eq(:round_over)
      expect(described_class.after_move(game)).to be_nil # idempotent
      game.reload
      expect(game.cumulative_scores).to eq(users[0].id.to_s => 9, users[1].id.to_s => 4)
      expect(game.round_history.size).to eq(1)
      expect(game.round_history.first).to include("round" => 1, "scores" => { users[0].id.to_s => 9, users[1].id.to_s => 4 })
      expect(game.round_state["round_over"]).to be(true)
      expect(users[0].reload.highest_round_score).to eq(9)
      expect(users[0].total_rounds_played).to eq(1)
    end

    it "finishes the game when someone reaches 200" do
      game, users = build_game
      GameEngine.start_round(game)
      game.update!(cumulative_scores: { users[0].id.to_s => 195, users[1].id.to_s => 150 })
      finish_round!(game, users, users[0] => 7, users[1] => 3)

      expect(described_class.after_move(game)).to eq(:game_over)
      game.reload
      expect(game).to be_completed
      expect(game.winner_id).to eq(users[0].id)
      expect(MatchResult.where(game: game).count).to eq(2)
    end
  end

  describe ".next_round" do
    it "starts the next round only once per finished round" do
      game, users = build_game
      GameEngine.start_round(game)
      finish_round!(game, users, users[0] => 5, users[1] => 6)
      described_class.after_move(game)

      expect(described_class.next_round(game, 1)).to be(true)
      expect(game.reload.current_round).to eq(2)
      expect(described_class.next_round(game, 1)).to be(false)
      expect(game.reload.current_round).to eq(2)
    end

    it "refuses while the round is still running" do
      game, _users = build_game
      GameEngine.start_round(game)
      expect(described_class.next_round(game, 1)).to be(false)
    end
  end

  describe ".largest_round" do
    it "finds the best single-round score across the game" do
      game, users = build_game
      game.update!(round_history: [
        { "round" => 1, "scores" => { users[0].id.to_s => 12, users[1].id.to_s => 30 } },
        { "round" => 2, "scores" => { users[0].id.to_s => 41, users[1].id.to_s => 0 } }
      ])
      expect(described_class.largest_round(game)).to eq("round" => 2, "user_id" => users[0].id, "score" => 41)
    end
  end

  describe "a full all-bot game" do
    it "plays to completion without losing or duplicating a card" do
      3.times do
        game, _users = build_game(player_count: 4, bots: true)
        GameEngine.start_round(game)
        described_class.after_move(game)

        steps = 0
        until game.reload.completed?
          steps += 1
          raise "game did not finish" if steps > 5_000

          if game.round_state["round_over"]
            described_class.next_round(game, game.current_round)
          else
            BotTurnJob.new.perform(game.id)
          end
          expect(cards_in_play(game.reload)).to eq(94)
        end

        expect(game.cumulative_scores.values.max).to be >= 200
        expect(game.winner_id).to eq(GameEngine.winner_id(game))
        expect(game.round_history.size).to eq(game.current_round)
        expect(MatchResult.where(game: game).pluck(:placement)).to contain_exactly(1, 2, 3, 4)
      end
    end
  end
end
