# Action Cards in Flip 7 Simulation

## Overview

The Flip 7 simulation implements three types of action cards that affect gameplay. Here's how each one works in the simulation:

---

## 1. SECOND CHANCE Card

### Purpose
Protects a player from busting ONE time by preventing a duplicate number card from being added to their hand.

### How It Works in the Simulation

**When Drawn:**
```python
if card.action_type == ActionType.SECOND_CHANCE:
    player.has_second_chance = True
```

**When a Bust Would Occur:**
```python
if player.would_bust(card):
    if player.has_second_chance:
        # Use second chance - discard the duplicate card
        player.has_second_chance = False
        game_state.discard_pile.append(card)
        continue  # Don't add card to hand, keep playing
    else:
        # Bust! Player is out
        player.has_busted = True
        player.is_active = False
        player.round_score = 0
```

### Key Points
- ✅ Automatically used when a duplicate is drawn
- ✅ Only protects from ONE bust
- ✅ The duplicate card is discarded (not added to hand)
- ✅ Player continues their turn after using it
- ❌ Does NOT protect from multiple busts in one turn
- ❌ Discarded at end of round (not kept across rounds)

### Example
```
Player has: [3, 7, 10]
Player has Second Chance: YES

Turn 1: Draws [7] → Would bust! → Uses Second Chance → [7] discarded → Continue playing
Turn 2: Draws [5] → No bust → Hand now: [3, 7, 10, 5]
Turn 3: Draws [3] → Would bust! → No Second Chance left → BUST! (Score = 0)
```

---

## 2. FLIP THREE Card

### Purpose
Forces the player to draw 3 cards instead of 1 on their next hit.

### How It Works in the Simulation

**When Drawn:**
```python
if card.action_type == ActionType.FLIP_THREE:
    player.has_flip_three_active = True
```

**On Next Hit:**
```python
num_cards = 3 if player.has_flip_three_active else 1

for i in range(num_cards):
    card = game_state.draw_card()
    # Check for bust on each card drawn
    # Add to hand if safe
```

**After Use:**
```python
if num_cards == 3:
    player.has_flip_three_active = False  # Reset flag
```

### Key Points
- ✅ Activates on next "hit" action
- ✅ Draws 3 cards sequentially (checked for bust after each)
- ✅ Can trigger bust if any of the 3 cards is a duplicate
- ✅ Can lead to Flip 7 if you get 7 unique numbers
- ✅ Second Chance can save you during a Flip Three draw
- ❌ NOT optional - you MUST draw 3 cards

### Example
```
Player has: [2, 5, 8]
Player draws: [Flip Three card] → has_flip_three_active = True

Next turn (HIT action):
  Draw 1: [11] → Safe → Hand: [2, 5, 8, 11]
  Draw 2: [6] → Safe → Hand: [2, 5, 8, 11, 6]
  Draw 3: [2] → DUPLICATE! → Would bust...
          → But has Second Chance! → [2] discarded → Safe!

Final hand: [2, 5, 8, 11, 6]
Flip Three flag reset to False
```

---

## 3. FREEZE Card

### Purpose
In real multiplayer games, players can freeze opponents to force them to bank their current score and exit the round.

### How It Works in the Simulation

**Current Implementation:**
```python
# FREEZE cards are in the deck but NOT used by bots
# Bots don't strategically freeze each other in simulations
```

**Why Not Implemented for Bots:**
- Freezing requires opponent modeling (who to freeze? when?)
- Adds complexity to strategy evaluation
- Main goal is testing individual bot decision-making (hit vs stay)
- Can be added for advanced multi-agent strategies later

### In Real Games (Not Simulated)
```python
def freeze_player(target_player_id):
    target.frozen_by = current_player.id
    target.round_score = target.calculate_score()
    target.is_active = False  # Exits round with banked score
```

### Key Points
- ❌ Currently NOT used in bot simulations
- ✅ Cards exist in deck but are ignored by bots
- ✅ Could be implemented for advanced strategies
- 💡 Would require game-tree search or opponent modeling

---

## Action Cards and Scoring

### Important Rules
1. **Action cards do NOT count toward Flip 7** - Only unique number cards count
2. **Action cards CANNOT cause a bust** - Only duplicate number cards cause busts
3. **Action cards are NOT scored** - Only number cards and modifiers affect score

