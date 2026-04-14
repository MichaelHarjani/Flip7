class ProfilesController < ApplicationController
  before_action :authenticate_user!, only: [:show_self]

  def show_self
    @user = current_user
    render :show
  end

  def show
    @user = User.find_by(id: params[:id])
    if @user.nil?
      redirect_to root_path, alert: "User not found."
      return
    end
  end
end
