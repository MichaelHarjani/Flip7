require 'rails_helper'

RSpec.describe MatchResult, type: :model do
  describe 'associations' do
    it 'belongs to a game' do
      association = described_class.reflect_on_association(:game)
      expect(association.macro).to eq(:belongs_to)
    end

    it 'belongs to a user' do
      association = described_class.reflect_on_association(:user)
      expect(association.macro).to eq(:belongs_to)
    end
  end

  describe 'validations' do
    it 'is valid with valid attributes' do
      match_result = build(:match_result)
      expect(match_result).to be_valid
    end

    it 'is invalid without final_score' do
      match_result = build(:match_result, final_score: nil)
      expect(match_result).not_to be_valid
      expect(match_result.errors[:final_score]).to be_present
    end

    it 'is invalid without placement' do
      match_result = build(:match_result, placement: nil)
      expect(match_result).not_to be_valid
      expect(match_result.errors[:placement]).to be_present
    end

    it 'is invalid without rounds_played' do
      match_result = build(:match_result, rounds_played: nil)
      expect(match_result).not_to be_valid
      expect(match_result.errors[:rounds_played]).to be_present
    end

    it 'is invalid with a mode outside the allowed list' do
      match_result = build(:match_result, mode: "chaos")
      expect(match_result).not_to be_valid
      expect(match_result.errors[:mode]).to be_present
    end
  end

  describe 'scopes' do
    describe '.for_mode' do
      it 'returns match_results matching the given mode' do
        solo = create(:match_result, mode: "solo")
        _ranked = create(:match_result, mode: "ranked")
        expect(MatchResult.for_mode("solo")).to contain_exactly(solo)
      end
    end

    describe '.recent' do
      it 'orders match_results newest first' do
        older = create(:match_result, created_at: 2.days.ago)
        newer = create(:match_result, created_at: 1.day.ago)
        expect(MatchResult.recent.to_a).to eq([newer, older])
      end
    end
  end

  describe 'defaults' do
    it 'defaults total_flip7s to 0' do
      match_result = create(:match_result)
      expect(match_result.total_flip7s).to eq(0)
    end

    it 'defaults highest_round_score to 0' do
      match_result = create(:match_result)
      expect(match_result.highest_round_score).to eq(0)
    end
  end
end
