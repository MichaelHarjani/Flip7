require 'rails_helper'

RSpec.describe Achievement, type: :model do
  describe 'validations' do
    it 'is valid with minimal attributes' do
      achievement = build(:achievement)
      expect(achievement).to be_valid
    end

    it 'requires a unique key' do
      create(:achievement, key: "duplicate_key")
      duplicate = build(:achievement, key: "duplicate_key")
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:key]).to be_present
    end

    it 'requires a key' do
      achievement = build(:achievement, key: nil)
      expect(achievement).not_to be_valid
      expect(achievement.errors[:key]).to be_present
    end

    it 'validates rarity inclusion' do
      achievement = build(:achievement, rarity: "mythical")
      expect(achievement).not_to be_valid
      expect(achievement.errors[:rarity]).to be_present
    end

    it 'accepts all valid rarities' do
      %w[common rare epic legendary].each do |rarity|
        achievement = build(:achievement, rarity: rarity)
        expect(achievement).to be_valid, "expected #{rarity} to be valid"
      end
    end
  end

  describe 'scopes' do
    describe '.anti' do
      it 'returns only anti-achievements' do
        regular = create(:achievement, is_anti: false)
        anti = create(:achievement, is_anti: true)
        expect(described_class.anti).to contain_exactly(anti)
        expect(described_class.anti).not_to include(regular)
      end
    end

    describe '.regular' do
      it 'returns only regular achievements' do
        regular = create(:achievement, is_anti: false)
        anti = create(:achievement, is_anti: true)
        expect(described_class.regular).to contain_exactly(regular)
        expect(described_class.regular).not_to include(anti)
      end
    end

    describe '.tiered' do
      it 'returns only achievements with tier_target set' do
        tiered = create(:achievement, tier_target: 5)
        _untiered = create(:achievement, tier_target: nil)
        expect(described_class.tiered).to contain_exactly(tiered)
      end
    end
  end

  describe '#tiered?' do
    it 'returns true when tier_target is present' do
      achievement = build(:achievement, tier_target: 10)
      expect(achievement.tiered?).to be true
    end

    it 'returns false when tier_target is nil' do
      achievement = build(:achievement, tier_target: nil)
      expect(achievement.tiered?).to be false
    end
  end

  describe '#parent' do
    it 'returns nil when parent_key is blank' do
      achievement = build(:achievement, parent_key: nil)
      expect(achievement.parent).to be_nil
    end

    it 'returns the parent achievement when parent_key points to one' do
      parent = create(:achievement, key: "flip7_first_test")
      child = create(:achievement, key: "flip7_5_test", parent_key: "flip7_first_test", tier_target: 5)
      expect(child.parent).to eq(parent)
    end
  end
end
