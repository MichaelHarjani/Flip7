# Play without an account: makes a throwaway user and signs it in, so every
# mode works locally without Google OAuth keys.
class GuestSessionsController < ApplicationController
  def create
    unless user_signed_in?
      name = "Guest #{rand(1000..9999)}"
      guest = User.create!(email: "guest-#{SecureRandom.hex(6)}@flip7.local", password: SecureRandom.hex(16), name: name)
      sign_in guest
    end
    redirect_to root_path, notice: "Playing as #{current_user.name}"
  end
end
