require "rails_helper"

RSpec.describe RoomCodeGenerator do
  describe ".generate" do
    it "returns a 4-character string" do
      code = described_class.generate
      expect(code).to be_a(String)
      expect(code.length).to eq(4)
    end

    it "uses only allowed characters (no I/O/0/1)" do
      allowed = described_class::ALPHABET
      50.times do
        code = described_class.generate
        expect(code.each_char.to_a).to all(be_in(allowed))
        expect(code).not_to match(/[IO01]/)
      end
    end

    it "retries when the generated code collides with an active game" do
      user = create(:user)

      # Pre-create an active game whose room_code is the first code produced
      existing_code = "ABCD"
      colliding_game = Game.create!(
        mode: "casual",
        min_players: 2,
        status: "waiting",
        room_code: existing_code
      )
      colliding_game.game_players.create!(user: user, seat_position: 0)

      # Replace ALPHABET with a mutable array whose `sample` is overridden
      # to yield deterministic letters: "ABCD" first (collides), then "EFGH".
      fake_alphabet = []
      seq = %w[A B C D E F G H]
      call_index = 0
      fake_alphabet.define_singleton_method(:sample) do
        letter = seq[call_index % seq.length]
        call_index += 1
        letter
      end

      stub_const("RoomCodeGenerator::ALPHABET", fake_alphabet)

      code = described_class.generate
      expect(code).to eq("EFGH")
      expect(code).not_to eq(existing_code)
    end

    it "skips codes that are on the offensive word blocklist" do
      # Return "DAMN" first (blocked), then "EFGH" (allowed)
      fake_alphabet = []
      seq = %w[D A M N E F G H]
      call_index = 0
      fake_alphabet.define_singleton_method(:sample) do
        letter = seq[call_index % seq.length]
        call_index += 1
        letter
      end

      stub_const("RoomCodeGenerator::ALPHABET", fake_alphabet)

      code = described_class.generate
      expect(code).not_to eq("DAMN")
      expect(described_class::BLOCKLIST).not_to include(code)
    end
  end

  describe ".valid_format?" do
    it "returns true for a valid 4-character code" do
      expect(described_class.valid_format?("ABCD")).to be true
      expect(described_class.valid_format?("2345")).to be true
    end

    it "returns false for codes containing forbidden characters" do
      expect(described_class.valid_format?("IOIO")).to be false
      expect(described_class.valid_format?("0123")).to be false
      expect(described_class.valid_format?("A1BC")).to be false
    end

    it "returns false for non-strings and wrong-length strings" do
      expect(described_class.valid_format?(nil)).to be false
      expect(described_class.valid_format?(1234)).to be false
      expect(described_class.valid_format?("ABC")).to be false
      expect(described_class.valid_format?("ABCDE")).to be false
    end
  end
end
