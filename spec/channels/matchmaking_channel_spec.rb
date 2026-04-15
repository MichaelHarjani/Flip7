require "rails_helper"

RSpec.describe MatchmakingChannel, type: :channel do
  let(:user) { create(:user, elo_rating: 1234) }

  before do
    stub_connection current_user: user
    MatchmakingQueue.clear
  end

  after { MatchmakingQueue.clear }

  it "subscribes the current user and adds them to the matchmaking queue" do
    subscribe
    expect(subscription).to be_confirmed
    expect(MatchmakingQueue.in_queue?(user.id)).to be true
  end

  it "removes the user from the queue on unsubscribe" do
    subscribe
    expect(MatchmakingQueue.in_queue?(user.id)).to be true

    subscription.unsubscribe_from_channel
    expect(MatchmakingQueue.in_queue?(user.id)).to be false
  end

  it "streams personal notifications for the current user" do
    subscribe
    expect(subscription).to have_stream_for(user)
  end
end
