Rails.application.routes.draw do
  require "sidekiq/web"
  # TODO: protect Sidekiq::Web behind admin auth
  mount Sidekiq::Web => "/sidekiq"

  devise_for :users, controllers: { omniauth_callbacks: "users/omniauth_callbacks" }
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  get "/profile", to: "profiles#show_self", as: :my_profile
  get "/profile/:id", to: "profiles#show", as: :profile

  # Casual multiplayer flow
  get "/play/casual", to: "games#new", defaults: { mode: "casual" }
  # Solo (vs bots) flow
  get "/play/solo", to: "games#new", defaults: { mode: "solo" }
  # Ranked duel flow
  get "/play/ranked", to: "matchmaking#new", as: :play_ranked
  resource :matchmaking_queue,
           only: [:create, :destroy],
           controller: "matchmaking",
           path: "matchmaking/queue"
  get "/join", to: "joins#new", as: :join
  get "/join/:code", to: "joins#show", as: :join_code
  resources :games, only: [:create, :show] do
    member do
      patch :join, to: "games#join"
      post :start
    end
    resources :moves, only: [] do
      collection do
        post :hit
        post :stay
        post :target
        post :next_round
      end
    end
  end

  # Defines the root path route ("/")
  root "pages#home"
end
