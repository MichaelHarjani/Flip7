# How to Run Flip 7 Simulations

## ✅ Verification - Quick Test (Already Completed!)

A quick test was run successfully with these results:

```
5 strategies, 100 games:
🏆 WINNER: BustProb_25% with 35% win rate
```

Output file: `quick_test.xlsx` ✓

---

## 🚀 Running Full Simulations

### Option 1: Run All Experiments (Comprehensive)

This runs 4 complete experiments and generates 4 Excel files:

```bash
python3 flip7_simulation.py
```

**What it does:**
1. **Experiment 1**: Tests 21 bust probability strategies (0% to 100% in 5% increments) - 500 games each
2. **Experiment 2**: Tests 6 card count strategies (2-7 cards) - 1000 games each
3. **Experiment 3**: Tests 13 point threshold strategies (20-80 points) - 500 games each
4. **Experiment 4**: Championship with 8 top strategies - 2000 games head-to-head

**Output Files:**
- `experiment1_bust_probability.xlsx`
- `experiment2_card_count.xlsx`
- `experiment3_point_threshold.xlsx`
- `experiment4_championship.xlsx`

**Estimated Time:** 30-60 minutes (depending on your machine)

---

### Option 2: Run Individual Experiments

Edit `flip7_simulation.py` and comment out experiments you don't want:

```python
if __name__ == "__main__":
    # Experiment 1: Bust probability (KEEP THIS ONE)
    bust_strategies = [BustProbabilityStrategy(i / 100) for i in range(0, 101, 5)]
    run_comprehensive_experiment(
        bust_strategies,
        "EXPERIMENT 1: Bust Probability Strategies (0% to 100%)",
        "experiment1_bust_probability.xlsx",
        games_per_matchup=500
    )

    # # Experiment 2: Card count (COMMENTED OUT)
    # card_count_strategies = [CardCountStrategy(i) for i in range(2, 8)]
    # run_comprehensive_experiment(...)

    # ... comment out others
```

Then run:
```bash
python3 flip7_simulation.py
```

---

### Option 3: Custom Python Script

Create your own script (like `test_simulation_quick.py`):

```python
from flip7_simulation import *

# Your custom experiment
my_strategies = [
    BustProbabilityStrategy(0.10),
    BustProbabilityStrategy(0.20),
    BustProbabilityStrategy(0.30),
    CardCountStrategy(5),
    PointThresholdStrategy(50)
]

# Run simulation
results = run_simulation(
    my_strategies,
    num_games=1000,
    export_to_excel=True,
    filename="my_custom_experiment.xlsx"
)
```

Then run:
```bash
python3 your_script_name.py
```

---

## 📊 Understanding Excel Output

Each Excel file contains multiple sheets:

### Sheet 1: "Results"
Main results sorted by wins:

| Column | Description |
|--------|-------------|
| Strategy | Bot strategy name |
| Wins | Number of games won |
| Win_Rate_% | Percentage of games won |
| Avg_Final_Score | Average score at game end |
| Avg_Rounds_to_Win | Average number of rounds per win |
| Total_Busts | Total times this bot busted |
| Flip7_Count | Number of Flip 7s achieved |
| Bust_Rate_% | Percentage of games where bot busted |

### Sheet 2: "Summary"
Quick overview with best strategy

### Sheet 3: "By_Win_Rate"
Results sorted by win rate (useful for ties)

### Sheet 4: "By_Avg_Score"
Results sorted by average score

---

## 🎯 Recommended Experiments to Answer Your Questions

### Question 1: "What's the optimal bust probability threshold?"

**Run:**
```python
# Fine-grained test every 1%
strategies = [BustProbabilityStrategy(i / 100) for i in range(0, 101, 1)]
run_comprehensive_experiment(strategies, "Bust Prob Fine-Grained", "bust_1percent.xlsx", 500)
```

**Look for:** The strategy with highest win rate in the Excel file

---

### Question 2: "Should bots aim for Flip 7?"

**Run:**
```python
strategies = [
    CardCountStrategy(4),  # Conservative - stop at 4 cards
    CardCountStrategy(5),  # Moderate
    CardCountStrategy(6),  # Aggressive - almost Flip 7
    CardCountStrategy(7),  # Always go for Flip 7
]
run_simulation(strategies, 2000, True, "flip7_chase.xlsx")
```

**Look for:** Win rate vs bust rate trade-off

---

### Question 3: "What's the best point threshold?"

