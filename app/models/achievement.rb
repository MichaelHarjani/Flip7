class Achievement < ApplicationRecord
  has_many :user_achievements, dependent: :destroy
  has_many :users, through: :user_achievements

  validates :key, presence: true, uniqueness: true
  validates :name, :description, :category, :rarity, :icon, presence: true
  validates :rarity, inclusion: { in: %w[common rare epic legendary] }

  scope :anti, -> { where(is_anti: true) }
  scope :regular, -> { where(is_anti: false) }
  scope :by_category, ->(cat) { where(category: cat) }
  scope :tiered, -> { where.not(tier_target: nil) }

  def tiered?
    tier_target.present?
  end

  def parent
    return nil if parent_key.blank?
    self.class.find_by(key: parent_key)
  end
end
