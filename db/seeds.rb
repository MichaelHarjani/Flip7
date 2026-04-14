# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).

require "yaml"

achievements_file = Rails.root.join("db/seeds/achievements.yml")
if achievements_file.exist?
  YAML.load_file(achievements_file).each do |attrs|
    record = Achievement.find_or_initialize_by(key: attrs["key"])
    record.assign_attributes(attrs.except("key"))
    record.save!
  end
  puts "Seeded #{Achievement.count} achievements"
end
