"""
Flip 7 Game Simulation for Bot Strategy Testing

This simulation recreates the Flip 7 card game to test different bot strategies.
Goal: Find the optimal decision-making strategy for winning.
"""

import random
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from collections import Counter
import copy
from datetime import datetime
import pandas as pd


class CardType(Enum):
    NUMBER = "number"
    ACTION = "action"
    MODIFIER = "modifier"


class ActionType(Enum):
    FREEZE = "freeze"
    FLIP_THREE = "flipThree"
    SECOND_CHANCE = "secondChance"


class ModifierType(Enum):
    ADD = "add"
    MULTIPLY = "multiply"


@dataclass
class Card:
    """Represents a single card in Flip 7"""
    id: str
    card_type: CardType
    value: Optional[int] = None  # 0-12 for number cards
    action_type: Optional[ActionType] = None
    modifier_type: Optional[ModifierType] = None
    modifier_value: Optional[int] = None  # For +2, +4, etc or x2

    def __repr__(self):
        if self.card_type == CardType.NUMBER:
            return f"[{self.value}]"
        elif self.card_type == CardType.MODIFIER:
            if self.modifier_type == ModifierType.MULTIPLY:
                return f"[x{self.modifier_value}]"
            else:
                return f"[+{self.modifier_value}]"
        else:
            return f"[{self.action_type.value}]"


@dataclass
class Player:
    """Represents a player in the game"""
    id: str
    name: str
    cards: List[Card] = field(default_factory=list)
    score: int = 0  # Total score across all rounds
    round_score: int = 0  # Score for current round
    is_active: bool = True
    has_busted: bool = False
    has_second_chance: bool = False
    has_flip_three_active: bool = False
    frozen_by: Optional[str] = None

    def get_number_cards(self) -> List[Card]:
        return [c for c in self.cards if c.card_type == CardType.NUMBER]

    def get_modifier_cards(self) -> List[Card]:
        return [c for c in self.cards if c.card_type == CardType.MODIFIER]

    def get_action_cards(self) -> List[Card]:
        return [c for c in self.cards if c.card_type == CardType.ACTION]

    def get_number_values(self) -> List[int]:
        return [c.value for c in self.get_number_cards()]

    def calculate_score(self, is_flip7: bool = False) -> int:
        """Calculate current hand score following Flip 7 rules"""
        # 1. Sum number cards
        total = sum(self.get_number_values())

        # 2. Apply x2 multiplier if present
        for card in self.get_modifier_cards():
            if card.modifier_type == ModifierType.MULTIPLY:
                total *= card.modifier_value

        # 3. Add modifier bonuses
        for card in self.get_modifier_cards():
            if card.modifier_type == ModifierType.ADD:
                total += card.modifier_value

        # 4. Add Flip 7 bonus
        if is_flip7:
            total += 15

        return total

    def has_flip7(self) -> bool:
        """Check if player has 7 unique number cards"""
        return len(set(self.get_number_values())) == 7

    def would_bust(self, new_card: Card) -> bool:
        """Check if drawing this card would cause a bust"""
        if new_card.card_type != CardType.NUMBER:
            return False
        return new_card.value in self.get_number_values()


