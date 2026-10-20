import { Controller } from "@hotwired/stimulus"

// Re-renders the page every few seconds (used while waiting in the ranked
// matchmaking queue, which widens its Elo range the longer you wait).
export default class extends Controller {
  static values = { interval: { type: Number, default: 5000 } }

  connect() {
    this.timer = setInterval(() => Turbo.visit(window.location.href, { action: "replace" }), this.intervalValue)
  }

  disconnect() {
    clearInterval(this.timer)
  }
}
