import { Controller } from "@hotwired/stimulus"

// Re-renders the page every few seconds: in the ranked matchmaking queue
// (which widens its Elo range the longer you wait), and on the game board
// as a fallback for missed live updates while waiting on other players.
export default class extends Controller {
  static values = { interval: { type: Number, default: 5000 } }

  connect() {
    this.timer = setInterval(() => Turbo.session.refresh(window.location.href), this.intervalValue)
  }

  disconnect() {
    clearInterval(this.timer)
  }
}
