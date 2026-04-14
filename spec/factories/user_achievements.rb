FactoryBot.define do
  factory :user_achievement do
    association :user
    association :achievement
    game { nil }
    progress { 0 }
    unlocked_at { nil }
  end
end
