class MatchmakingController < ApplicationController
  before_action :authenticate_user!
  MIN_CASUAL_GAMES = 5

  def new
    @casual_games_played = casual_games_played
    @min_required = MIN_CASUAL_GAMES
    @unlocked = @casual_games_played >= MIN_CASUAL_GAMES
    @in_queue = @unlocked && MatchmakingQueue.in_queue?(current_user.id)
  end

  def create
    unless casual_games_played >= MIN_CASUAL_GAMES
      redirect_to play_ranked_path, alert: "Play 5 casual games first to unlock ranked." and return
    end
    MatchmakingQueue.add(current_user.id, current_user.elo_rating || 1000)
    redirect_to play_ranked_path, notice: "You're in the queue."
  end

  def destroy
    MatchmakingQueue.remove(current_user.id)
    redirect_to play_ranked_path, notice: "Left the queue."
  end

  private

  def casual_games_played
    @casual_games_played ||= current_user.match_results.where(mode: "casual").count
  end
end
