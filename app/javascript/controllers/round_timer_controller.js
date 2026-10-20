import { Controller } from "@hotwired/stimulus"

// Auto-advances the round summary after a countdown (from the earlier
// flip7 build). The server ignores duplicate requests, so it is safe for
// every player's page to fire at once.
export default class extends Controller {
  static targets = ["countdown", "form"]
  static values = { seconds: { type: Number, default: 5 } }

  connect() {
    this.remaining = this.secondsValue
    this.updateCountdown()
    this.timer = setInterval(() => this.tick(), 1000)
  }

  disconnect() {
    this.clearTimer()
  }

  tick() {
    this.remaining -= 1
    this.updateCountdown()

    if (this.remaining <= 0) {
      this.clearTimer()
      if (this.hasFormTarget) this.formTarget.requestSubmit()
    }
  }

  updateCountdown() {
    if (this.hasCountdownTarget) {
      this.countdownTarget.textContent = `Next round in ${this.remaining}s…`
    }
  }

  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}
