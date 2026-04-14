require 'rails_helper'

RSpec.describe GamePlayer, type: :model do
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
      game_player = build(:game_player)
      expect(game_player).to be_valid
    end

    it 'is invalid without a seat_position' do
      game_player = build(:game_player, seat_position: nil)
      expect(game_player).not_to be_valid
      expect(game_player.errors[:seat_position]).to be_present
    end

    it 'is invalid with a negative seat_position' do
      game_player = build(:game_player, seat_position: -1)
      expect(game_player).not_to be_valid
      expect(game_player.errors[:seat_position]).to be_present
    end

    it 'requires a unique user per game' do
      game = create(:game)
      user = create(:user)
      create(:game_player, game: game, user: user, seat_position: 0)
      duplicate = build(:game_player, game: game, user: user, seat_position: 1)
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:user_id]).to be_present
    end

    it 'requires a unique seat_position per game' do
      game = create(:game)
      create(:game_player, game: game, user: create(:user), seat_position: 0)
      duplicate = build(:game_player, game: game, user: create(:user), seat_position: 0)
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:seat_position]).to be_present
    end

    it 'allows the same user in different games' do
      user = create(:user)
      create(:game_player, game: create(:game), user: user, seat_position: 0)
      other = build(:game_player, game: create(:game), user: user, seat_position: 0)
      expect(other).to be_valid
    end
  end

  describe 'defaults' do
    it 'defaults is_bot to false' do
      game_player = create(:game_player)
      expect(game_player.is_bot).to be(false)
    end

    it 'defaults connected to true' do
      game_player = create(:game_player)
      expect(game_player.connected).to be(true)
    end
  end
end
