FactoryBot.define do
  factory :achievement do
    sequence(:key) { |n| "achievement_#{n}" }
    sequence(:name) { |n| "Achievement #{n}" }
    description { "An achievement description" }
    category { "special" }
    rarity { "common" }
    icon { "🏅" }
    is_anti { false }
    tier_target { nil }
    parent_key { nil }
  end
end
