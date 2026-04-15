require "rails_helper"

RSpec.describe MatchmakingQueue do
  before { described_class.clear }
  after  { described_class.clear }

  describe ".add and .in_queue?" do
    it "adds a user to the queue" do
      described_class.add(1, 1000)
      expect(described_class.in_queue?(1)).to be true
    end

    it "returns false for users that are not in the queue" do
      expect(described_class.in_queue?(99)).to be false
    end
  end

  describe ".remove" do
    it "removes a user from the queue" do
      described_class.add(2, 1100)
      described_class.remove(2)
      expect(described_class.in_queue?(2)).to be false
    end
  end

  describe ".find_match" do
    it "finds a candidate within the elo range" do
      described_class.add(1, 1000)
      described_class.add(2, 1020)
      expect(described_class.find_match(1, 1000, 50)).to eq(2)
    end

    it "does not match a user with themselves" do
      described_class.add(3, 1500)
      expect(described_class.find_match(3, 1500, 50)).to be_nil
    end

    it "returns nil when no opponent is in range" do
      described_class.add(1, 1000)
      described_class.add(2, 2000)
      expect(described_class.find_match(1, 1000, 50)).to be_nil
    end

    it "matches when an opponent enters the expanded range" do
      described_class.add(1, 1000)
      described_class.add(2, 1400)
      expect(described_class.find_match(1, 1000, 50)).to be_nil
      expect(described_class.find_match(1, 1000, 500)).to eq(2)
    end
  end

  describe ".all_entries" do
    it "returns user_id, elo, and wait time tuples" do
      described_class.add(1, 1000)
      entries = described_class.all_entries
      expect(entries.size).to eq(1)
      user_id, elo, wait = entries.first
      expect(user_id).to eq(1)
      expect(elo).to eq(1000)
      expect(wait).to be >= 0
    end

    it "returns multiple entries sorted by elo" do
      described_class.add(1, 1500)
      described_class.add(2, 1000)
      ids = described_class.all_entries.map(&:first)
      expect(ids).to contain_exactly(1, 2)
    end
  end

  describe ".clear" do
    it "removes all entries" do
      described_class.add(1, 1000)
      described_class.add(2, 1100)
      described_class.clear
      expect(described_class.in_queue?(1)).to be false
      expect(described_class.in_queue?(2)).to be false
      expect(described_class.all_entries).to be_empty
    end
  end
end
