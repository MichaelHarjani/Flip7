class RoomCodeGenerator
  ALPHABET = (("A".."H").to_a + ("J".."N").to_a + ("P".."Z").to_a + ("2".."9").to_a).freeze
  BLOCKLIST = %w[DAMN HELL SHIT FUCK ASSR KILL].freeze
  MAX_ATTEMPTS = 50

  def self.generate
    MAX_ATTEMPTS.times do
      code = Array.new(4) { ALPHABET.sample }.join
      next if BLOCKLIST.include?(code)
      next if Game.exists?(room_code: code, status: %w[waiting in_progress])
      return code
    end
    raise "Could not generate unique room code after #{MAX_ATTEMPTS} attempts"
  end

  def self.valid_format?(code)
    return false unless code.is_a?(String) && code.length == 4
    code.each_char.all? { |c| ALPHABET.include?(c) }
  end
end
