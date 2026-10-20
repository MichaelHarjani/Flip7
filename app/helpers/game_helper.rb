# Card visuals ported from the earlier flip7 build (app/helpers/game_helper.rb),
# adapted to GameEngine's card hashes.
module GameHelper
  # Each number gets a distinct shade — lower = lighter, higher = richer.
  NUMBER_COLORS = {
    0  => "from-slate-500 to-slate-600 border-slate-400/50",
    1  => "from-sky-400 to-sky-500 border-sky-300/50",
    2  => "from-sky-500 to-sky-600 border-sky-400/50",
    3  => "from-blue-400 to-blue-500 border-blue-300/50",
    4  => "from-blue-500 to-blue-600 border-blue-400/50",
    5  => "from-blue-600 to-blue-700 border-blue-500/50",
    6  => "from-indigo-500 to-indigo-600 border-indigo-400/50",
    7  => "from-indigo-600 to-indigo-700 border-indigo-500/50",
    8  => "from-violet-500 to-violet-600 border-violet-400/50",
    9  => "from-violet-600 to-violet-700 border-violet-500/50",
    10 => "from-purple-500 to-purple-600 border-purple-400/50",
    11 => "from-purple-600 to-purple-700 border-purple-500/50",
    12 => "from-fuchsia-600 to-fuchsia-700 border-fuchsia-500/50"
  }.freeze

  ACTION_COLORS = {
    "freeze"        => "from-cyan-500 to-cyan-600 border-cyan-400/50",
    "flip_three"    => "from-amber-500 to-amber-600 border-amber-400/50",
    "second_chance" => "from-orange-500 to-orange-600 border-orange-400/50"
  }.freeze

  ACTION_LABELS = {
    "freeze"        => ["❄", "FREEZE"],
    "flip_three"    => ["3×", "FLIP 3"],
    "second_chance" => ["🛡", "SAVE"]
  }.freeze

  BUST_COLORS = "from-red-600 to-red-700 border-red-400/70 ring-2 ring-red-500/40".freeze

  def card_gradient(card)
    case card["type"]
    when "number"   then NUMBER_COLORS.fetch(card["value"].to_i, NUMBER_COLORS[5])
    when "modifier" then card["modifier"] == "times" ? "from-purple-500 to-purple-700 border-purple-400/50" : "from-emerald-500 to-emerald-600 border-emerald-400/50"
    when "action"   then ACTION_COLORS.fetch(card["action"], "from-gray-500 to-gray-600 border-gray-400/50")
    else "from-gray-500 to-gray-600 border-gray-400/50"
    end
  end

  def card_label(card)
    case card["type"]
    when "number"   then card["value"].to_s
    when "modifier" then card["modifier"] == "times" ? "×#{card["value"]}" : "+#{card["value"]}"
    when "action"   then ACTION_LABELS.dig(card["action"], 0) || "?"
    end
  end

  def card_sublabel(card)
    case card["type"]
    when "modifier" then card["modifier"] == "times" ? "MULT" : "ADD"
    when "action"   then ACTION_LABELS.dig(card["action"], 1)
    end
  end

  def action_name(type)
    { "freeze" => "Freeze", "flip_three" => "Flip Three", "second_chance" => "Second Chance" }.fetch(type.to_s, type.to_s.humanize)
  end

  def action_prompt(type)
    case type.to_s
    when "freeze"        then "❄ Freeze — choose a player to bank their points and sit out"
    when "flip_three"    then "3× Flip Three — choose who must flip the next three cards"
    when "second_chance" then "🛡 You already hold a Second Chance — give this one away"
    end
  end

  # Literal class names so Tailwind's scanner picks them up.
  SEAT_PROGRESS = {
    "primary" => "progress-primary", "secondary" => "progress-secondary", "accent" => "progress-accent",
    "info" => "progress-info", "success" => "progress-success", "warning" => "progress-warning"
  }.freeze
  SEAT_DOT = {
    "primary" => "bg-primary", "secondary" => "bg-secondary", "accent" => "bg-accent",
    "info" => "bg-info", "success" => "bg-success", "warning" => "bg-warning"
  }.freeze

  def seat_progress_class(seat) = SEAT_PROGRESS.fetch(seat.color)
  def seat_dot_class(seat) = SEAT_DOT.fetch(seat.color)

  def score_progress(total)
    [(total.to_f / GameEngine::WINNING_SCORE * 100).round, 100].min
  end

  # One-line, human-readable version of a GameEngine event (for the log).
  def describe_event(event, board)
    name = ->(id) { board.seat_for(id)&.name || "Someone" }
    case event["type"]
    when "card_drawn", "flip_three_draw", "initial_deal"
      who = event["user_id"] || event["target_id"]
      "#{name.(who)} drew #{card_label(event["card"])}"
    when "busted"             then "#{name.(event["user_id"])} busted on a #{event["value"]}!"
    when "stayed"             then "#{name.(event["user_id"])} stayed"
    when "flip7"              then "#{name.(event["user_id"])} flipped 7! +15"
    when "freeze_applied"     then "#{name.(event["drawer_id"])} froze #{name.(event["target_id"])}"
    when "flip_three_start"   then "#{name.(event["drawer_id"])} hit #{name.(event["target_id"])} with Flip Three"
    when "second_chance_used" then "#{name.(event["user_id"])}'s Second Chance saved them"
    when "second_chance_given" then "#{name.(event["drawer_id"])} gave a Second Chance to #{name.(event["target_id"])}"
    when "deck_reshuffled"    then "Discard pile reshuffled into the deck"
    end
  end
end
