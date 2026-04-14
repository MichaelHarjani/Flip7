FactoryBot.define do
  factory :match_result do
    association :game
    association :user
    final_score { 100 }
    placement { 1 }
    rounds_played { 5 }
    mode { "solo" }
  end
end
