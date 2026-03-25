import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  update(event) {
    const count = parseInt(event.target.value)
    const fields = document.querySelectorAll(".player-name-field")
    fields.forEach((field, index) => {
      if (index < count) {
        field.classList.remove("hidden")
        field.querySelector("input").disabled = false
      } else {
        field.classList.add("hidden")
        field.querySelector("input").disabled = true
      }
    })
  }
}
