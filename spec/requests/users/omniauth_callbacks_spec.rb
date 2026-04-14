require "rails_helper"

RSpec.describe "Users::OmniauthCallbacks", type: :request do
  before do
    OmniAuth.config.test_mode = true
    OmniAuth.config.mock_auth[:google_oauth2] = OmniAuth::AuthHash.new(
      provider: "google_oauth2",
      uid: "123456789",
      info: {
        email: "test@example.com",
        name: "Test User",
        image: "https://lh3.googleusercontent.com/a/test"
      }
    )
    Rails.application.env_config["devise.mapping"] = Devise.mappings[:user]
    Rails.application.env_config["omniauth.auth"] = OmniAuth.config.mock_auth[:google_oauth2]
  end

  after do
    OmniAuth.config.test_mode = false
  end

  describe "GET /users/auth/google_oauth2/callback" do
    it "creates a user and signs them in" do
      expect {
        get user_google_oauth2_omniauth_callback_path
      }.to change(User, :count).by(1)

      expect(response).to have_http_status(:redirect)
      user = User.last
      expect(user.email).to eq("test@example.com")
      expect(user.name).to eq("Test User")
      expect(user.provider).to eq("google_oauth2")
      expect(user.uid).to eq("123456789")
    end

    it "does not create a duplicate user on second login" do
      User.from_omniauth(OmniAuth.config.mock_auth[:google_oauth2])
      expect {
        get user_google_oauth2_omniauth_callback_path
      }.not_to change(User, :count)
    end
  end
end
