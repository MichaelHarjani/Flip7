require "rails_helper"

RSpec.describe ApplicationCable::Connection, type: :channel do
  let(:user) { create(:user) }

  it "successfully connects with an authenticated user" do
    env = { "warden" => double(user: user) }
    connect "/cable", env: env
    expect(connection.current_user).to eq(user)
  end

  it "rejects unauthenticated connections" do
    env = { "warden" => double(user: nil) }
    expect {
      connect "/cable", env: env
    }.to have_rejected_connection
  end
end
