import consumer from "channels/consumer"

function setupGameChannel() {
  // Look for game board or room lobby
  const gameElement = document.getElementById("game-board")
  const roomElement = document.getElementById("room-lobby")
  const element = gameElement || roomElement

  if (!element) return

  const gameId = element.dataset.gameId
  if (!gameId) return

  // Don't double-subscribe to same game
  if (window._gameChannelId === gameId && window._gameSubscription) return

  // Unsubscribe from previous game
  if (window._gameSubscription) {
    window._gameSubscription.unsubscribe()
  }

  window._gameChannelId = gameId
  window._gameSubscription = consumer.subscriptions.create(
    { channel: "GameChannel", game_id: gameId },
    {
      connected() {
        console.log("Connected to game channel", gameId)
      },
      disconnected() {
        console.log("Disconnected from game channel")
      },
      received(data) {
        if (data.action === "refresh") {
          window.location.reload()
        }
      }
    }
  )
}

// Run on initial page load and Turbo navigations
document.addEventListener("DOMContentLoaded", setupGameChannel)
document.addEventListener("turbo:load", setupGameChannel)
