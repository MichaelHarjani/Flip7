require 'rails_helper'

RSpec.describe Game, type: :model do
  describe 'validations' do
    it 'is valid with valid attributes' do
      game = build(:game)
      expect(game).to be_valid
    end

    it 'is invalid without a mode' do
      game = build(:game, mode: nil)
      expect(game).not_to be_valid
      expect(game.errors[:mode]).to be_present
    end

    it 'is invalid with a mode outside the allowed list' do
      game = build(:game, mode: "chaos")
      expect(game).not_to be_valid
      expect(game.errors[:mode]).to be_present
    end

    it 'is invalid with min_players less than 2' do
      game = build(:game, min_players: 1)
      expect(game).not_to be_valid
      expect(game.errors[:min_players]).to be_present
    end
  end

  describe 'associations' do
    it 'has many game_players' do
      association = described_class.reflect_on_association(:game_players)
      expect(association.macro).to eq(:has_many)
    end

    it 'has many users through game_players' do
      association = described_class.reflect_on_association(:users)
      expect(association.macro).to eq(:has_many)
      expect(association.options[:through]).to eq(:game_players)
    end

    it 'has many match_results' do
      association = described_class.reflect_on_association(:match_results)
      expect(association.macro).to eq(:has_many)
    end

    it 'belongs to winner (optional)' do
      association = described_class.reflect_on_association(:winner)
      expect(association.macro).to eq(:belongs_to)
      expect(association.options[:optional]).to be(true)
      expect(association.options[:class_name]).to eq("User")
    end

    it 'belongs to rematch_source (optional, self-ref via rematch_of)' do
      association = described_class.reflect_on_association(:rematch_source)
      expect(association.macro).to eq(:belongs_to)
      expect(association.options[:optional]).to be(true)
      expect(association.options[:class_name]).to eq("Game")
      expect(association.options[:foreign_key]).to eq(:rematch_of)
    end
  end

  describe 'AASM state machine' do
    it 'starts in the waiting state' do
      game = create(:game)
      expect(game.waiting?).to be(true)
      expect(game.status).to eq("waiting")
    end

    it 'cannot start without enough players' do
      game = create(:game, min_players: 2)
      expect(game.may_start?).to be(false)
      expect { game.start! }.to raise_error(AASM::InvalidTransition)
      expect(game.reload.status).to eq("waiting")
    end

    it 'can start when enough players are seated' do
      game = create(:game, min_players: 2)
      create(:game_player, game: game, user: create(:user))
      create(:game_player, game: game, user: create(:user))
      expect(game.may_start?).to be(true)
      game.start!
      expect(game.in_progress?).to be(true)
    end

    it 'transitions from in_progress to completed via complete event' do
      game = create(:game, min_players: 2)
      create(:game_player, game: game, user: create(:user))
      create(:game_player, game: game, user: create(:user))
      game.start!
      game.complete!
      expect(game.completed?).to be(true)
    end

    it 'transitions from waiting to abandoned via abandon event' do
      game = create(:game)
      game.abandon!
      expect(game.abandoned?).to be(true)
    end

    it 'transitions from in_progress to abandoned via abandon event' do
      game = create(:game, min_players: 2)
      create(:game_player, game: game, user: create(:user))
      create(:game_player, game: game, user: create(:user))
      game.start!
      game.abandon!
      expect(game.abandoned?).to be(true)
    end

    it 'transitions from waiting to expired via expire event' do
      game = create(:game)
      game.expire!
      expect(game.expired?).to be(true)
    end
  end

  describe '#enough_players?' do
    it 'returns false when fewer players than min_players are seated' do
      game = create(:game, min_players: 2)
      expect(game.enough_players?).to be(false)
    end

    it 'returns true when seated players meet min_players' do
      game = create(:game, min_players: 2)
      create(:game_player, game: game, user: create(:user))
      create(:game_player, game: game, user: create(:user))
      expect(game.enough_players?).to be(true)
    end
  end
end
