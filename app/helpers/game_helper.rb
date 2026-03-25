module GameHelper
  # Each number gets a distinct color shade — lower = lighter, higher = richer
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

  MODIFIER_ADD_COLORS = {
    2  => "from-emerald-500 to-emerald-600 border-emerald-400/50",
    4  => "from-emerald-500 to-emerald-600 border-emerald-400/50",
    6  => "from-green-500 to-green-600 border-green-400/50",
    8  => "from-green-500 to-green-600 border-green-400/50",
    10 => "from-teal-500 to-teal-600 border-teal-400/50"
  }.freeze

  def card_gradient(card)
    case card[:type]
    when "number"
      NUMBER_COLORS[card[:value]] || "from-blue-600 to-blue-700 border-blue-500/50"
    when "modifier"
      if card[:modifier_type] == "multiply"
        "from-purple-500 to-purple-700 border-purple-400/50"
      else
        MODIFIER_ADD_COLORS[card[:modifier_value]] || "from-emerald-500 to-emerald-600 border-emerald-400/50"
      end
    when "action"
      case card[:action_type]
      when "freeze"
        "from-cyan-500 to-cyan-600 border-cyan-400/50"
      when "flip_three"
        "from-amber-500 to-amber-600 border-amber-400/50"
      when "second_chance"
        "from-orange-500 to-orange-600 border-orange-400/50"
      else
        "from-gray-500 to-gray-600 border-gray-400/50"
      end
    else
      "from-gray-500 to-gray-600 border-gray-400/50"
    end
  end

  def card_label(card)
    case card[:type]
    when "number" then card[:value].to_s
    when "modifier"
      card[:modifier_type] == "multiply" ? "×#{card[:modifier_value]}" : "+#{card[:modifier_value]}"
    when "action"
      case card[:action_type]
      when "freeze" then "❄"
      when "flip_three" then "3×"
      when "second_chance" then "🛡"
      else "?"
      end
    else "?"
    end
  end

  def card_sublabel(card)
    case card[:type]
    when "number" then nil
    when "modifier"
      card[:modifier_type] == "multiply" ? "MULT" : "ADD"
    when "action"
      case card[:action_type]
      when "freeze" then "FREEZE"
      when "flip_three" then "FLIP 3"
      when "second_chance" then "SAVE"
      else nil
      end
    end
  end

  def player_progress_percent(player)
    [ (player[:score].to_f / 200 * 100).round, 100 ].min
  end

  PLAYER_COLORS = %w[indigo violet emerald amber].freeze

  def player_bar_color(index)
    PLAYER_COLORS[index % PLAYER_COLORS.length]
  end
end
