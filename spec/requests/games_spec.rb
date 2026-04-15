require "rails_helper"

RSpec.describe "Games (solo flow)", type: :request do
  include ActiveJob::TestHelper

  around do |example|
    original_adapter = ActiveJob::Base.queue_adapter
    ActiveJob::Base.queue_adapter = :test
    example.run
    ActiveJob::Base.queue_adapter = original_adapter
  end

  let(:user) { create(:user) }

  describe "GET /play/solo" do
    it "redirects unauthenticated users to sign in" do
      get "/play/solo"
      expect(response).to have_http_status(:redirect)
      expect(response).to redirect_to(new_user_session_path)
    end

    it "renders the solo form when signed in" do
      sign_in user
      get "/play/solo"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Play Solo vs Bots")
      expect(response.body).to include("Number of bots")
      # Bot strategy selects appear
      expect(response.body).to include("Conservative")
      expect(response.body).to include("Balanced")
      expect(response.body).to include("Aggressive")
    end
  end

  describe "POST /games with mode=solo" do
    it "creates a solo Game with the human seat 0 plus N bot seats and starts the round" do
      sign_in user
      expect {
        post "/games", params: {
          game: {
            mode: "solo",
            bot_count: 3,
            bot_strategies: %w[conservative balanced aggressive]
          }
        }
      }.to change(Game, :count).by(1)

      game = Game.last
      expect(game.mode).to eq("solo")
      expect(game.status).to eq("in_progress")
      expect(game.game_players.count).to eq(4)

      seats = game.game_players.order(:seat_position).to_a
      expect(seats.first.user_id).to eq(user.id)
      expect(seats.first.is_bot).to be(false)

      bot_seats = seats.drop(1)
      expect(bot_seats.size).to eq(3)
      expect(bot_seats.map(&:is_bot)).to all(be(true))
      expect(bot_seats.map(&:bot_strategy)).to eq(%w[conservative balanced aggressive])

      # GameEngine.start_round must have been called: deck dealt, round_state populated
      expect(game.current_round).to be >= 1
      expect(game.round_state["player_hands"]).to be_present
      expect(game.round_state["player_hands"].keys.size).to eq(4)

      expect(response).to redirect_to(game_path(game))
    end

    it "enqueues a BotTurnJob after creating a solo game" do
      sign_in user
      expect {
        post "/games", params: {
          game: {
            mode: "solo",
            bot_count: 2,
            bot_strategies: %w[balanced balanced]
          }
        }
      }.to have_enqueued_job(BotTurnJob)
    end

    it "creates a bot User per bot slot (lazy create)" do
      sign_in user
      expect {
        post "/games", params: {
          game: {
            mode: "solo",
            bot_count: 2,
            bot_strategies: %w[balanced aggressive]
          }
        }
      }.to change(User, :count).by(2) # 2 bot users created

      bot_emails = User.where("email LIKE ?", "bot-%@flip7.local").pluck(:email)
      expect(bot_emails.size).to be >= 2
    end
  end

  describe "GET /games/:id when in_progress (solo)" do
    it "renders the real game board with hands, scores, and Hit/Stay buttons when it's the human's turn" do
      sign_in user
      post "/games", params: {
        game: {
          mode: "solo",
          bot_count: 1,
          bot_strategies: %w[balanced]
        }
      }
      game = Game.last

      # Force human's turn for deterministic UI rendering
      ordered = game.game_players.order(:seat_position).to_a
      human_idx = ordered.index { |gp| gp.user_id == user.id }
      game.update!(current_turn_player_index: human_idx) if human_idx

      get game_path(game)
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Round")
      # Score column shown for each player
      expect(response.body).to include("Seat 0")
      expect(response.body).to include("Seat 1")
      # Hit/Stay buttons present
      expect(response.body).to include(">Hit<")
      expect(response.body).to include(">Stay<")
    end
  end
end
