require 'rails_helper'

RSpec.describe UserAchievement, type: :model do
  describe 'associations' do
    it 'belongs to a user' do
      association = described_class.reflect_on_association(:user)
      expect(association.macro).to eq(:belongs_to)
    end

    it 'belongs to an achievement' do
      association = described_class.reflect_on_association(:achievement)
      expect(association.macro).to eq(:belongs_to)
    end

    it 'belongs to a game (optional)' do
      association = described_class.reflect_on_association(:game)
      expect(association.macro).to eq(:belongs_to)
      expect(association.options[:optional]).to be true
    end
  end

  describe 'validations' do
    it 'is valid with valid attributes' do
      user_achievement = build(:user_achievement)
      expect(user_achievement).to be_valid
    end

    it 'is unique per [user, achievement]' do
      user = create(:user)
      achievement = create(:achievement)
      create(:user_achievement, user: user, achievement: achievement)
      duplicate = build(:user_achievement, user: user, achievement: achievement)
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:user_id]).to be_present
    end

    it 'rejects negative progress' do
      user_achievement = build(:user_achievement, progress: -1)
      expect(user_achievement).not_to be_valid
      expect(user_achievement.errors[:progress]).to be_present
    end
  end

  describe 'scopes' do
    describe '.unlocked' do
      it 'returns only records with unlocked_at set' do
        unlocked = create(:user_achievement, unlocked_at: Time.current)
        _locked = create(:user_achievement, unlocked_at: nil)
        expect(described_class.unlocked).to contain_exactly(unlocked)
      end
    end

    describe '.in_progress' do
      it 'returns only records without unlocked_at' do
        _unlocked = create(:user_achievement, unlocked_at: Time.current)
        in_progress = create(:user_achievement, unlocked_at: nil)
        expect(described_class.in_progress).to contain_exactly(in_progress)
      end
    end
  end
end
