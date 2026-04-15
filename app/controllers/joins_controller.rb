class JoinsController < ApplicationController
  before_action :authenticate_user!

  def new
    # form to enter a code
  end

  def show
    code = params[:code]&.upcase
    game = Game.find_by(room_code: code, status: %w[waiting in_progress])
    if game
      redirect_to game
    else
      redirect_to join_path, alert: "No game found with code #{code}"
    end
  end
end
