require "rails_helper"

RSpec.describe TestJob, type: :job do
  include ActiveJob::TestHelper

  around do |example|
    original_adapter = ActiveJob::Base.queue_adapter
    ActiveJob::Base.queue_adapter = :test
    example.run
    ActiveJob::Base.queue_adapter = original_adapter
  end

  describe "#perform" do
    it "runs without error" do
      expect { described_class.perform_now("hello") }.not_to raise_error
    end

    it "can be enqueued" do
      expect {
        described_class.perform_later("hello")
      }.to have_enqueued_job(described_class).with("hello")
    end

    it "uses the default queue" do
      expect(described_class.new.queue_name).to eq("default")
    end
  end
end