**Run:**
```python
strategies = [PointThresholdStrategy(i) for i in range(30, 71, 2)]
run_comprehensive_experiment(strategies, "Point Threshold Fine", "points_fine.xlsx", 500)
```

**Look for:** Optimal balance between reaching target and avoiding busts

---

### Question 4: "Can hybrid strategies beat single-factor strategies?"

**Run:**
```python
# Test hybrid combinations
strategies = []
for min_cards in [2, 3, 4]:
    for target_points in [40, 45, 50, 55]:
        for max_bust in [0.15, 0.20, 0.25, 0.30]:
            strategies.append(HybridStrategy(min_cards, target_points, max_bust))

# Add best single-factor strategies for comparison
strategies.extend([
    BustProbabilityStrategy(0.20),
    CardCountStrategy(5),
    PointThresholdStrategy(50)
])

run_comprehensive_experiment(strategies, "Hybrid vs Single", "hybrid_test.xlsx", 300)
```

**Look for:** Do any hybrid strategies beat the single-factor champions?

---

## 🔧 Troubleshooting

### Issue: "No module named 'pandas'"

**Solution:**
```bash
pip3 install pandas openpyxl
```

### Issue: "ModuleNotFoundError: No module named 'openpyxl'"

**Solution:**
```bash
pip3 install openpyxl
```

### Issue: Simulation runs very slowly

**Solutions:**
1. Reduce `num_games` or `games_per_matchup`
2. Test fewer strategies at once
3. Use `verbose=False` (already default)

### Issue: Want to see what's happening in games

**Solution:**
```python
game = Flip7Game([BustProbabilityStrategy(0.25)], verbose=True)
winner = game.play_game()
```

This shows every turn, card drawn, bust, etc.

---

## 📈 Analyzing Results

### Best Practices

1. **Sort by Win Rate** - Primary metric for success
2. **Check Bust Rate** - High bust rate = too aggressive
3. **Look at Avg Score** - Consistency indicator
4. **Consider Avg Rounds** - Efficiency metric

### Example Analysis

```
Strategy A: 40% win rate, 200 avg score, 30% bust rate
Strategy B: 38% win rate, 195 avg score, 15% bust rate

Conclusion: Strategy A wins more but busts more often.
            Strategy B is more consistent.
            Choice depends on risk tolerance.
```

### Red Flags

- **Very low win rate + high bust rate** = Too aggressive
- **Very low win rate + low score** = Too conservative
- **High wins but 50+ rounds per game** = Inefficient
- **Busting >40% of the time** = Needs retuning

---

## 🎲 Advanced: Creating Your Own Strategy

```python
class MySmartStrategy(BotStrategy):
    def __init__(self):
        super().__init__("MySmartBot")

    def should_hit(self, player: Player, game_state: GameState) -> bool:
        """
        Custom decision logic
        """
        num_cards = len(player.get_number_cards())
        score = player.calculate_score()

        # Example: Adaptive strategy based on game state

        # Early game: aggressive (try to build score)
        if num_cards < 4:
            return True

        # Late game: conservative (protect lead)
        if score >= 60:
            return False

        # Mid game: calculate bust probability
        my_numbers = set(player.get_number_values())
        bust_prob = sum(my_numbers) / 78.0  # 78 = sum(0..12)

        # Factor in Second Chance protection
        if player.has_second_chance:
            bust_prob *= 0.5  # Half as risky with protection

        # Hit if bust chance < 25%
        return bust_prob < 0.25

# Test it
test_strategies = [
    MySmartStrategy(),
    BustProbabilityStrategy(0.25),
    CardCountStrategy(5)
]
run_simulation(test_strategies, 500, True, "my_bot_test.xlsx")
```

---

## 💡 Pro Tips

1. **Start Small** - Run 100 games first to verify your setup
2. **Use Meaningful Names** - Name files clearly (e.g., `bust_0to100_1000games.xlsx`)
3. **Save Your Scripts** - Keep custom experiments for later comparison
4. **Check the Data** - Open Excel files to verify results make sense
5. **Iterate** - Use results to refine strategies and test again

---

## 🏆 Goal: Finding the Perfect Bot

The "perfect" bot likely:
- Balances risk and reward
- Adapts to game state
- Has 30-45% win rate (in 4-player games)
- Busts <25% of the time
- Scores 180-220 average

**Your mission:** Run experiments, analyze data, find optimal parameters!

---

Good luck! 🎮