def create_deck(num_players: int = 4) -> List[Card]:
    """Create a Flip 7 deck (scales with player count: 1 deck per 3 players for simulations)"""
    # For simulations with conservative bots that rarely stay, use generous deck scaling
    num_decks = max(2, (num_players + 2) // 3)
    deck = []
    card_id = 0

    for _ in range(num_decks):
        # Number cards: 0-12, with quantity matching the value
        for value in range(13):
            for _ in range(value if value > 0 else 1):
                deck.append(Card(
                    id=f"card_{card_id}",
                    card_type=CardType.NUMBER,
                    value=value
                ))
                card_id += 1

        # Modifier cards
        for mod_value in [2, 4, 6, 8, 10]:
            for _ in range(3):
                deck.append(Card(
                    id=f"card_{card_id}",
                    card_type=CardType.MODIFIER,
                    modifier_type=ModifierType.ADD,
                    modifier_value=mod_value
                ))
                card_id += 1

        # x2 multiplier (1 copy)
        deck.append(Card(
            id=f"card_{card_id}",
            card_type=CardType.MODIFIER,
            modifier_type=ModifierType.MULTIPLY,
            modifier_value=2
        ))
        card_id += 1

        # Action cards (3 of each type)
        for action in ActionType:
            for _ in range(3):
                deck.append(Card(
                    id=f"card_{card_id}",
                    card_type=CardType.ACTION,
                    action_type=action
                ))
                card_id += 1

    random.shuffle(deck)
    return deck


@dataclass
class GameState:
    """Represents the complete game state"""
    players: List[Player]
    deck: List[Card]
    discard_pile: List[Card] = field(default_factory=list)
    current_player_idx: int = 0
    dealer_idx: int = 0
    round_number: int = 0
    game_over: bool = False
    winner: Optional[Player] = None

    def get_active_players(self) -> List[Player]:
        return [p for p in self.players if p.is_active]

    def get_current_player(self) -> Player:
        return self.players[self.current_player_idx]

    def next_player(self):
        """Move to next active player"""
        start_idx = self.current_player_idx
        while True:
            self.current_player_idx = (self.current_player_idx + 1) % len(self.players)
            if self.players[self.current_player_idx].is_active:
                break
            # If we've looped back, round is over
            if self.current_player_idx == start_idx:
                break

    def draw_card(self) -> Card:
        """Draw a card from deck, reshuffling if needed"""
        if not self.deck:
            # Reshuffle discard pile (excluding cards in players' hands)
            if self.discard_pile:
                self.deck = self.discard_pile.copy()
                self.discard_pile.clear()
                random.shuffle(self.deck)

        if not self.deck:
            # Emergency: If still no cards, create more
            # This can happen in simulations with conservative strategies or many rounds
            # Silently create mini-deck to continue
            mini_deck = []
            card_id = random.randint(10000, 99999)  # Random ID to avoid conflicts
            for value in range(13):
                for _ in range(max(1, value // 2)):  # Fewer cards than full deck
                    mini_deck.append(Card(
                        id=f"em_{card_id}",
                        card_type=CardType.NUMBER,
                        value=value
                    ))
                    card_id += 1
            random.shuffle(mini_deck)
            self.deck = mini_deck

        return self.deck.pop()


class BotStrategy:
    """Base class for bot decision-making strategies"""

    def __init__(self, name: str):
        self.name = name

    def should_hit(self, player: Player, game_state: GameState) -> bool:
        """Decide whether to hit or stay. Override in subclasses."""
        raise NotImplementedError

    def __repr__(self):
        return self.name


class BustProbabilityStrategy(BotStrategy):
    """Bot that hits based on bust probability threshold"""

    def __init__(self, max_bust_probability: float, second_chance_aware: bool = False):
        """
        Args:
            max_bust_probability: Hit if bust chance is below this (0.0 to 1.0)
                                 e.g., 0.05 means hit if <5% chance of busting
            second_chance_aware: If True, be more aggressive when protected
        """
        self.max_bust_prob = max_bust_probability
        self.second_chance_aware = second_chance_aware
        suffix = "_SC" if second_chance_aware else ""
        super().__init__(f"BustProb_{int(max_bust_probability*100)}%{suffix}")

    def should_hit(self, player: Player, game_state: GameState) -> bool:
        """Calculate bust probability and decide"""
        # Count cards in deck that would bust us
        my_numbers = set(player.get_number_values())

        # Estimate remaining deck composition
        # In real game, we'd track seen cards - for now use simple estimate
        total_deck_size = len(game_state.deck) + len(game_state.discard_pile)
        if total_deck_size == 0:
            return False  # Can't draw, must stay

        # Count how many cards would bust (duplicates of our numbers)
        # Rough estimate: assume uniform distribution
        # Each number 0-12 appears proportionally to its value
        total_number_cards = sum(range(13))  # 0+1+2+...+12 = 78 per deck
        bust_cards = sum(my_numbers)  # Cards that would bust us

        # Bust probability = bust_cards / total_number_cards
        bust_prob = bust_cards / total_number_cards if total_number_cards > 0 else 0

        # If Second Chance aware and we have protection, use higher threshold
        effective_threshold = self.max_bust_prob
        if self.second_chance_aware and player.has_second_chance:
            # With Second Chance, we can afford 2x the risk (one free bust)
            effective_threshold = min(1.0, self.max_bust_prob * 2.0)

        return bust_prob <= effective_threshold


class CardCountStrategy(BotStrategy):
    """Bot that hits until drawing X number cards"""

    def __init__(self, target_card_count: int, second_chance_aware: bool = False):
        self.target_count = target_card_count
        self.second_chance_aware = second_chance_aware
        suffix = "_SC" if second_chance_aware else ""
        super().__init__(f"CardCount_{target_card_count}{suffix}")

    def should_hit(self, player: Player, game_state: GameState) -> bool:
        num_cards = len(player.get_number_cards())

        # If Second Chance aware and we have protection, go for one more card
        effective_target = self.target_count
        if self.second_chance_aware and player.has_second_chance:
            effective_target = self.target_count + 1

        return num_cards < effective_target


class PointThresholdStrategy(BotStrategy):
    """Bot that hits until reaching a point threshold"""

    def __init__(self, target_points: int):
        self.target_points = target_points
        super().__init__(f"PointThreshold_{target_points}")

    def should_hit(self, player: Player, game_state: GameState) -> bool:
        current_score = player.calculate_score()
        return current_score < self.target_points


class HybridStrategy(BotStrategy):
    """Combines multiple strategies"""

    def __init__(self, min_cards: int, target_points: int, max_bust_prob: float, second_chance_aware: bool = False):
        self.min_cards = min_cards
        self.target_points = target_points
        self.max_bust_prob = max_bust_prob
        self.second_chance_aware = second_chance_aware
        suffix = "_SC" if second_chance_aware else ""
        super().__init__(f"Hybrid_C{min_cards}_P{target_points}_B{int(max_bust_prob*100)}%{suffix}")

    def should_hit(self, player: Player, game_state: GameState) -> bool:
        num_cards = len(player.get_number_cards())
        current_score = player.calculate_score()

        # Always hit if below minimum cards
        if num_cards < self.min_cards:
            return True

        # Stop if we've reached target points (unless we have Second Chance and are close)
        if current_score >= self.target_points:
            # With Second Chance, we can push for 10 more points
            if self.second_chance_aware and player.has_second_chance and current_score < self.target_points + 10:
                pass  # Keep going
            else:
                return False

        # Otherwise check bust probability
        my_numbers = set(player.get_number_values())
        total_number_cards = sum(range(13))
        bust_cards = sum(my_numbers)
        bust_prob = bust_cards / total_number_cards if total_number_cards > 0 else 0

        # Adjust threshold if we have Second Chance
        effective_threshold = self.max_bust_prob
        if self.second_chance_aware and player.has_second_chance:
            effective_threshold = min(1.0, self.max_bust_prob * 2.0)

        return bust_prob <= effective_threshold


class UltimateAdaptiveStrategy(BotStrategy):
    """
    The ultimate Flip 7 strategy that adapts to all game conditions:
    - Player count (more aggressive with more players)
    - Second Chance availability
    - Current position in game
    - Opponent status
    """

    def __init__(self):
        super().__init__("Ultimate_Adaptive")

    def should_hit(self, player: Player, game_state: GameState) -> bool:
        num_cards = len(player.get_number_cards())
        current_score = player.calculate_score()
        num_players = len(game_state.players)
        active_players = len(game_state.get_active_players())

        # Calculate bust probability
        my_numbers = set(player.get_number_values())
        total_number_cards = sum(range(13))
        bust_cards = sum(my_numbers)
        bust_prob = bust_cards / total_number_cards if total_number_cards > 0 else 0

        # Adjust strategy based on player count
        # More players = need higher scores = more aggressive
        base_bust_tolerance = 0.20 + (num_players - 2) * 0.02  # 20% for 2 players, 28% for 6 players
        point_target = 40 + num_players * 2  # 44 for 2 players, 52 for 6 players
        min_cards = 3

        # Double risk tolerance with Second Chance
        if player.has_second_chance:
            base_bust_tolerance = min(1.0, base_bust_tolerance * 2.0)
            point_target += 10  # Push harder with protection

        # Always hit if below minimum cards
        if num_cards < min_cards:
            return True

        # If we're close to Flip 7 (6 cards) and have Second Chance, go for it
        if num_cards == 6 and player.has_second_chance:
            return True

        # Stop if we've reached target points
        if current_score >= point_target:
            # Unless we have Second Chance and can push for more
            if player.has_second_chance and current_score < point_target + 15:
                # But only if bust probability is reasonable
                return bust_prob <= base_bust_tolerance
            return False

        # Adapt to game state: if many players busted, be more conservative
        if active_players <= num_players / 2:
            base_bust_tolerance *= 0.8  # Reduce risk when others are dropping

        # Make decision based on adjusted bust tolerance
        return bust_prob <= base_bust_tolerance


class Flip7Game:
    """Main game engine for Flip 7"""

    def __init__(self, strategies: List[BotStrategy], verbose: bool = False):
        self.strategies = strategies
        self.verbose = verbose
        self.game_state: Optional[GameState] = None

    def initialize_game(self) -> GameState:
        """Start a new game"""
        players = []
        for i, strategy in enumerate(self.strategies):
            players.append(Player(
                id=f"player_{i}",
                name=f"{strategy.name}",
                cards=[],
                score=0
            ))

        deck = create_deck(len(players))
        self.game_state = GameState(
            players=players,
            deck=deck,
            current_player_idx=1 % len(players),  # First after dealer
            dealer_idx=0,
            round_number=1
        )

        return self.game_state

    def deal_initial_cards(self):
        """Deal one card to each player at round start"""
        for player in self.game_state.players:
            card = self.game_state.draw_card()
            player.cards.append(card)

            # Handle action cards drawn initially
            if card.card_type == CardType.ACTION:
                if card.action_type == ActionType.SECOND_CHANCE:
                    player.has_second_chance = True
                elif card.action_type == ActionType.FLIP_THREE:
                    player.has_flip_three_active = True

    def play_turn(self, player: Player, strategy: BotStrategy) -> bool:
        """
        Execute one player's turn.
        Returns True if round continues, False if round ends.
        """
        if not player.is_active:
            return True

        # Check for Flip 7 before turn
        if player.has_flip7():
            player.round_score = player.calculate_score(is_flip7=True)
            player.is_active = False
            if self.verbose:
                print(f"  {player.name} achieved FLIP 7! Score: {player.round_score}")
            return False  # Round ends

        # Safety: If player has 10+ cards, force them to stay (prevent infinite loops)
        if len(player.get_number_cards()) >= 10:
            player.round_score = player.calculate_score()
            player.is_active = False
            if self.verbose:
                print(f"  {player.name} forced to STAY (10+ cards) with {player.round_score} points")
            return True

        # Bot decides: hit or stay
        should_hit = strategy.should_hit(player, self.game_state)

        if not should_hit:
            # Stay: bank score
            player.round_score = player.calculate_score()
            player.is_active = False
            if self.verbose:
                print(f"  {player.name} STAYS with {player.round_score} points")
            return True

        # Hit: draw card(s)
        num_cards = 3 if player.has_flip_three_active else 1
        if self.verbose:
            print(f"  {player.name} HITS (drawing {num_cards} card(s))", end="")

        for i in range(num_cards):
            card = self.game_state.draw_card()

            # Check for bust
            if player.would_bust(card):
                if player.has_second_chance:
                    # Use second chance
                    player.has_second_chance = False
                    self.game_state.discard_pile.append(card)
                    if self.verbose:
                        print(f" drew {card} (SECOND CHANCE USED!)", end="")
                    continue
                else:
                    # Bust!
                    player.has_busted = True
                    player.is_active = False
                    player.round_score = 0
                    if self.verbose:
                        print(f" drew {card} - BUST!")
                    return True

            # Add card to hand
            player.cards.append(card)

            # Handle action cards
            if card.card_type == CardType.ACTION:
                if card.action_type == ActionType.SECOND_CHANCE:
                    player.has_second_chance = True
                elif card.action_type == ActionType.FLIP_THREE:
                    player.has_flip_three_active = True

            if self.verbose:
                print(f" {card}", end="")

        if self.verbose:
            current = player.calculate_score()
            print(f" (score: {current})")

        # Check for Flip 7 after drawing
        if player.has_flip7():
            player.round_score = player.calculate_score(is_flip7=True)
            player.is_active = False
            if self.verbose:
                print(f"  {player.name} achieved FLIP 7! Score: {player.round_score}")
            return False  # Round ends

        # Reset flip three after use
        if num_cards == 3:
            player.has_flip_three_active = False

        return True

    def play_round(self):
        """Play one complete round"""
        if self.verbose:
            print(f"\n=== ROUND {self.game_state.round_number} ===")
            print(f"Dealer: {self.game_state.players[self.game_state.dealer_idx].name}")

        # Reset players for new round
        for player in self.game_state.players:
            player.cards = []
            player.is_active = True
            player.has_busted = False
            player.has_second_chance = False
            player.has_flip_three_active = False
            player.round_score = 0

        # Deal initial cards
        self.deal_initial_cards()

        # Play turns until round ends
        max_turns = 100  # Safety limit
        turn_count = 0

        while any(p.is_active for p in self.game_state.players) and turn_count < max_turns:
            player = self.game_state.get_current_player()
            strategy = self.strategies[self.game_state.current_player_idx]

            round_continues = self.play_turn(player, strategy)

            if not round_continues:
                break

            self.game_state.next_player()
            turn_count += 1

        # Add round scores to total scores
        for player in self.game_state.players:
            player.score += player.round_score
            if self.verbose:
                print(f"{player.name}: +{player.round_score} (Total: {player.score})")

    def play_game(self) -> Player:
        """Play a complete game to 200 points"""
        self.initialize_game()

        while not self.game_state.game_over:
            self.play_round()

            # Check for winner
            for player in self.game_state.players:
                if player.score >= 200:
                    self.game_state.game_over = True
                    self.game_state.winner = player
                    if self.verbose:
                        print(f"\n🏆 {player.name} WINS with {player.score} points!")
                    return player

            # Next round
            self.game_state.round_number += 1
            self.game_state.dealer_idx = (self.game_state.dealer_idx + 1) % len(self.game_state.players)
            self.game_state.current_player_idx = (self.game_state.dealer_idx + 1) % len(self.game_state.players)

        return self.game_state.winner


def run_simulation(strategies: List[BotStrategy], num_games: int = 1000, export_to_excel: bool = False, filename: str = None) -> Dict:
    """
    Run multiple games and collect statistics.

    Args:
        strategies: List of bot strategies to test
        num_games: Number of games to simulate
        export_to_excel: If True, export results to Excel file
        filename: Custom filename for Excel export (optional)

    Returns:
        Dictionary with win counts, average scores, etc.
    """
    results = {
        'wins': Counter(),
        'total_scores': Counter(),
        'games_played': num_games,
        'bust_counts': Counter(),
        'flip7_counts': Counter(),
        'avg_rounds_per_game': Counter()
    }

    print(f"\n🎮 Running {num_games} games with {len(strategies)} bots...")
    print(f"Strategies: {[s.name for s in strategies]}\n")

    for game_num in range(num_games):
        if (game_num + 1) % 100 == 0:
            print(f"  Completed {game_num + 1}/{num_games} games...")

        game = Flip7Game(strategies, verbose=False)
        winner = game.play_game()

        results['wins'][winner.name] += 1
        results['avg_rounds_per_game'][winner.name] += game.game_state.round_number

        for player in game.game_state.players:
            results['total_scores'][player.name] += player.score
            if player.has_busted:
                results['bust_counts'][player.name] += 1
            if player.has_flip7():
                results['flip7_counts'][player.name] += 1

    # Calculate statistics
    print("\n" + "="*60)
    print("SIMULATION RESULTS")
    print("="*60)

    stats_data = []
    for strategy in strategies:
        wins = results['wins'][strategy.name]
        win_rate = (wins / num_games) * 100
        avg_score = results['total_scores'][strategy.name] / num_games
        avg_rounds = results['avg_rounds_per_game'][strategy.name] / max(wins, 1)
        bust_count = results['bust_counts'][strategy.name]
        flip7_count = results['flip7_counts'][strategy.name]

        print(f"\n{strategy.name}:")
        print(f"  Wins: {wins}/{num_games} ({win_rate:.1f}%)")
        print(f"  Avg Final Score: {avg_score:.1f}")
        print(f"  Avg Rounds to Win: {avg_rounds:.1f}")
        print(f"  Total Busts: {bust_count}")
        print(f"  Flip 7s Achieved: {flip7_count}")

        stats_data.append({
            'Strategy': strategy.name,
            'Wins': wins,
            'Win_Rate_%': round(win_rate, 2),
            'Avg_Final_Score': round(avg_score, 1),
            'Avg_Rounds_to_Win': round(avg_rounds, 1),
            'Total_Busts': bust_count,
            'Flip7_Count': flip7_count,
            'Bust_Rate_%': round((bust_count / (num_games * len(strategies))) * 100, 2)
        })

    # Find best strategy
    best_strategy = max(results['wins'].items(), key=lambda x: x[1])
    print(f"\n🏆 BEST STRATEGY: {best_strategy[0]} with {best_strategy[1]} wins")
    print("="*60)

    # Export to Excel if requested
    if export_to_excel:
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"flip7_results_{timestamp}.xlsx"

        df = pd.DataFrame(stats_data)
        df = df.sort_values('Wins', ascending=False)

        with pd.ExcelWriter(filename, engine='openpyxl') as writer:
            # Main results sheet
            df.to_excel(writer, sheet_name='Results', index=False)

            # Summary sheet
            summary_data = {
                'Metric': ['Total Games', 'Number of Strategies', 'Best Strategy', 'Best Win Count', 'Best Win Rate %'],
                'Value': [
                    num_games,
                    len(strategies),
                    best_strategy[0],
                    best_strategy[1],
                    round((best_strategy[1] / num_games) * 100, 2)
                ]
            }
            pd.DataFrame(summary_data).to_excel(writer, sheet_name='Summary', index=False)

            # Detailed comparison sheet (sorted by different metrics)
            df_by_winrate = df.sort_values('Win_Rate_%', ascending=False)
            df_by_winrate.to_excel(writer, sheet_name='By_Win_Rate', index=False)

            df_by_score = df.sort_values('Avg_Final_Score', ascending=False)
            df_by_score.to_excel(writer, sheet_name='By_Avg_Score', index=False)

        print(f"\n📊 Results exported to: {filename}")

    results['stats_dataframe'] = pd.DataFrame(stats_data)
    return results


def run_comprehensive_experiment(all_strategies: List[BotStrategy], experiment_name: str, filename: str, games_per_matchup: int = 500):
    """
    Run round-robin style experiment where each strategy plays against others in smaller groups.
    This avoids deck exhaustion issues with too many players.
    """
    print(f"\n{'='*60}")
    print(f"{experiment_name}")
    print(f"Testing {len(all_strategies)} strategies in 4-player games")
    print(f"{'='*60}\n")

    all_results = []

    # Each strategy plays in multiple 4-player games against different opponents
    for i, strategy in enumerate(all_strategies):
        print(f"Testing {strategy.name} ({i+1}/{len(all_strategies)})...")

        # Create several different opponent groups
        win_count = 0
        total_score = 0
        bust_count = 0
        flip7_count = 0

        for game_num in range(games_per_matchup):
            # Randomly select 3 other strategies as opponents
            opponents = random.sample([s for s in all_strategies if s != strategy], min(3, len(all_strategies)-1))
            game_strategies = [strategy] + opponents

            game = Flip7Game(game_strategies, verbose=False)
            winner = game.play_game()

            if winner.id == 'player_0':  # Our test strategy is always player_0
                win_count += 1

            # Get stats for our test player
            test_player = game.game_state.players[0]
            total_score += test_player.score
            if test_player.has_busted:
                bust_count += 1
            if test_player.has_flip7():
                flip7_count += 1

        win_rate = (win_count / games_per_matchup) * 100
        avg_score = total_score / games_per_matchup

        all_results.append({
            'Strategy': strategy.name,
            'Wins': win_count,
            'Games': games_per_matchup,
            'Win_Rate_%': round(win_rate, 2),
            'Avg_Final_Score': round(avg_score, 1),
            'Total_Busts': bust_count,
            'Flip7_Count': flip7_count,
            'Bust_Rate_%': round((bust_count / games_per_matchup) * 100, 2)
        })

    # Create DataFrame and export
    df = pd.DataFrame(all_results)
    df = df.sort_values('Win_Rate_%', ascending=False)

    # Print results
    print(f"\n{'='*60}")
    print(f"RESULTS FOR {experiment_name}")
    print(f"{'='*60}\n")

    for _, row in df.head(10).iterrows():
        print(f"{row['Strategy']:25s} | Win Rate: {row['Win_Rate_%']:5.1f}% | Avg Score: {row['Avg_Final_Score']:5.1f}")

    best = df.iloc[0]
    print(f"\n🏆 BEST STRATEGY: {best['Strategy']} with {best['Win_Rate_%']:.1f}% win rate")
    print(f"{'='*60}\n")

    # Export to Excel
    with pd.ExcelWriter(filename, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Results', index=False)

        summary_data = {
            'Metric': ['Total Strategies', 'Games Per Strategy', 'Best Strategy', 'Best Win Rate %'],
            'Value': [len(all_strategies), games_per_matchup, best['Strategy'], best['Win_Rate_%']]
        }
        pd.DataFrame(summary_data).to_excel(writer, sheet_name='Summary', index=False)

    print(f"📊 Results exported to: {filename}\n")

    return df


if __name__ == "__main__":
    # Experiment 1: Bust probability strategies (0% to 100% in 5% increments)
    bust_strategies = [BustProbabilityStrategy(i / 100) for i in range(0, 101, 5)]
    run_comprehensive_experiment(
        bust_strategies,
        "EXPERIMENT 1: Bust Probability Strategies (0% to 100%)",
        "experiment1_bust_probability.xlsx",
        games_per_matchup=500
    )

    # Experiment 2: Card count strategies
    card_count_strategies = [CardCountStrategy(i) for i in range(2, 8)]
    run_comprehensive_experiment(
        card_count_strategies,
        "EXPERIMENT 2: Card Count Strategies",
        "experiment2_card_count.xlsx",
        games_per_matchup=1000
    )

    # Experiment 3: Point threshold strategies
    point_strategies = [PointThresholdStrategy(i) for i in range(20, 81, 5)]
    run_comprehensive_experiment(
        point_strategies,
        "EXPERIMENT 3: Point Threshold Strategies (20-80 points)",
        "experiment3_point_threshold.xlsx",
        games_per_matchup=500
    )

    # Experiment 4: Championship with top performers
    print("\n" + "="*60)
    print("EXPERIMENT 4: Championship - Best Strategies Head-to-Head")
    print("="*60)

    championship_strategies = [
        BustProbabilityStrategy(0.15),
        BustProbabilityStrategy(0.20),
        BustProbabilityStrategy(0.25),
        CardCountStrategy(5),
        PointThresholdStrategy(45),
        PointThresholdStrategy(50),
        HybridStrategy(3, 50, 0.20),
        HybridStrategy(4, 45, 0.25)
    ]
    run_simulation(championship_strategies, num_games=2000, export_to_excel=True, filename="experiment4_championship.xlsx")
