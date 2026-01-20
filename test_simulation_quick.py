"""Quick test of the simulation to verify it works"""

from flip7_simulation import *

# Small quick test
print("Running quick test with 5 strategies, 100 games each...\n")

test_strategies = [
    BustProbabilityStrategy(0.15),
    BustProbabilityStrategy(0.25),
    CardCountStrategy(5),
    PointThresholdStrategy(45),
    HybridStrategy(3, 50, 0.20)
]

results = run_simulation(test_strategies, num_games=100, export_to_excel=True, filename="quick_test.xlsx")

print("\n✅ Test completed successfully!")
print(f"📊 Results saved to: quick_test.xlsx")
