# Flip 7 Bot Strategy Simulator

A Python simulation environment for testing and optimizing bot strategies in the Flip 7 card game. Find the "perfect" Flip 7 bot by running thousands of games with different decision-making algorithms.

## Quick Start

```bash
python flip7_simulation.py
```

This will run three experiments with 500 games each:
1. **Bust Probability Strategies**: Bots that hit based on chance of busting (0% to 100%)
2. **Card Count Strategies**: Bots that hit until drawing X number cards (3-7 cards)
3. **Point Threshold Strategies**: Bots that hit until reaching a point threshold (20-80 points)

## Game Rules (Simplified for Simulation)

This simulation implements the core Flip 7 mechanics:

- **Objective**: First to 200 points wins
- **Number Cards**: Values 0-12 (quantity matches value: 12 cards of 12, 11 cards of 11, etc.)
- **Bust**: Drawing a duplicate number card you already have
- **Flip 7**: Getting 7 unique number cards = +15 bonus and round ends
- **Modifiers**: +2, +4, +6, +8, +10 bonuses and x2 multiplier
- **Action Cards**: Second Chance (prevent bust), Flip Three (draw 3 cards), Freeze (not used by bots)
- **Scoring**: Sum numbers → Apply x2 → Add modifiers → Add Flip 7 bonus

## Built-in Bot Strategies

### 1. BustProbabilityStrategy
Hits only if the probability of busting is below a threshold.

```python
BustProbabilityStrategy(0.05)  # Hit if <5% chance of busting
BustProbabilityStrategy(0.50)  # Hit if <50% chance of busting
```

**Use case**: Test how risk tolerance affects win rate

### 2. CardCountStrategy
Hits until collecting a target number of cards.

```python
CardCountStrategy(5)  # Always hit until you have 5 number cards
CardCountStrategy(7)  # Try to get Flip 7 every time
```

**Use case**: Test if going for Flip 7 consistently is optimal

### 3. PointThresholdStrategy
Hits until reaching a target point value.

```python
PointThresholdStrategy(40)  # Hit until score reaches 40
PointThresholdStrategy(60)  # More aggressive, aim for 60
```

**Use case**: Test different risk/reward point targets

### 4. HybridStrategy
Combines multiple decision factors.

```python
HybridStrategy(
    min_cards=3,           # Always hit until 3 cards
    target_points=50,      # Stop at 50 points
    max_bust_prob=0.20     # Or if bust chance >20%
)
```

**Use case**: Fine-tune multi-factor decision making

## Custom Experiments

### Experiment 1: Fine-grained Bust Probability (Your Example)

```python
from flip7_simulation import *

# Test every 5% increment from 0% to 100%
strategies = [BustProbabilityStrategy(i / 100) for i in range(0, 101, 5)]
results = run_simulation(strategies, num_games=1000)
```

### Experiment 2: Optimal Card Count

```python
# Test every card count from 2 to 7
strategies = [CardCountStrategy(i) for i in range(2, 8)]
results = run_simulation(strategies, num_games=1000)
```

### Experiment 3: Point Threshold Sweep

```python
# Test thresholds from 10 to 100 in steps of 5
strategies = [PointThresholdStrategy(i) for i in range(10, 101, 5)]
results = run_simulation(strategies, num_games=1000)
```

### Experiment 4: Hybrid Strategy Optimization

```python
# Test combinations
strategies = []
for min_cards in [2, 3, 4]:
    for target_points in [30, 40, 50, 60]:
        for max_bust in [0.10, 0.20, 0.30]:
            strategies.append(HybridStrategy(min_cards, target_points, max_bust))

results = run_simulation(strategies, num_games=2000)
```

## Creating Your Own Strategy

Subclass `BotStrategy` and implement the `should_hit` method:

