require "rails_helper"

RSpec.describe "Pages", type: :request do
  describe "GET /" do
    it "returns http success" do
      get root_path
      expect(response).to have_http_status(:success)
    end

    it "shows the Flip 7 title and tagline" do
      get root_path
      expect(response.body).to include("Flip 7")
      expect(response.body).to include("push-your-luck")
    end

    it "shows the three play mode CTAs" do
      get root_path
      expect(response.body).to include("Play Solo")
      expect(response.body).to include("Join Casual")
      expect(response.body).to include("Ranked Duel")
    end

    it "uses DaisyUI styling" do
      get root_path
      expect(response.body).to include("btn-primary")
    end

    context "when not signed in" do
      it "shows Sign in with Google" do
        get root_path
        expect(response.body).to include("Sign in with Google")
      end

      it "links to the Google OAuth authorize endpoint" do
        get root_path
        expect(response.body).to include("/users/auth/google_oauth2")
      end
    end

    context "when signed in" do
      let(:user) { create(:user, name: "Alice") }

      before { sign_in user }

      it "shows welcome message" do
        get root_path
        expect(response.body).to include("Welcome")
        expect(response.body).to include("Alice")
      end
    end
  end
end
