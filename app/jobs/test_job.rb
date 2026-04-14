class TestJob < ApplicationJob
  queue_as :default

  def perform(message = "test")
    Rails.logger.info("[TestJob] #{message}")
  end
end
