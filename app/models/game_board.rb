# GameBoard — read-only view model for games/show.
#
# Turns GameEngine's jsonb round_state into per-seat display data for one
# viewer. `controlled_user_ids` are the seats this viewer may act for: just
# themselves online, or every human seat on a pass-and-play device.
class GameBoard
  Seat = Struct.new(
    :game_player, :user_id, :name, :bot, :me, :status, :frozen, :busted_with,
    :cards, :second_chance, :round_score, :total, :color, :current,
    keyword_init: true
  ) do
    def active? = status == "active"
    def busted? = status == "busted"
    def stayed? = status == "stayed"
  end

  COLORS = %w[primary secondary accent info success warning].freeze

  attr_reader :game, :controlled_user_ids

  def initialize(game, controlled_user_ids: [])
    @game = game
    @controlled_user_ids = controlled_user_ids.map(&:to_i)
  end

  def round_state = game.round_state || {}
  def round = game.current_round
  def deck_size = Array(game.deck).size
  def round_over? = !!round_state["round_over"]
  def deal_phase? = !!round_state["deal_phase"]

  def seats
    @seats ||= begin
      hands = round_state["player_hands"] || {}
      statuses = round_state["player_statuses"] || {}
      frozen = Array(round_state["frozen_ids"]).map(&:to_i)
      busted_with = round_state["busted_with"] || {}
      flip7_winner = round_state["flip7_winner_id"]
      current = current_turn_player

      ordered_players.each_with_index.map do |gp, idx|
        uid = gp.user_id.to_s
        hand = hands[uid] || {}
        status = statuses[uid] || "active"
        Seat.new(
          game_player: gp,
          user_id: gp.user_id,
          name: display_name(gp),
          bot: gp.is_bot,
          me: controlled_user_ids.include?(gp.user_id),
          status: status,
          frozen: frozen.include?(gp.user_id),
          busted_with: busted_with[uid],
          cards: cards_for(hand),
          second_chance: !!hand["has_second_chance"],
          round_score: GameEngine.compute_round_score(hand, status, flip7_winner.to_s == uid),
          total: (game.cumulative_scores || {})[uid].to_i,
          color: COLORS[idx % COLORS.size],
          current: !round_over? && current&.id == gp.id
        )
      end
    end
  end

  def seat_for(user_id) = seats.find { |s| s.user_id.to_i == user_id.to_i }

  def current_seat = seats.find(&:current)

  # The seat that has to choose a target for a drawn action card, if any.
  def pending_action = round_state["pending_action"]
  def pending_seat = pending_action && seat_for(pending_action["drawer_id"])

  # The viewer must pick a target before anything else can happen.
  def my_pending_choice?
    pending_seat.present? && controlled_user_ids.include?(pending_seat.user_id)
  end

  def my_turn?
    !round_over? && !pending_action && current_seat.present? &&
      current_seat.active? && controlled_user_ids.include?(current_seat.user_id)
  end

  # The seat the viewer is acting for right now (pass-and-play may control many).
  def acting_seat
    return pending_seat if my_pending_choice?
    current_seat if my_turn?
  end

  def target_options
    return [] unless pending_action
    seats.select(&:active?)
  end

  def last_round
    Array(game.round_history).last
  end

  def largest_round
    best = GameFlow.largest_round(game)
    best && best.merge("name" => seat_for(best["user_id"])&.name)
  end

  def standings
    seats.sort_by { |s| [s.user_id == game.winner_id ? 0 : 1, -s.total] }
  end

  def flip7_winner_seat
    id = round_state["flip7_winner_id"]
    id && seat_for(id)
  end

  def recent_events(limit = 4)
    Array(round_state["events"]).last(limit)
  end

  private

  def ordered_players
    @ordered_players ||= game.game_players.includes(:user).order(:seat_position).to_a
  end

  def current_turn_player
    idx = game.current_turn_player_index
    return nil if idx.nil? || ordered_players.empty?
    ordered_players[idx % ordered_players.size]
  end

  def display_name(gp)
    gp.display_name.presence || gp.user&.name.presence || gp.user&.email&.split("@")&.first || "Player"
  end

  # Display cards in the same shape the helpers expect.
  def cards_for(hand)
    numbers = Array(hand["number_cards"]).map { |v| { "type" => "number", "value" => v } }
    modifiers = Array(hand["modifiers"]).map { |m| { "type" => "modifier", "modifier" => m["modifier"], "value" => m["value"] } }
    numbers + modifiers
  end
end
