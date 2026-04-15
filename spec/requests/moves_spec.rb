require "rails_helper"

RSpec.describe "Moves", type: :request do
  include ActiveJob::TestHelper

  around do |example|
    original_adapter = ActiveJob::Base.queue_adapter
    ActiveJob::Base.queue_adapter = :test
    example.run
    ActiveJob::Base.queue_adapter = original_adapter
  end

  let(:user) { create(:user) }

  def create_solo_game_for(user, bot_count: 1)
    sign_in user
    post "/games", params: {
      game: {
        mode: "solo",
        bot_count: bot_count,
        bot_strategies: Array.new(bot_count, "balanced")
      }
    }
    Game.last
  end

  def make_human_current_turn(game, user)
    ordered = game.game_players.order(:seat_position).to_a
    human_idx = ordered.index { |gp| gp.user_id == user.id }
    expect(human_idx).not_to be_nil
    # Clear any pending action so hit/stay are legal
    rs = game.round_state
    rs["pending_action"] = nil
    rs["deal_phase"] = false
    rs["player_statuses"][user.id.to_s] = "active"
    game.round_state = rs
    game.current_turn_player_index = human_idx
    game.save!
  end

  describe "POST /games/:id/moves/hit" do
    it "calls GameEngine.hit and redirects to the game when it's the human's turn" do
      game = create_solo_game_for(user, bot_count: 1)
      make_human_current_turn(game, user)

      expect(GameEngine).to receive(:hit).with(an_instance_of(Game), user.id).and_call_original
      post hit_game_moves_path(game)
      expect(response).to redirect_to(game_path(game))
    end

    it "returns 403 when it is not the user's turn" do
      game = create_solo_game_for(user, bot_count: 1)
      # Force the bot's seat to be the current turn
      bot_idx = game.game_players.order(:seat_position).pluck(:seat_position).max
      rs = game.round_state
      rs["pending_action"] = nil
      rs["deal_phase"] = false
      game.round_state = rs
      game.current_turn_player_index = bot_idx
      game.save!

      post hit_game_moves_path(game)
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "POST /games/:id/moves/stay" do
    it "calls GameEngine.stay and redirects to the game" do
      game = create_solo_game_for(user, bot_count: 1)
      make_human_current_turn(game, user)

      expect(GameEngine).to receive(:stay).with(an_instance_of(Game), user.id).and_call_original
      post stay_game_moves_path(game)
      expect(response).to redirect_to(game_path(game))
    end

    it "returns 403 when the user is not even a player in this game" do
      game = create_solo_game_for(user, bot_count: 1)
      sign_out user
      stranger = create(:user)
      sign_in stranger
      post stay_game_moves_path(game)
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "POST /games/:id/moves/hit (re-enqueues BotTurnJob)" do
    it "schedules a BotTurnJob after a successful hit" do
      game = create_solo_game_for(user, bot_count: 1)
      make_human_current_turn(game, user)

      expect {
        post hit_game_moves_path(game)
      }.to have_enqueued_job(BotTurnJob).with(game.id).at_least(:once)
    end
  end
end
