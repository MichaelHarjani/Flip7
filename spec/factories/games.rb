FactoryBot.define do
  factory :game do
    mode { "solo" }
    status { "waiting" }
    min_players { 2 }
  end
end
