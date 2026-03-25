import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["hitBtn", "stayBtn"]

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
      if (this.hasHitBtnTarget) {
        this.hitBtnTarget.closest("form").requestSubmit()
      }
    }

    if (event.key === "s" || event.key === "S") {
      event.preventDefault()
      if (this.hasStayBtnTarget) {
        this.stayBtnTarget.closest("form").requestSubmit()
      }
    }
  }
}
