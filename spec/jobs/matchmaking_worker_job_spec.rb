require "rails_helper"

RSpec.describe MatchmakingWorkerJob, type: :job do
  before { MatchmakingQueue.clear }
  after  { MatchmakingQueue.clear }

  let(:user_a) { create(:user, elo_rating: 1000) }
  let(:user_b) { create(:user, elo_rating: 1020) }
  let(:user_c) { create(:user, elo_rating: 1500) }

  describe ".range_for" do
    it "returns 50 for fresh entries" do
      expect(described_class.range_for(0)).to eq(50)
      expect(described_class.range_for(9)).to eq(50)
    end

    it "returns 100 for 10s-19s waits" do
      expect(described_class.range_for(10)).to eq(100)
      expect(described_class.range_for(19)).to eq(100)
    end

    it "returns 200 for 20s-29s waits" do
      expect(described_class.range_for(20)).to eq(200)
    end

    it "returns 500 for 30s-59s waits" do
      expect(described_class.range_for(30)).to eq(500)
      expect(described_class.range_for(59)).to eq(500)
    end

    it "returns a very wide range after 60s" do
      expect(described_class.range_for(60)).to be >= 10_000
      expect(described_class.range_for(120)).to be >= 10_000
    end
  end

  describe "#perform" do
    it "is a no-op when the queue is empty" do
      expect { described_class.new.perform }.not_to change(Game, :count)
    end

    it "is a no-op when only one user is queued" do
      MatchmakingQueue.add(user_a.id, user_a.elo_rating)
      expect { described_class.new.perform }.not_to change(Game, :count)
      expect(MatchmakingQueue.in_queue?(user_a.id)).to be true
    end

    it "matches two users within ±50 Elo within 10s" do
      MatchmakingQueue.add(user_a.id, user_a.elo_rating)
      MatchmakingQueue.add(user_b.id, user_b.elo_rating)

      expect { described_class.new.perform }.to change(Game, :count).by(1)

      game = Game.last
      expect(game.mode).to eq("ranked")
      expect(game.status).to eq("waiting")
      expect(game.game_players.pluck(:user_id)).to contain_exactly(user_a.id, user_b.id)
    end

    it "does NOT match two users 400 Elo apart while both are within their initial ±50 window" do
      MatchmakingQueue.add(user_a.id, user_a.elo_rating)   # 1000
      MatchmakingQueue.add(user_c.id, user_c.elo_rating)   # 1500

      expect { described_class.new.perform }.not_to change(Game, :count)
      expect(MatchmakingQueue.in_queue?(user_a.id)).to be true
      expect(MatchmakingQueue.in_queue?(user_c.id)).to be true
    end

    it "matches users 400 Elo apart once one of them has waited 30+s (range = ±500)" do
      MatchmakingQueue.add(user_a.id, user_a.elo_rating)   # 1000
      MatchmakingQueue.add(user_c.id, user_c.elo_rating)   # 1500

      # Pretend user_a has been waiting 35s.
      MatchmakingQueue.set_entered_at(user_a.id, Time.current.to_i - 35)

      expect { described_class.new.perform }.to change(Game, :count).by(1)

      expect(MatchmakingQueue.in_queue?(user_a.id)).to be false
      expect(MatchmakingQueue.in_queue?(user_c.id)).to be false
    end

    it "removes both matched users from the queue and creates two game_players" do
      MatchmakingQueue.add(user_a.id, user_a.elo_rating)
      MatchmakingQueue.add(user_b.id, user_b.elo_rating)

      described_class.new.perform

      expect(MatchmakingQueue.in_queue?(user_a.id)).to be false
      expect(MatchmakingQueue.in_queue?(user_b.id)).to be false

      game = Game.last
      seats = game.game_players.order(:seat_position).pluck(:seat_position)
      expect(seats).to eq([0, 1])
    end

    it "broadcasts a match_found notification to both users" do
      MatchmakingQueue.add(user_a.id, user_a.elo_rating)
      MatchmakingQueue.add(user_b.id, user_b.elo_rating)

      received = []
      allow(MatchmakingChannel).to receive(:broadcast_to) do |user, payload|
        received << [user.id, payload]
      end

      described_class.new.perform

      expect(received.size).to eq(2)
      ids = received.map(&:first)
      expect(ids).to contain_exactly(user_a.id, user_b.id)
      received.each do |_id, payload|
        expect(payload[:type]).to eq("match_found")
        expect(payload[:game_id]).to eq(Game.last.id)
      end
    end
  end
end