```python
class MyCustomStrategy(BotStrategy):
    def __init__(self):
        super().__init__("MyCustomBot")

    def should_hit(self, player: Player, game_state: GameState) -> bool:
        """
        Return True to hit, False to stay.

        Available information:
        - player.get_number_cards(): your number cards
        - player.get_modifier_cards(): your modifiers
        - player.calculate_score(): current score
        - player.has_flip7(): do you have Flip 7?
        - player.has_second_chance: do you have bust protection?
        - game_state.get_active_players(): who's still in the round
        - game_state.deck: remaining cards (list)
        """

        # Example: Hit if score < 45 and we don't have 6+ cards
        num_cards = len(player.get_number_cards())
        score = player.calculate_score()

        if num_cards >= 6:
            return False  # Too risky
        if score >= 45:
            return False  # Good enough
        return True  # Keep hitting
```

Then test it:

```python
my_bot = MyCustomStrategy()
other_bots = [
    BustProbabilityStrategy(0.20),
    CardCountStrategy(5),
    PointThresholdStrategy(50)
]

results = run_simulation([my_bot] + other_bots, num_games=1000)
```

## Advanced Usage

### Verbose Mode (Watch Individual Games)

```python
strategies = [
    BustProbabilityStrategy(0.15),
    CardCountStrategy(5),
    PointThresholdStrategy(45)
]

game = Flip7Game(strategies, verbose=True)
winner = game.play_game()

# This will print:
# - Each player's turn
# - Cards drawn
# - Busts, stays, and Flip 7s
# - Round scores
```

### Extract Detailed Statistics

```python
results = run_simulation(strategies, num_games=1000)

# Access raw data
for strategy_name, wins in results['wins'].items():
    avg_score = results['total_scores'][strategy_name] / results['games_played']
    print(f"{strategy_name}: {wins} wins, avg score {avg_score:.1f}")
```

### Multi-Bot Tournament

```python
# Pit top strategies against each other
finalists = [
    BustProbabilityStrategy(0.20),  # From experiment 1
    CardCountStrategy(5),            # From experiment 2
    PointThresholdStrategy(45),      # From experiment 3
    HybridStrategy(3, 50, 0.20)      # From experiment 4
]

# Run longer tournament
championship = run_simulation(finalists, num_games=10000)
```

## Strategy Insights

Based on initial testing patterns, consider:

1. **Pure Flip 7 chase (CardCount 7)** is often too risky - high bust rate
2. **Very conservative play (BustProb 0%)** is too passive - low scores
3. **Moderate risk (BustProb 15-25%)** tends to balance safety and scoring
4. **Point thresholds (40-55)** work well for consistent performance
5. **Hybrid strategies** can exploit multiple factors for optimization

## Performance Optimization

For faster simulations:

```python
# Run more games with fewer strategies
run_simulation([strategy1, strategy2], num_games=10000)

# Run in parallel (modify code to use multiprocessing)
# See: concurrent.futures.ProcessPoolExecutor
```

## Limitations & Future Enhancements

Current simulation simplifies:
- **No Freeze cards between bots**: Bots don't freeze each other (complex multiplayer interaction)
- **Simplified bust probability**: Doesn't track exact seen cards
- **No adaptive strategies**: Bots don't learn from other players' behavior

Possible additions:
- Track deck composition for exact bust probability
- Implement opponent modeling (aggressive vs conservative)
- Add genetic algorithms to evolve strategies
- Implement Monte Carlo Tree Search for perfect play
- Multi-threaded simulations for speed

## Example Output

```
🎮 Running 500 games with 11 bots...
Strategies: ['BustProb_0%', 'BustProb_10%', ..., 'BustProb_100%']

  Completed 100/500 games...
  Completed 200/500 games...
  ...

============================================================
SIMULATION RESULTS
============================================================

BustProb_0%:
  Wins: 12/500 (2.4%)
  Avg Final Score: 156.3

BustProb_10%:
  Wins: 45/500 (9.0%)
  Avg Final Score: 178.2

BustProb_20%:
  Wins: 98/500 (19.6%)
  Avg Final Score: 203.4

...

🏆 BEST STRATEGY: BustProb_20% with 98 wins
============================================================
```

## Questions & Contributions

This simulator is designed to help find the optimal Flip 7 bot. Experiment freely and share interesting findings!

Key questions to explore:
- What's the optimal bust probability threshold?
- Does chasing Flip 7 pay off in the long run?
- Are hybrid strategies better than single-factor strategies?
- How does player count affect optimal strategy?
- Can you build a bot that adapts to opponents?

Happy simulating! 🎲
