require "rails_helper"

RSpec.describe GameFinalizer do
  describe ".finalize" do
    let(:winner) do
      create(:user,
             elo_rating: 1000,
             games_played: 50,
             games_won: 10,
             ranked_wins: 5,
             ranked_losses: 5)
    end
    let(:loser) do
      create(:user,
             elo_rating: 1000,
             games_played: 50,
             games_won: 10,
             ranked_wins: 5,
             ranked_losses: 5)
    end

    def make_game(mode:, scores:, status: "in_progress", round: 8)
      Game.create!(
        mode: mode,
        min_players: 2,
        status: status,
        cumulative_scores: scores,
        current_round: round
      )
    end

    context "ranked game with two players" do
      let(:game) do
        make_game(
          mode: "ranked",
          scores: { winner.id.to_s => 210, loser.id.to_s => 180 }
        )
      end

      it "updates both players' Elo ratings via EloCalculator" do
        expect {
          described_class.finalize(game)
        }.to change { winner.reload.elo_rating }.and change { loser.reload.elo_rating }

        expect(winner.reload.elo_rating).to be > 1000
        expect(loser.reload.elo_rating).to be < 1000
      end

      it "creates two MatchResult records with elo_before/after/change and placements" do
        expect {
          described_class.finalize(game)
        }.to change(MatchResult, :count).by(2)

        winner_mr = MatchResult.find_by(game: game, user: winner)
        loser_mr  = MatchResult.find_by(game: game, user: loser)

        expect(winner_mr.placement).to eq(1)
        expect(winner_mr.mode).to eq("ranked")
        expect(winner_mr.final_score).to eq(210)
        expect(winner_mr.elo_before).to eq(1000)
        expect(winner_mr.elo_after).to be > 1000
        expect(winner_mr.elo_change).to eq(winner_mr.elo_after - winner_mr.elo_before)

        expect(loser_mr.placement).to eq(2)
        expect(loser_mr.mode).to eq("ranked")
        expect(loser_mr.final_score).to eq(180)
        expect(loser_mr.elo_before).to eq(1000)
        expect(loser_mr.elo_after).to be < 1000
        expect(loser_mr.elo_change).to eq(loser_mr.elo_after - loser_mr.elo_before)
      end

      it "increments ranked_wins for the winner and ranked_losses for the loser" do
        described_class.finalize(game)
        expect(winner.reload.ranked_wins).to eq(6)
        expect(winner.reload.games_played).to eq(51)
        expect(winner.reload.games_won).to eq(11)
        expect(loser.reload.ranked_losses).to eq(6)
        expect(loser.reload.games_played).to eq(51)
        expect(loser.reload.games_won).to eq(10)
      end

      it "is idempotent: a second call does nothing" do
        described_class.finalize(game)
        winner_elo_after_first = winner.reload.elo_rating
        loser_elo_after_first  = loser.reload.elo_rating

        result = described_class.finalize(game)
        expect(result).to be_nil
        expect(MatchResult.where(game: game).count).to eq(2)
        expect(winner.reload.elo_rating).to eq(winner_elo_after_first)
        expect(loser.reload.elo_rating).to eq(loser_elo_after_first)
      end

      it "marks the game completed and sets winner_id" do
        described_class.finalize(game)
        expect(game.reload.winner_id).to eq(winner.id)
        expect(game.reload.status).to eq("completed")
      end

      it "uses EloCalculator-symmetric deltas at equal ratings" do
        described_class.finalize(game)
        winner_mr = MatchResult.find_by(game: game, user: winner)
        loser_mr  = MatchResult.find_by(game: game, user: loser)
        expect(winner_mr.elo_change).to eq(-loser_mr.elo_change)
      end
    end

    context "casual game" do
      let(:game) do
        make_game(
          mode: "casual",
          scores: { winner.id.to_s => 220, loser.id.to_s => 95 }
        )
      end

      it "creates MatchResults but does NOT touch Elo ratings or ranked counts" do
        expect {
          described_class.finalize(game)
        }.to change(MatchResult, :count).by(2)

        expect(winner.reload.elo_rating).to eq(1000)
        expect(loser.reload.elo_rating).to eq(1000)
        expect(winner.reload.ranked_wins).to eq(5)
        expect(loser.reload.ranked_losses).to eq(5)

        winner_mr = MatchResult.find_by(game: game, user: winner)
        expect(winner_mr.elo_before).to be_nil
        expect(winner_mr.elo_after).to be_nil
        expect(winner_mr.mode).to eq("casual")
        expect(winner_mr.placement).to eq(1)
      end
    end

    context "edge cases" do
      it "returns nil when fewer than 2 players have scores" do
        game = make_game(mode: "ranked", scores: { winner.id.to_s => 200 })
        expect(described_class.finalize(game)).to be_nil
        expect(MatchResult.count).to eq(0)
      end

      it "returns nil when cumulative_scores is empty" do
        game = make_game(mode: "ranked", scores: {})
        expect(described_class.finalize(game)).to be_nil
        expect(MatchResult.count).to eq(0)
      end
    end
  end
end
