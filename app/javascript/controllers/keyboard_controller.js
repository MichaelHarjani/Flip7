import { Controller } from "@hotwired/stimulus"

// H = Hit, S = Stay, Enter = next round (from the earlier flip7 build).

export default class extends Controller {
  static targets = ["hitBtn", "stayBtn", "nextRoundBtn"]

  connect() {
    this.handleKeydown = this.handleKeydown.bind(this)
    document.addEventListener("keydown", this.handleKeydown)
  }

  disconnect() {
    document.removeEventListener("keydown", this.handleKeydown)
  }

  handleKeydown(event) {
    // Don't trigger if typing in an input
    if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") return

    if (event.key === "h" || event.key === "H") {
      event.preventDefault()
      if (this.hasHitBtnTarget && !this.hitBtnTarget.disabled) {
        this.hitBtnTarget.closest("form").requestSubmit()
      }
    }

    if (event.key === "s" || event.key === "S") {
      event.preventDefault()
      if (this.hasStayBtnTarget && !this.stayBtnTarget.disabled) {
        this.stayBtnTarget.closest("form").requestSubmit()
      }
    }

    if (event.key === "Enter") {
      event.preventDefault()
      if (this.hasNextRoundBtnTarget && !this.nextRoundBtnTarget.disabled) {
        this.nextRoundBtnTarget.closest("form").requestSubmit()
      }
    }
  }
}
