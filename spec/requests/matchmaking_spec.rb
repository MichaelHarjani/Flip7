require "rails_helper"

RSpec.describe "Matchmaking", type: :request do
  let(:user) { create(:user, elo_rating: 1100) }

  before do
    # Stub out Redis-backed queue so tests don't depend on a live Redis.
    allow(MatchmakingQueue).to receive(:add)
    allow(MatchmakingQueue).to receive(:remove)
    allow(MatchmakingQueue).to receive(:in_queue?).and_return(false)
  end

  def play_n_casual_games(target_user, n)
    n.times do |i|
      game = Game.create!(
        mode: "casual",
        min_players: 2,
        status: "completed"
      )
      MatchResult.create!(
        game: game,
        user: target_user,
        final_score: 100 + i,
        placement: 1,
        rounds_played: 5,
        mode: "casual"
      )
    end
  end

  describe "GET /play/ranked" do
    it "redirects unauthenticated users to sign in" do
      get "/play/ranked"
      expect(response).to have_http_status(:redirect)
      expect(response).to redirect_to(new_user_session_path)
    end

    it "shows the unlock message when the user has fewer than 5 casual games" do
      sign_in user
      play_n_casual_games(user, 3)
      get "/play/ranked"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("more casual game")
      expect(response.body).to include("2") # 5 - 3 remaining
      expect(response.body).not_to include("Find Match")
    end

    it "shows the Find Match button when the user has played 5+ casual games" do
      sign_in user
      play_n_casual_games(user, 5)
      get "/play/ranked"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Find Match")
      expect(response.body).not_to include("more casual game")
    end

    it "shows the Searching state when already in queue" do
      sign_in user
      play_n_casual_games(user, 6)
      allow(MatchmakingQueue).to receive(:in_queue?).with(user.id).and_return(true)
      get "/play/ranked"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Searching")
      expect(response.body).to include("Leave Queue")
    end
  end

  describe "POST /matchmaking/queue" do
    it "redirects unauthenticated users to sign in" do
      post "/matchmaking/queue"
      expect(response).to redirect_to(new_user_session_path)
    end

    it "adds the user to the queue when unlocked" do
      sign_in user
      play_n_casual_games(user, 5)
      expect(MatchmakingQueue).to receive(:add).with(user.id, 1100)
      post "/matchmaking/queue"
      expect(response).to redirect_to(play_ranked_path)
      expect(flash[:notice]).to be_present
    end

    it "refuses to enter the queue when locked (< 5 casual games)" do
      sign_in user
      play_n_casual_games(user, 2)
      expect(MatchmakingQueue).not_to receive(:add)
      post "/matchmaking/queue"
      expect(response).to redirect_to(play_ranked_path)
      expect(flash[:alert]).to include("Play 5 casual games")
    end
  end

  describe "DELETE /matchmaking/queue" do
    it "redirects unauthenticated users to sign in" do
      delete "/matchmaking/queue"
      expect(response).to redirect_to(new_user_session_path)
    end

    it "removes the user from the queue" do
      sign_in user
      expect(MatchmakingQueue).to receive(:remove).with(user.id)
      delete "/matchmaking/queue"
      expect(response).to redirect_to(play_ranked_path)
      expect(flash[:notice]).to be_present
    end
  end
end