### Scoring Calculation (Reminder)
```python
def calculate_score(player, is_flip7=False):
    # Step 1: Sum all number card values
    total = sum(player.get_number_values())

    # Step 2: Apply x2 multiplier if present
    if player.has_multiplier_card():
        total *= 2

    # Step 3: Add modifier bonuses (+2, +4, +6, +8, +10)
    total += sum(player.get_modifier_bonuses())

    # Step 4: Add Flip 7 bonus
    if is_flip7:
        total += 15

    return total
```

---

## Bot Strategy Considerations

### How Bots Handle Action Cards

**Current Behavior:**
- Bots receive action cards passively (when drawn)
- Second Chance is used automatically (no decision needed)
- Flip Three forces 3-card draw (no decision needed)
- Freeze is ignored (not implemented)

**Strategy Impact:**
- Bots don't "try" to get action cards
- Bots don't avoid action cards
- Action cards are random events that affect gameplay
- Bot strategies focus on: "When to hit vs stay based on bust risk"

### Advanced Strategy Ideas (Not Yet Implemented)

**Possible Enhancements:**
1. **Value Second Chance in risk calculation**
   - More aggressive if you have Second Chance
   - Factor protection into bust probability

2. **Account for Flip Three risk**
   - If you have Flip Three active, be more conservative
   - Higher bust chance with 3 cards vs 1

3. **Strategic Freeze usage**
   - Freeze leader when they have high score
   - Freeze risky players before they bust
   - Requires multi-agent reasoning

---

## Testing Action Cards

### Verify Second Chance Works
```python
game = Flip7Game([BustProbabilityStrategy(0.5)], verbose=True)
# Watch for: "SECOND CHANCE USED!" messages
```

### Verify Flip Three Works
```python
game = Flip7Game([CardCountStrategy(7)], verbose=True)
# Watch for: "drawing 3 card(s)" messages
```

### See Action Card Distribution
```python
deck = create_deck(4)
action_cards = [c for c in deck if c.card_type == CardType.ACTION]
print(f"Total action cards: {len(action_cards)}")
# Expected: 9 cards (3 Second Chance + 3 Flip Three + 3 Freeze)
```

---

## Common Questions

### Q: Can I have multiple Second Chances?
**A:** In the real game, if you draw a Second Chance when you already have one, you must give it to another player. In the simulation, each player can only have `has_second_chance = True/False` (simplified).

### Q: What happens if Flip Three draws 3 duplicates?
**A:** Each card is checked sequentially. First duplicate busts you (unless Second Chance saves you). Remaining cards aren't drawn.

### Q: Do action cards count as cards in hand?
**A:** Yes, they're in your hand array, but they don't count toward scoring or Flip 7.

### Q: Why don't bots use Freeze strategically?
**A:** Implementing strategic Freeze requires opponent modeling and game theory, which is beyond the current simulation scope. The focus is on individual hit/stay decisions.

---

## Future Enhancements

Possible additions for more realistic action card usage:

1. **Adaptive Second Chance Strategy**
   - Increase risk tolerance when protected
   - Track Second Chance availability in opponent modeling

2. **Flip Three Risk Assessment**
   - Calculate expected value of drawing 3 cards
   - Decide whether to hit based on Flip Three status

3. **Strategic Freeze Implementation**
   - Q-learning or Monte Carlo Tree Search
   - Opponent score tracking
   - Timing optimization (when to freeze)

4. **Multi-card Action Combos**
   - Handle complex scenarios (Flip Three + Second Chance)
   - Optimal play with multiple action cards

---

## Summary Table

| Action Card | When Activated | Effect | Bot Uses It? | Implementation Status |
|-------------|----------------|--------|--------------|----------------------|
| **Second Chance** | On bust | Prevents ONE bust | Automatic | ✅ Fully Implemented |
| **Flip Three** | On next hit | Draw 3 cards | Automatic | ✅ Fully Implemented |
| **Freeze** | Player choice | Bank opponent's score | No | ❌ Not Used by Bots |

---

For more details on the simulation, see `FLIP7_SIMULATION_README.md`.
