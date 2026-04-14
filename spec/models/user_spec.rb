require 'rails_helper'
require 'ostruct'

RSpec.describe User, type: :model do
  describe 'validations' do
    it 'is valid with valid attributes' do
      user = build(:user)
      expect(user).to be_valid
    end

    it 'requires an email' do
      user = build(:user, email: nil)
      expect(user).not_to be_valid
      expect(user.errors[:email]).to be_present
    end

    it 'requires a unique email' do
      create(:user, email: 'duplicate@example.com')
      duplicate = build(:user, email: 'duplicate@example.com')
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:email]).to be_present
    end

    it 'requires a password' do
      user = build(:user, password: nil)
      expect(user).not_to be_valid
    end
  end

  describe 'default stats' do
    it 'defaults elo_rating to 1000' do
      user = create(:user)
      expect(user.elo_rating).to eq(1000)
    end

    it 'defaults games_played to 0' do
      user = create(:user)
      expect(user.games_played).to eq(0)
    end

    it 'defaults games_won to 0' do
      user = create(:user)
      expect(user.games_won).to eq(0)
    end

    it 'defaults total_rounds_played to 0' do
      user = create(:user)
      expect(user.total_rounds_played).to eq(0)
    end

    it 'defaults total_flip7s to 0' do
      user = create(:user)
      expect(user.total_flip7s).to eq(0)
    end

    it 'defaults highest_round_score to 0' do
      user = create(:user)
      expect(user.highest_round_score).to eq(0)
    end

    it 'defaults ranked_wins to 0' do
      user = create(:user)
      expect(user.ranked_wins).to eq(0)
    end

    it 'defaults ranked_losses to 0' do
      user = create(:user)
      expect(user.ranked_losses).to eq(0)
    end

    it 'defaults current_win_streak to 0' do
      user = create(:user)
      expect(user.current_win_streak).to eq(0)
    end

    it 'defaults best_win_streak to 0' do
      user = create(:user)
      expect(user.best_win_streak).to eq(0)
    end
  end

  describe 'devise modules' do
    it 'includes omniauthable' do
      expect(User.devise_modules).to include(:omniauthable)
    end

    it 'configures google_oauth2 as omniauth provider' do
      expect(User.omniauth_providers).to include(:google_oauth2)
    end
  end

  describe '.from_omniauth' do
    let(:auth) do
      OpenStruct.new(
        provider: 'google_oauth2',
        uid: '123456789',
        info: OpenStruct.new(
          email: 't@t.com',
          name: 'Test User',
          image: 'http://example.com/avatar.jpg'
        )
      )
    end

    it 'creates a new user from auth hash' do
      expect { User.from_omniauth(auth) }.to change(User, :count).by(1)
    end

    it 'creates a valid user' do
      user = User.from_omniauth(auth)
      expect(user).to be_valid
      expect(user).to be_persisted
    end

    it 'sets provider and uid from auth' do
      user = User.from_omniauth(auth)
      expect(user.provider).to eq('google_oauth2')
      expect(user.uid).to eq('123456789')
    end

    it 'sets email, name, and avatar_url from auth info' do
      user = User.from_omniauth(auth)
      expect(user.email).to eq('t@t.com')
      expect(user.name).to eq('Test User')
      expect(user.avatar_url).to eq('http://example.com/avatar.jpg')
    end

    it 'returns existing user on repeated auth' do
      existing = User.from_omniauth(auth)
      expect { User.from_omniauth(auth) }.not_to change(User, :count)
      expect(User.from_omniauth(auth)).to eq(existing)
    end

    it 'applies game stat defaults on new user' do
      user = User.from_omniauth(auth)
      expect(user.elo_rating).to eq(1000)
      expect(user.games_played).to eq(0)
    end
  end
end
