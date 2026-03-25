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

ActiveRecord::Schema[8.1].define(version: 2026_03_25_073801) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "game_players", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "game_id", null: false
    t.boolean "is_ai", default: false
    t.boolean "is_connected", default: true
    t.string "name", null: false
    t.integer "player_index", null: false
    t.string "session_token"
    t.datetime "updated_at", null: false
    t.index ["game_id"], name: "index_game_players_on_game_id"
    t.index ["session_token"], name: "index_game_players_on_session_token"
  end

  create_table "games", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "mode", default: 0
    t.string "room_code"
    t.jsonb "settings", default: {}
    t.jsonb "state", default: {}
    t.integer "status", default: 0
    t.datetime "updated_at", null: false
    t.index ["room_code"], name: "index_games_on_room_code", unique: true, where: "(room_code IS NOT NULL)"
    t.index ["status"], name: "index_games_on_status"
  end

  add_foreign_key "game_players", "games"
end
