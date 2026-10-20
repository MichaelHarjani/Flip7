require "rails_helper"

RSpec.describe "Game board", type: :request do
  let(:host) { create(:user, name: "Hana Host") }
  let(:guest) { create(:user, name: "Gil Guest") }

  def number(v) = { "type" => "number", "value" => v }

  def casual_game_with(*users)
    game = create(:game, mode: "casual", min_players: 2, room_code: "QZ#{rand(10..99)}")
    users.each_with_index { |u, i| create(:game_player, game: game, user: u, seat_position: i) }
    game.reload
  end

  def start_with_deck!(game, deck)
    allow(GameEngine).to receive(:build_shuffled_deck).and_return(deck)
    game.start!
    GameEngine.start_round(game)
    game.reload
  end

  describe "lobby" do
    it "lets a signed-in visitor join from the waiting room" do
      game = casual_game_with(host)
      sign_in guest
      get game_path(game)
      expect(response.body).to include("Join game")

      patch join_game_path(game)
      expect(game.reload.game_players.pluck(:user_id)).to include(guest.id)
    end

    it "only lets the host start, and starting deals round 1" do
      game = casual_game_with(host, guest)

      sign_in guest
      post start_game_path(game)
      expect(game.reload).to be_waiting

      sign_in host
      get game_path(game)
      expect(response.body).to include("Start game")
      post start_game_path(game)
      game.reload
      expect(game).to be_in_progress
      expect(game.current_round).to eq(1)
    end
  end

  describe "playing" do
    it "shows a target picker to the player who drew a Freeze, and resolves it" do
      game = casual_game_with(host, guest)
      start_with_deck!(game, [number(3), number(5), { "type" => "action", "action" => "freeze" }] + Array.new(40) { number(12) })

      sign_in host
      post hit_game_moves_path(game)
      get game_path(game)
      expect(response.body).to include("Freeze — choose a player")
      expect(response.body).to include("Gil Guest")

      post target_game_moves_path(game), params: { action_type: "freeze", target_id: guest.id }
      game.reload
      expect(game.round_state["player_statuses"][guest.id.to_s]).to eq("stayed")
      expect(game.round_state["frozen_ids"]).to eq([guest.id])
    end

    it "shows the round summary, then next_round deals the next round" do
      game = casual_game_with(host, guest)
      start_with_deck!(game, [number(3), number(5)] + Array.new(40) { number(12) })

      sign_in host
      post stay_game_moves_path(game)
      sign_in guest
      post stay_game_moves_path(game)
      game.reload
      expect(game.round_state["round_over"]).to be(true)

      get game_path(game)
      expect(response.body).to include("Round 1 complete")
      expect(response.body).to include("Next round")

      post next_round_game_moves_path(game), params: { round: 1 }
      post next_round_game_moves_path(game), params: { round: 1 } # duplicate (timer + click)
      expect(game.reload.current_round).to eq(2)
    end

    it "shows the final standings and round-by-round table when the game ends" do
      game = casual_game_with(host, guest)
      start_with_deck!(game, [number(9), number(2)] + Array.new(40) { number(12) })
      game.update!(cumulative_scores: { host.id.to_s => 195, guest.id.to_s => 120 })

      sign_in host
      post stay_game_moves_path(game)
      sign_in guest
      post stay_game_moves_path(game)
      game.reload
      expect(game).to be_completed
      expect(game.winner_id).to eq(host.id)

      sign_in host
      get game_path(game)
      expect(response.body).to include("You win")
      expect(response.body).to include("Best round")
    end
  end
end
