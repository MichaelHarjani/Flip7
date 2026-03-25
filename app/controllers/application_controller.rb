class ApplicationController < ActionController::Base
  allow_browser versions: :modern
  stale_when_importmap_changes

  private

  def current_session_token
    session[:player_token] ||= SecureRandom.hex(16)
  end
  helper_method :current_session_token
end
