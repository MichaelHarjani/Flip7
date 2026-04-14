# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_04_14_103019) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "game_players", force: :cascade do |t|
    t.string "bot_strategy"
    t.boolean "connected", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "disconnected_at"
    t.bigint "game_id", null: false
    t.boolean "is_bot", default: false, null: false
    t.integer "seat_position", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["game_id", "seat_position"], name: "index_game_players_on_game_id_and_seat_position", unique: true
    t.index ["game_id", "user_id"], name: "index_game_players_on_game_id_and_user_id", unique: true
    t.index ["game_id"], name: "index_game_players_on_game_id"
    t.index ["user_id"], name: "index_game_players_on_user_id"
  end

  create_table "games", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.jsonb "cumulative_scores", default: {}, null: false
    t.integer "current_round", default: 0, null: false
    t.integer "current_turn_player_index"
    t.jsonb "deck", default: [], null: false
    t.integer "deck_count", default: 1, null: false
    t.integer "lock_version", default: 0, null: false
    t.integer "max_players"
    t.integer "min_players", default: 2, null: false
    t.string "mode", null: false
    t.integer "rematch_of"
    t.string "room_code", limit: 4
    t.jsonb "round_state", default: {}, null: false
    t.string "status", default: "waiting", null: false
    t.datetime "turn_expires_at"
    t.integer "turn_number", default: 0, null: false
    t.datetime "updated_at", null: false
    t.integer "winner_id"
    t.index ["mode"], name: "index_games_on_mode"
    t.index ["room_code"], name: "index_games_on_room_code", unique: true, where: "((status)::text = ANY ((ARRAY['waiting'::character varying, 'in_progress'::character varying])::text[]))"
    t.index ["status"], name: "index_games_on_status"
  end

  create_table "match_results", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "elo_after"
    t.integer "elo_before"
    t.integer "elo_change"
    t.integer "final_score", null: false
    t.bigint "game_id", null: false
    t.integer "highest_round_score", default: 0, null: false
    t.string "mode", null: false
    t.integer "placement", null: false
    t.integer "rounds_played", null: false
    t.integer "total_flip7s", default: 0, null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["game_id"], name: "index_match_results_on_game_id"
    t.index ["mode", "created_at"], name: "index_match_results_on_mode_and_created_at"
    t.index ["user_id", "created_at"], name: "index_match_results_on_user_id_and_created_at"
    t.index ["user_id"], name: "index_match_results_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "avatar_url"
    t.integer "best_win_streak", default: 0, null: false
    t.datetime "created_at", null: false
    t.integer "current_win_streak", default: 0, null: false
    t.integer "elo_rating", default: 1000, null: false
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.integer "games_played", default: 0, null: false
    t.integer "games_won", default: 0, null: false
    t.integer "highest_round_score", default: 0, null: false
    t.string "name"
    t.string "provider"
    t.integer "ranked_losses", default: 0, null: false
    t.integer "ranked_wins", default: 0, null: false
    t.datetime "remember_created_at"
    t.datetime "reset_password_sent_at"
    t.string "reset_password_token"
    t.integer "total_flip7s", default: 0, null: false
    t.integer "total_rounds_played", default: 0, null: false
    t.string "uid"
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "game_players", "games"
  add_foreign_key "game_players", "users"
  add_foreign_key "match_results", "games"
  add_foreign_key "match_results", "users"
end
