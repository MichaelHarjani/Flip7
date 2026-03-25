Rails.application.routes.draw do
  root "pages#home"

  resources :games, only: [ :new, :create, :show ] do
    member do
      post :hit
      post :stay
      post :play_action_card
      post :next_round
      post :ai_turn
    end
  end

  resources :rooms, only: [ :new, :create, :show ] do
    collection do
      get :join
      post :join, action: :process_join
    end
    member do
      post :start
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
