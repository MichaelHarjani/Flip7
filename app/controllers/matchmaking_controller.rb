class MatchmakingController < ApplicationController
  before_action :authenticate_user!
  MIN_CASUAL_GAMES = 5

  def new
    # Matched while waiting? Go straight to the duel.
    if (game = current_user.games.where(mode: "ranked", status: "in_progress").where("games.created_at > ?", 10.minutes.ago).order(created_at: :desc).first)
      redirect_to game
      return
    end

    @casual_games_played = casual_games_played
    @min_required = MIN_CASUAL_GAMES
    @unlocked = @casual_games_played >= MIN_CASUAL_GAMES
    @in_queue = @unlocked && MatchmakingQueue.in_queue?(current_user.id)
    # Nothing else schedules the pairing pass, so every poll of a queued
    # player runs one (the Elo window widens with time spent waiting).
    MatchmakingWorkerJob.perform_later if @in_queue
  end

  def create
    unless casual_games_played >= MIN_CASUAL_GAMES
      redirect_to play_ranked_path, alert: "Play 5 casual games first to unlock ranked." and return
    end
    MatchmakingQueue.add(current_user.id, current_user.elo_rating || 1000)
    MatchmakingWorkerJob.perform_later
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
