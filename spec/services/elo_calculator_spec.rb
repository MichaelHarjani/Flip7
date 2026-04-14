require "rails_helper"

RSpec.describe EloCalculator do
  describe ".calculate" do
    context "two equal players at 1000" do
      let(:result) do
        described_class.calculate(
          winner: { elo_rating: 1000, games_played: 50 },
          loser:  { elo_rating: 1000, games_played: 50 }
        )
      end

      it "gives the winner a positive delta" do
        expect(result[:winner_delta]).to be > 0
      end

      it "gives the loser a symmetric negative delta" do
        expect(result[:loser_delta]).to eq(-result[:winner_delta])
      end

      it "returns integer ratings" do
        expect(result[:winner_new_rating]).to be_a(Integer)
        expect(result[:loser_new_rating]).to be_a(Integer)
      end

      it "returns integer deltas" do
        expect(result[:winner_delta]).to be_a(Integer)
        expect(result[:loser_delta]).to be_a(Integer)
      end
    end

    context "favorite (1500) wins vs underdog (1000)" do
      let(:result) do
        described_class.calculate(
          winner: { elo_rating: 1500, games_played: 50 },
          loser:  { elo_rating: 1000, games_played: 50 }
        )
      end

      it "gives the favorite a small positive delta" do
        expect(result[:winner_delta]).to be_between(1, 10)
      end

      it "gives the underdog loser a small negative delta" do
        expect(result[:loser_delta]).to be_between(-10, -1)
      end
    end

    context "underdog (1000) wins vs favorite (1500)" do
      let(:result) do
        described_class.calculate(
          winner: { elo_rating: 1000, games_played: 50 },
          loser:  { elo_rating: 1500, games_played: 50 }
        )
      end

      it "gives the underdog a large positive delta" do
        expect(result[:winner_delta]).to be > 20
      end

      it "gives the favorite loser a large negative delta" do
        expect(result[:loser_delta]).to be < -20
      end
    end

    context "provisional K (games_played < 20)" do
      it "produces larger deltas than established K for equal-rated players" do
        provisional = described_class.calculate(
          winner: { elo_rating: 1000, games_played: 5 },
          loser:  { elo_rating: 1000, games_played: 5 }
        )
        established = described_class.calculate(
          winner: { elo_rating: 1000, games_played: 50 },
          loser:  { elo_rating: 1000, games_played: 50 }
        )
        expect(provisional[:winner_delta]).to be > established[:winner_delta]
      end

      it "yields a 24-point delta for two provisional players at 1000" do
        result = described_class.calculate(
          winner: { elo_rating: 1000, games_played: 0 },
          loser:  { elo_rating: 1000, games_played: 0 }
        )
        # K=48, expected=0.5, delta = 48*0.5 = 24
        expect(result[:winner_delta]).to eq(24)
        expect(result[:loser_delta]).to eq(-24)
      end
    end

    context "K transition at exactly 20 games" do
      it "uses established K (32) for both at exactly 20 games" do
        result = described_class.calculate(
          winner: { elo_rating: 1000, games_played: 20 },
          loser:  { elo_rating: 1000, games_played: 20 }
        )
        # K=32, expected=0.5, delta = 32*0.5 = 16
        expect(result[:winner_delta]).to eq(16)
        expect(result[:loser_delta]).to eq(-16)
      end
    end

    context "Elo floor at 100" do
      it "clamps extremely negative results to 100" do
        result = described_class.calculate(
          winner: { elo_rating: 3000, games_played: 100 },
          loser:  { elo_rating: 100, games_played: 100 }
        )
        expect(result[:loser_new_rating]).to be >= 100
      end

      it "never lets a low-rated loser drop below 100" do
        # An equal-rated loser at 110 vs equal-rated winner at 110:
        # delta would be -16 (K=32, expected=0.5), so raw new rating = 94 -> clamped to 100.
        result = described_class.calculate(
          winner: { elo_rating: 110, games_played: 50 },
          loser:  { elo_rating: 110, games_played: 50 }
        )
        expect(result[:loser_new_rating]).to eq(100)
      end
    end

    context "determinism" do
      it "produces identical results for identical inputs" do
        params = {
          winner: { elo_rating: 1200, games_played: 30 },
          loser:  { elo_rating: 1100, games_played: 30 }
        }
        r1 = described_class.calculate(**params)
        r2 = described_class.calculate(**params)
        expect(r1).to eq(r2)
      end
    end

    context "accepts objects with elo_rating / games_played methods" do
      let(:winner_obj) { double(elo_rating: 1100, games_played: 40) }
      let(:loser_obj)  { double(elo_rating: 1100, games_played: 40) }

      it "works with duck-typed objects" do
        result = described_class.calculate(winner: winner_obj, loser: loser_obj)
        expect(result[:winner_delta]).to be > 0
        expect(result[:loser_delta]).to eq(-result[:winner_delta])
      end
    end

    context "accepts plain hashes" do
      it "works with hash inputs" do
        result = described_class.calculate(
          winner: { elo_rating: 1300, games_played: 25 },
          loser:  { elo_rating: 1250, games_played: 25 }
        )
        expect(result).to include(:winner_new_rating, :loser_new_rating, :winner_delta, :loser_delta)
        expect(result[:winner_delta]).to be > 0
      end
    end

    context "delta arithmetic consistency" do
      it "winner_delta equals winner_new_rating - winner_old_rating" do
        result = described_class.calculate(
          winner: { elo_rating: 1234, games_played: 33 },
          loser:  { elo_rating: 1456, games_played: 22 }
        )
        expect(result[:winner_delta]).to eq(result[:winner_new_rating] - 1234)
      end

      it "loser_delta equals loser_new_rating - loser_old_rating" do
        result = described_class.calculate(
          winner: { elo_rating: 1234, games_played: 33 },
          loser:  { elo_rating: 1456, games_played: 22 }
        )
        expect(result[:loser_delta]).to eq(result[:loser_new_rating] - 1456)
      end
    end
  end

  describe ".expected_score" do
    it "returns 0.5 for equal ratings" do
      expect(described_class.expected_score(1000, 1000)).to be_within(0.001).of(0.5)
    end

    it "returns > 0.5 for higher-rated self" do
      expect(described_class.expected_score(1500, 1000)).to be > 0.5
    end

    it "returns < 0.5 for lower-rated self" do
      expect(described_class.expected_score(1000, 1500)).to be < 0.5
    end

    it "is bounded in (0, 1) across many random pairs" do
      100.times do
        a = rand(0..3000)
        b = rand(0..3000)
        score = described_class.expected_score(a, b)
        expect(score).to be > 0
        expect(score).to be < 1
      end
    end
  end

  describe ".k_factor" do
    it "returns 48 for 0 games (provisional)" do
      expect(described_class.k_factor(0)).to eq(48)
    end

    it "returns 48 for 19 games (provisional boundary)" do
      expect(described_class.k_factor(19)).to eq(48)
    end

    it "returns 32 at exactly 20 games (transition point)" do
      expect(described_class.k_factor(20)).to eq(32)
    end

    it "returns 32 for established players (100 games)" do
      expect(described_class.k_factor(100)).to eq(32)
    end
  end

  describe "constants" do
    it "defines starting Elo as 1000" do
      expect(EloCalculator::STARTING_ELO).to eq(1000)
    end

    it "defines provisional K as 48" do
      expect(EloCalculator::PROVISIONAL_K).to eq(48)
    end

    it "defines established K as 32" do
      expect(EloCalculator::ESTABLISHED_K).to eq(32)
    end

    it "defines provisional threshold as 20" do
      expect(EloCalculator::PROVISIONAL_THRESHOLD).to eq(20)
    end

    it "defines Elo floor as 100" do
      expect(EloCalculator::ELO_FLOOR).to eq(100)
    end
  end
end
