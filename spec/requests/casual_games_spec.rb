require "rails_helper"

RSpec.describe "Casual Games", type: :request do
  include ActiveJob::TestHelper

  around do |example|
    original_adapter = ActiveJob::Base.queue_adapter
    ActiveJob::Base.queue_adapter = :test
    example.run
    ActiveJob::Base.queue_adapter = original_adapter
  end

  let(:user) { create(:user) }

  describe "GET /play/casual" do
    it "redirects unauthenticated users to sign in" do
      get "/play/casual"
      expect(response).to have_http_status(:redirect)
      expect(response).to redirect_to(new_user_session_path)
    end

    it "renders the new-game form when signed in" do
      sign_in user
      get "/play/casual"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Create")
    end
  end

  describe "POST /games with mode=casual" do
    it "creates a waiting game with a room code and seats the creator" do
      sign_in user
      expect {
        post "/games", params: {
          game: { mode: "casual", min_players: 2, max_players: 6 }
        }
      }.to change(Game, :count).by(1)

      game = Game.last
      expect(game.mode).to eq("casual")
      expect(game.status).to eq("waiting")
      expect(game.room_code).to be_present
      expect(game.room_code.length).to eq(4)
      expect(game.game_players.count).to eq(1)
      expect(game.game_players.first.user_id).to eq(user.id)
      expect(game.game_players.first.seat_position).to eq(0)
      expect(response).to redirect_to(game_path(game))
    end

    it "enqueues a RoomExpiryJob for the new casual game" do
      sign_in user
      expect {
        post "/games", params: {
          game: { mode: "casual", min_players: 2, max_players: 6 }
        }
      }.to have_enqueued_job(RoomExpiryJob)
    end
  end

  describe "GET /join/:code" do
    it "redirects to the game when the code matches a waiting game" do
      sign_in user
      game = Game.create!(
        mode: "casual",
        min_players: 2,
        status: "waiting",
        room_code: "ABCD"
      )
      game.game_players.create!(user: create(:user), seat_position: 0)

      get "/join/ABCD"
      expect(response).to redirect_to(game_path(game))
    end

    it "redirects back to the join form with an alert for an unknown code" do
      sign_in user
      get "/join/ZZZZ"
      expect(response).to redirect_to(join_path)
      expect(flash[:alert]).to include("ZZZZ")
    end
  end

  describe "PATCH /games/:id/join" do
    let(:host) { create(:user) }
    let!(:game) do
      g = Game.create!(
        mode: "casual",
        min_players: 2,
        max_players: 4,
        status: "waiting",
        room_code: "EFGH"
      )
      g.game_players.create!(user: host, seat_position: 0)
      g
    end

    it "prevents duplicate joins when the user is already seated" do
      sign_in host
      expect {
        patch "/games/#{game.id}/join"
      }.not_to change(GamePlayer, :count)
      expect(response).to redirect_to(game_path(game))
    end

    it "seats a new user at the next free seat" do
      sign_in user
      expect {
        patch "/games/#{game.id}/join"
      }.to change { game.game_players.count }.by(1)
      new_gp = game.game_players.order(:seat_position).last
      expect(new_gp.user_id).to eq(user.id)
      expect(new_gp.seat_position).to eq(1)
    end
  end

  describe "RoomExpiryJob behavior for an empty waiting room" do
    it "expires a waiting game with only the host seated" do
      host = create(:user)
      game = Game.create!(
        mode: "casual",
        min_players: 2,
        status: "waiting",
        room_code: "JKLM"
      )
      game.game_players.create!(user: host, seat_position: 0)

      RoomExpiryJob.new.perform(game.id)
      expect(game.reload.status).to eq("expired")
    end
  end
end
