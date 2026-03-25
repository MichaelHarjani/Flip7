import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { text: String }

  copy() {
    navigator.clipboard.writeText(this.textValue).then(() => {
      const el = this.element
      const original = el.textContent
      // Brief visual feedback
      const btn = this.element.querySelector("button")
      if (btn) {
        btn.textContent = "✓"
        setTimeout(() => { btn.textContent = "📋" }, 1500)
      }
    })
  }
}
