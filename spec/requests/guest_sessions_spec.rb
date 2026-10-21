require "rails_helper"

RSpec.describe "Guest play", type: :request do
  it "signs a visitor in as a fresh guest who can start a solo game" do
    get root_path
    expect(response.body).to include("Play as guest")

    expect { post guest_session_path }.to change(User, :count).by(1)
    expect(response).to redirect_to(root_path)

    get "/play/solo"
    expect(response).to have_http_status(:ok)
  end

  it "keeps a signed-in user as they are" do
    user = create(:user)
    sign_in user
    expect { post guest_session_path }.not_to change(User, :count)
  end
end
