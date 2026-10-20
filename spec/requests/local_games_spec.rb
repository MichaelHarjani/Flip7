require "rails_helper"

RSpec.describe "Pass & play (local) games", type: :request do
  let(:owner) { create(:user, name: "Owner") }

  def number(v) = { "type" => "number", "value" => v }

  def create_local(names:, bots: 0)
    post games_path, params: { game: { mode: "local", player_names: names, bot_count: bots } }
    Game.last
  end

  before do
    allow(GameEngine).to receive(:build_shuffled_deck)
      .and_return([number(3), number(5), number(7)] + Array.new(60) { |i| number((i % 12) + 1) })
  end

  it "seats the owner plus a guest per name and starts round 1" do
    sign_in owner
    get "/play/local"
    expect(response.body).to include("Pass &amp; Play")

    game = create_local(names: ["Owner", "Ana", "", "Ben"])
    expect(game.mode).to eq("local")
    expect(game).to be_in_progress
    expect(game.game_players.order(:seat_position).pluck(:display_name)).to eq(%w[Owner Ana Ben])
    expect(game.game_players.where(is_bot: false).count).to eq(3)
    expect(game.current_round).to eq(1)
  end

  it "can mix in bots" do
    sign_in owner
    game = create_local(names: ["Owner"], bots: 2)
    expect(game.game_players.where(is_bot: true).count).to eq(2)
  end

  it "rejects a game with only one seat" do
    sign_in owner
    expect { create_local(names: ["Owner"]) }.not_to change(Game, :count)
    expect(response).to have_http_status(:unprocessable_entity)
  end

  it "lets the owner act for whichever human seat is up" do
    sign_in owner
    game = create_local(names: %w[Owner Ana])
    ana = game.game_players.find_by(display_name: "Ana")

    post stay_game_moves_path(game), params: { as_user_id: owner.id }
    game.reload
    expect(game.round_state["player_statuses"][owner.id.to_s]).to eq("stayed")

    get game_path(game)
    expect(response.body).to include("Ana&#39;s turn")

    post hit_game_moves_path(game), params: { as_user_id: ana.user_id }
    expect(game.reload.round_state["player_hands"][ana.user_id.to_s]["number_cards"].size).to eq(2)
  end

  it "ignores as_user_id outside pass-and-play games" do
    other = create(:user)
    game = create(:game, mode: "casual", min_players: 2)
    create(:game_player, game: game, user: owner, seat_position: 0)
    create(:game_player, game: game, user: other, seat_position: 1)
    game.start!
    GameEngine.start_round(game)

    sign_in owner
    post stay_game_moves_path(game), params: { as_user_id: owner.id }
    sign_in owner
    # Not owner's turn any more; trying to move as the other player must fail.
    post hit_game_moves_path(game), params: { as_user_id: other.id }
    expect(response).to have_http_status(:forbidden)
    expect(game.reload.round_state["player_hands"][other.id.to_s]["number_cards"].size).to eq(1)
  end
end
