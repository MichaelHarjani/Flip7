FactoryBot.define do
  factory :game_player do
    association :game
    association :user
    sequence(:seat_position) { |n| n - 1 }
    is_bot { false }
    connected { true }
  end
end
