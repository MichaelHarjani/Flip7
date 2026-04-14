# Achievements

32 achievements total: 20 regular + 12 anti. Extracted from `app_spec.txt` §4.

Seed data lives in `db/seeds/achievements.yml` (created in Phase 3).

## Regular Achievements (20)

| Key | Name | Description | Category | Rarity | Tier |
|-----|------|-------------|----------|--------|------|
| flip7_first | Flip 7 | Achieve a Flip 7 | flip7 | epic | — |
| flip7_5 | Flip Master | Achieve Flip 7 five times | flip7 | epic | 5 |
| flip7_10 | Flip Legend | Achieve Flip 7 ten times | flip7 | legendary | 10 |
| flip7_25 | Flip Deity | Achieve Flip 7 twenty-five times | flip7 | legendary | 25 |
| flip7_50 | Flip Prophet | Achieve Flip 7 fifty times | flip7 | legendary | 50 |
| flip7_100 | Flip God | Achieve Flip 7 one hundred times | flip7 | legendary | 100 |
| calculated_risk | Calculated Risk | Win with exactly 200 cumulative points | strategic | legendary | — |
| high_roller_50 | High Roller | Score 50+ points in a single round | score | common | — |
| high_roller_75 | Big Spender | Score 75+ points in a single round | score | rare | — |
| high_roller_100 | Jackpot | Score 100+ points in a single round | score | epic | — |
| zero_hero | Zero Hero | Win a round with a 0 card in your hand | risk | rare | — |
| extra_life | Extra Life | Achieve Flip 7 with an unused Second Chance | flip7 | legendary | — |
| ice_cold | Ice Cold | Freeze someone within 10 points of winning, then win | strategic | epic | — |
| higher_score | Higher Score | Win when another player has exceeded 200 points | strategic | rare | — |
| david_vs_goliath | David vs Goliath | Win a game despite an opponent being 50+ points ahead | strategic | epic | — |
| speed_run | Speed Run | Win a game in 5 or fewer rounds | strategic | rare | — |
| action_taker | Action Taker | Draw all 3 action card types in one round | special | epic | — |
| second_chance_saver | Second Chance Saver | Use a Second Chance to avoid a bust | special | common | — |
| threes_company | Three's Company | Survive all three cards from a Flip Three | special | rare | — |
| sweep | Sweep | Win 3 consecutive rounds | strategic | epic | — |

## Anti-Achievements (12)

| Key | Name | Description | Category | Rarity |
|-----|------|-------------|----------|--------|
| the_repeater | The Repeater | Bust by drawing a duplicate number card | anti | common |
| zero_points | Zero Points | Bust in the very first round of a game | anti | common |
| zero_trust | Zero Trust | Draw a 0 and immediately bust on the next card | anti | rare |
| second_life_lost | Second Life Lost | Draw a Second Chance and bust on the very next card | anti | epic |
| glutton | Glutton | Bust while holding 50+ points in your hand | anti | rare |
| flip_three_flop | Flip Three Flop | Bust during a forced Flip Three draw | anti | rare |
| risky_business | Risky Business | Draw 5+ cards successfully then bust | anti | rare |
| modifier_misstep | Modifier Misstep | Bust while holding the ×2 multiplier | anti | rare |
| freeze_dried | Freeze Dried | Get Frozen while within 10 points of winning | anti | epic |
| so_close | So Close | Bust while holding 190+ cumulative points | anti | epic |
| flip_flop | Flip Flop | Get 6 unique number cards then bust on the 7th draw | anti | epic |
| all_in_all_out | All In, All Out | Bust with 80+ points worth of cards in hand | anti | epic |

## Evaluation

Achievements are checked at two points:
- **End of each round:** round-specific achievements (Flip 7, High Roller, busts, action card achievements)
- **End of each game:** game-specific achievements (Calculated Risk, Speed Run, David vs Goliath)

The `AchievementEvaluator` service receives the full game state and round results, checks all uncompleted achievements for the player, and creates/updates `UserAchievement` records. New unlocks are broadcast to the player via Action Cable for toast notifications.

## Tiered achievements

The `flip7_*` series uses `parent_key` to chain tiers:
- `flip7_first` → `flip7_5` → `flip7_10` → `flip7_25` → `flip7_50` → `flip7_100`

The evaluator increments `user_achievements.progress` on each Flip 7 and unlocks tiers when `progress >= tier_target`.
