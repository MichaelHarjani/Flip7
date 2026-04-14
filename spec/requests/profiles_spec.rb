require "rails_helper"

RSpec.describe "Profiles", type: :request do
  describe "GET /profile" do
    context "when not signed in" do
      it "redirects to sign-in" do
        get "/profile"
        expect(response).to have_http_status(:redirect)
        expect(response).to redirect_to(new_user_session_path)
      end
    end

    context "when signed in" do
      let(:user) { create(:user, name: "Alice", elo_rating: 1234, games_played: 10, games_won: 6) }

      before { sign_in user }

      it "shows the current user's profile" do
        get "/profile"
        expect(response).to have_http_status(:success)
        expect(response.body).to include("Alice")
        expect(response.body).to include("1234")
        expect(response.body).to include("stats")
      end
    end
  end

  describe "GET /profile/:id" do
    let(:user) { create(:user, name: "Bob", elo_rating: 950) }

    it "shows the specified user's profile" do
      get "/profile/#{user.id}"
      expect(response).to have_http_status(:success)
      expect(response.body).to include("Bob")
      expect(response.body).to include("950")
    end

    it "redirects to root if user is not found" do
      get "/profile/99999"
      expect(response).to redirect_to(root_path)
      expect(flash[:alert]).to be_present
    end

    it "does not require sign-in" do
      get "/profile/#{user.id}"
      expect(response).to have_http_status(:success)
    end
  end
end
