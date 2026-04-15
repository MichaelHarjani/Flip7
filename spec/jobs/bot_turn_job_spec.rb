require "rails_helper"

RSpec.describe BotTurnJob, type: :job do
  include ActiveJob::TestHelper

  around do |example|
    original_adapter = ActiveJob::Base.queue_adapter
    ActiveJob::Base.queue_adapter = :test
    example.run
    ActiveJob::Base.queue_adapter = original_adapter
  end

  let(:human) { create(:user) }

  def build_in_progress_solo_game(bot_count: 2, strategies: nil)
    strategies ||= Array.new(bot_count, "balanced")
    game = Game.new(
      mode: "solo",
      min_players: 2,
      max_players: bot_count + 1,
      status: "waiting"
    )
    game.save!
    game.game_players.create!(user: human, seat_position: 0, is_bot: false)
    bot_count.times do |i|
      bot = User.create!(
        email: "bot-#{strategies[i]}-#{SecureRandom.hex(4)}@flip7.local",
        password: SecureRandom.hex(16),
        name: "Bot #{i}"
      )
      game.game_players.create!(
        user: bot,
        seat_position: i + 1,
        is_bot: true,
        bot_strategy: strategies[i]
      )
    end
    game.start! if game.may_start?
    GameEngine.start_round(game)
    game
  end

  def force_turn_to_seat(game, seat_position)
    rs = game.round_state
    rs["pending_action"] = nil
    rs["deal_phase"] = false
    # Make all players active so that hit/stay don't no-op
    rs["player_statuses"].each_key { |k| rs["player_statuses"][k] = "active" }
    game.round_state = rs
    game.current_turn_player_index = seat_position
    game.save!
  end

  describe "#perform" do
    it "advances a bot's turn by calling GameEngine.hit or stay" do
      game = build_in_progress_solo_game(bot_count: 1, strategies: %w[conservative])
      force_turn_to_seat(game, 1) # bot is at seat 1

      # The bot must call either hit or stay; assert state changes (turn advances or status changes)
      expect {
        described_class.new.perform(game.id)
        game.reload
      }.to change { [game.current_turn_player_index, game.round_state["player_statuses"]["#{game.game_players.find_by(seat_position: 1).user_id}"]] }
    end

    it "does nothing when the current player is the human" do
      game = build_in_progress_solo_game(bot_count: 1)
      force_turn_to_seat(game, 0) # human

      expect(GameEngine).not_to receive(:hit)
      expect(GameEngine).not_to receive(:stay)
      described_class.new.perform(game.id)
    end

    it "does nothing when the game is not in progress" do
      game = build_in_progress_solo_game(bot_count: 1)
      game.update!(status: "completed")

      expect(GameEngine).not_to receive(:hit)
      expect(GameEngine).not_to receive(:stay)
      described_class.new.perform(game.id)
    end

    it "re-enqueues itself if the next player is also a bot" do
      game = build_in_progress_solo_game(bot_count: 2, strategies: %w[conservative conservative])
      force_turn_to_seat(game, 1)

      # Stub BotBrain.decide to always stay so first bot finishes immediately,
      # leaving the next bot (seat 2) up next.
      allow_any_instance_of(BotBrain).to receive(:decide).and_return(:stay)

      expect {
        described_class.new.perform(game.id)
      }.to have_enqueued_job(BotTurnJob).with(game.id, 1)
    end
  end
end
