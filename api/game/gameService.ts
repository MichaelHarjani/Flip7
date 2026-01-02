import type { Card, Player, GameState, RoundHistory, LargestRound } from '../shared/types/index.js';
import { createDeck, shuffleDeck } from '../shared/utils/cards.js';
import { checkBust, hasFlip7, calculateScore, organizePlayerCards, getActivePlayers } from '../shared/utils/gameLogic.js';
import { makeAIDecision } from './aiPlayer.js';

export class GameService {
  private gameState: GameState | null = null;

  /**
   * Initialize a new game
   */
  initializeGame(
    playerNames: string[],
    aiDifficulties: Array<'conservative' | 'moderate' | 'aggressive'> = []
  ): GameState {
    const players: Player[] = playerNames.map((name, index) => ({
      id: `player-${index}`,
      name,
      isAI: index >= playerNames.length - aiDifficulties.length,
      cards: [],
      numberCards: [],
      modifierCards: [],
      actionCards: [],
      score: 0,
      isActive: true,
      hasBusted: false,
      hasSecondChance: false,
      aiDifficulty: aiDifficulties[index - (playerNames.length - aiDifficulties.length)] || 'moderate',
    }));

    const deck = shuffleDeck(createDeck());

      this.gameState = {
        players,
        deck,
        discardPile: [],
        currentPlayerIndex: 0,
        round: 1,
        dealerIndex: 0,
        gameStatus: 'waiting',
        roundScores: {},
        roundHistory: [],
        largestRound: undefined,
        pendingActionCard: undefined,
      };

    return this.gameState;
  }

  /**
   * Start a new round - deal initial cards
   */
  startRound(): GameState {
    if (!this.gameState) {
      throw new Error('Game not initialized');
    }

    try {
      // Discard all cards from previous round (if any)
      // This happens here so cards remain visible during roundEnd state
      this.gameState.players.forEach(player => {
        if (player.cards.length > 0) {
          this.gameState!.discardPile.push(...player.cards);
        }
      });

      // Reset players for new round
      this.gameState.players.forEach(player => {
        player.cards = [];
        player.numberCards = [];
        player.modifierCards = [];
        player.actionCards = [];
        player.isActive = true;
        player.hasBusted = false;
        player.hasSecondChance = false;
        player.secondChanceUsedBy = undefined;
        player.frozenBy = undefined;
      });

      this.gameState.roundScores = {};
      this.gameState.gameStatus = 'playing';
      this.gameState.pendingActionCard = undefined;

      // Deal one card face up to each player
      const activePlayers = this.gameState.players.filter(p => p.isActive);
      
      if (activePlayers.length === 0) {
        throw new Error('No active players to deal cards to');
      }

      for (const player of activePlayers) {
        if (this.gameState.deck.length === 0) {
          // Reshuffle discard pile if deck runs out
          if (this.gameState.discardPile.length === 0) {
            throw new Error('No cards available in deck or discard pile');
          }
          this.gameState.deck = shuffleDeck([...this.gameState.discardPile]);
          this.gameState.discardPile = [];
        }

        const card = this.gameState.deck.pop();
        if (!card) {
          throw new Error('Failed to draw card from deck');
        }
        
        this.dealCardToPlayer(player, card, true);
      }

      // Set current player to first active player after dealer
      const dealerIndex = this.gameState.dealerIndex;
      const activePlayerIndices = this.gameState.players
        .map((p, idx) => p.isActive ? idx : -1)
        .filter(idx => idx !== -1);
      
      if (activePlayerIndices.length === 0) {
        throw new Error('No active players after dealing cards');
      }

      // Find next active player after dealer
      let nextPlayerIndex = (dealerIndex + 1) % this.gameState.players.length;
      let attempts = 0;
      while (!this.gameState.players[nextPlayerIndex].isActive && attempts < this.gameState.players.length) {
        nextPlayerIndex = (nextPlayerIndex + 1) % this.gameState.players.length;
        attempts++;
      }
      
      if (!this.gameState.players[nextPlayerIndex].isActive) {
        throw new Error('Could not find active player after dealer');
      }

      this.gameState.currentPlayerIndex = nextPlayerIndex;

      return this.gameState;
    } catch (error) {
      console.error('Error in startRound:', error);
      // Reset game status on error
      if (this.gameState) {
        this.gameState.gameStatus = 'waiting';
      }
      throw error;
    }
  }

  /**
   * Deal a card to a player and handle action cards
   */
  dealCardToPlayer(player: Player, card: Card, isInitialDeal: boolean = false, isResolvingFlipThree: boolean = false): void {
    if (!this.gameState) return;

    // Handle action cards IMMEDIATELY if picked up (not on initial deal)
    // This must happen BEFORE adding to hand to prevent them from being held
    if (!isInitialDeal && card.type === 'action') {
      if (card.actionType === 'flipThree' && !isResolvingFlipThree) {
        // Flip3: Check if there are other players to target (if it's playable on others)
        // For Flip3, it typically affects the player who picks it up, but let's allow targeting
        const activePlayers = getActivePlayers(this.gameState.players);
        const otherActivePlayers = activePlayers.filter(p => p.id !== player.id);
        
        if (otherActivePlayers.length > 0) {
          // Other players exist - mark as pending for target selection
          this.gameState.pendingActionCard = {
            playerId: player.id,
            cardId: card.id,
            actionType: 'flipThree'
          };
          // Continue to add card to hand below
        } else {
          // No other active players - auto-resolve on self (draw 3 cards immediately)
          this.gameState.discardPile.push(card);
          
          // Draw 3 cards immediately
          for (let i = 0; i < 3; i++) {
            if (this.gameState.deck.length === 0) {
              if (this.gameState.discardPile.length === 0) {
                break; // No more cards
              }
              this.gameState.deck = shuffleDeck([...this.gameState.discardPile]);
              this.gameState.discardPile = [];
            }
            
            const newCard = this.gameState.deck.pop();
            if (!newCard) break;
            
            // Recursively deal the card (pass isResolvingFlipThree=true to prevent infinite recursion)
            this.dealCardToPlayer(player, newCard, false, true);
            
            // Stop if player busted or achieved Flip 7
            if (player.hasBusted || hasFlip7(player)) {
              break;
            }
          }
          return; // Card never added to hand - resolved immediately
        }
      } else if (card.actionType === 'freeze') {
        // Freeze: Must be resolved immediately when picked up
        const activePlayers = getActivePlayers(this.gameState.players);
        const otherActivePlayers = activePlayers.filter(p => p.id !== player.id);
        
        if (otherActivePlayers.length > 0) {
          // Other players exist - add to hand AND mark as pending for immediate resolution
          this.gameState.pendingActionCard = {
            playerId: player.id,
            cardId: card.id,
            actionType: 'freeze'
          };
          // Continue to add card to hand below
        } else {
          // No other active players - auto-freeze self
          this.gameState.discardPile.push(card);
          this.handleActionCard(player, card, isInitialDeal, player.id);
          return; // Card never added to hand - resolved immediately
        }
      } else if (card.actionType === 'secondChance') {
        // Second Chance: Handle it, then add to hand (it stays as a card)
        // If player already has one, it will be given away or discarded
        const cardConsumed = this.handleActionCard(player, card, isInitialDeal);
        if (cardConsumed) {
          // Card was given away or discarded, don't add it to player's hand
          return;
        }
        // Continue to add card to hand below
      }
    }

    // Check for bust BEFORE adding the card (for number cards only, and not on initial deal)
    let shouldBust = false;
    if (card.type === 'number' && !isInitialDeal) {
      // Check if player already has this number BEFORE adding the new card
      const hasDuplicate = player.numberCards.some(
        existingCard => existingCard.type === 'number' && existingCard.value === card.value
      );
      
      if (hasDuplicate) {
        // Check if player has Second Chance (either via flag or by having the card)
        const hasSecondChanceCard = player.hasSecondChance || 
          player.actionCards.some(c => c.type === 'action' && c.actionType === 'secondChance');
        
        console.log(`[Bust Check] Player ${player.name}: hasDuplicate=${hasDuplicate}, hasSecondChance flag=${player.hasSecondChance}, hasSecondChance card=${player.actionCards.some(c => c.type === 'action' && c.actionType === 'secondChance')}`);
        
        if (hasSecondChanceCard) {
          // Use Second Chance - find and mark ONE Second Chance card as used
          console.log(`[Second Chance] Player ${player.name} using Second Chance to prevent bust`);
          
          // Find the first unused Second Chance card (one that hasn't been used yet)
          const secondChanceCards = player.actionCards.filter(
            c => c.type === 'action' && c.actionType === 'secondChance'
          );
          
          // Filter out cards that are already marked as used
          const usedSecondChanceCardIds = new Set(
            player.cards
              .filter(c => {
                // Check if this card is marked as used
                return c.type === 'action' && 
                       c.actionType === 'secondChance' && 
                       player.secondChanceUsedBy?.secondChanceCardId === c.id;
              })
              .map(c => c.id)
          );
          
          const unusedSecondChanceCard = secondChanceCards.find(
            c => !usedSecondChanceCardIds.has(c.id)
          );
          
          if (unusedSecondChanceCard) {
            // Mark this specific Second Chance card as used
            // Track which card triggered the Second Chance usage and which Second Chance card was used
            player.secondChanceUsedBy = {
              type: card.type,
              value: card.type === 'number' ? card.value : undefined,
              secondChanceCardId: unusedSecondChanceCard.id
            };
            
            // Update hasSecondChance flag only if no unused Second Chance cards remain
            const remainingUnused = secondChanceCards.filter(
              c => c.id !== unusedSecondChanceCard.id && !usedSecondChanceCardIds.has(c.id)
            );
            if (remainingUnused.length === 0 && !player.hasSecondChance) {
              // No more Second Chance cards available
              player.hasSecondChance = false;
            }
          } else {
            // Fallback: if we can't find an unused one, use the first one
            if (secondChanceCards.length > 0) {
              player.secondChanceUsedBy = {
                type: card.type,
                value: card.type === 'number' ? card.value : undefined,
                secondChanceCardId: secondChanceCards[0].id
              };
            }
          }
          
          // Keep Second Chance card(s) in hand but mark the used one
          // Don't remove it - it stays visible with usage info
          this.gameState.discardPile.push(card);
          return; // Don't add the card
        } else {
          // BUST! - but we still need to add the card to show what caused the bust
          console.log(`[BUST] Player ${player.name} busted on duplicate ${card.value}`);
          shouldBust = true;
        }
      }
    }

    // Add the card to player's hand (only if it hasn't been resolved as an action card above)
    player.cards.push(card);

    // Organize cards
    const organized = organizePlayerCards(player.cards);
    player.numberCards = organized.numberCards;
    player.modifierCards = organized.modifierCards;
    player.actionCards = organized.actionCards;

    // Apply bust if detected
    if (shouldBust) {
      player.hasBusted = true;
      player.isActive = false;
    }

    // Check for Flip 7
    if (hasFlip7(player)) {
      this.endRound();
    }
  }

  /**
   * Handle action card effects
   * @returns true if the card was consumed (given away or discarded) and should not be added to player's hand
   */
  private handleActionCard(
    player: Player,
    card: Card,
    isInitialDeal: boolean,
    frozenByPlayerId?: string
  ): boolean {
    if (!this.gameState) return false;

    switch (card.actionType) {
      case 'freeze':
        // Player banks points and is out of the round
        const score = calculateScore(player);
        this.gameState.roundScores[player.id] = score;
        player.isActive = false;
        // Track who froze this player
        if (frozenByPlayerId) {
          player.frozenBy = frozenByPlayerId;
        }
        return false; // Card should be added to hand (it stays visible on the frozen player)

      case 'secondChance':
        // Player gets a Second Chance card
        console.log(`[Second Chance] Dealing Second Chance to ${player.name}, current hasSecondChance=${player.hasSecondChance}`);
        
        // Check if player already has a Second Chance card (either via flag or by having the card)
        const hasSecondChanceCard = player.hasSecondChance || 
          player.actionCards.some(c => c.type === 'action' && c.actionType === 'secondChance');
        
        if (hasSecondChanceCard) {
          // Already has one - must give to another active player who doesn't have one
          const otherActivePlayers = getActivePlayers(this.gameState.players).filter(
            p => {
              if (p.id === player.id) return false;
              // Check if they already have a Second Chance card
              const pHasSecondChance = p.hasSecondChance || 
                p.actionCards.some(c => c.type === 'action' && c.actionType === 'secondChance');
              return !pHasSecondChance;
            }
          );
          
          if (otherActivePlayers.length > 0) {
            // Give to first available active player
            otherActivePlayers[0].hasSecondChance = true;
            // Add the card to that player's hand
            otherActivePlayers[0].cards.push(card);
            const reorganized = organizePlayerCards(otherActivePlayers[0].cards);
            otherActivePlayers[0].actionCards = reorganized.actionCards;
            otherActivePlayers[0].numberCards = reorganized.numberCards;
            otherActivePlayers[0].modifierCards = reorganized.modifierCards;
            console.log(`[Second Chance] ${player.name} already has one, giving to ${otherActivePlayers[0].name}`);
          } else {
            // No other active players without Second Chance - discard the card
            this.gameState.discardPile.push(card);
            console.log(`[Second Chance] ${player.name} already has one, no other active players can take it, discarding`);
          }
          
          // Card was given away or discarded, so don't add it to original player's hand
          return true;
        } else {
          player.hasSecondChance = true;
          console.log(`[Second Chance] ${player.name} now has Second Chance protection`);
          return false; // Card should be added to player's hand
        }

      case 'flipThree':
        // Player must accept next 3 cards immediately
        // Draw 3 cards for the target player
        for (let i = 0; i < 3; i++) {
          if (this.gameState.deck.length === 0) {
            if (this.gameState.discardPile.length === 0) {
              break; // No more cards available
            }
            this.gameState.deck = shuffleDeck([...this.gameState.discardPile]);
            this.gameState.discardPile = [];
          }
          
          const newCard = this.gameState.deck.pop();
          if (!newCard) break;
          
          // Deal the card (pass isResolvingFlipThree=true to prevent infinite recursion)
          this.dealCardToPlayer(player, newCard, false, true);
          
          // Stop if player busted or achieved Flip 7
          if (player.hasBusted || hasFlip7(player)) {
            break;
          }
        }
        return false; // Flip Three card is discarded after use, but handled in playActionCard
    }
    
    return false; // Default: card should be added to hand
  }

  /**
   * Player hits (requests a card)
   */
  hit(playerId: string): GameState {
    if (!this.gameState) {
      throw new Error('Game not initialized');
    }

    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player || !player.isActive || player.hasBusted) {
      throw new Error('Player not active');
    }

    // CRITICAL: Check if there's a pending action card that must be resolved first
    // Action cards like Freeze must be resolved immediately when picked up
    if (this.gameState.pendingActionCard && this.gameState.pendingActionCard.playerId === playerId) {
      throw new Error('You must resolve the pending action card before taking another action');
    }

    // Check if player has Flip Three active (from a previous pickup)
    const flipThreeCard = player.actionCards.find(
      c => c.actionType === 'flipThree'
    );

    let cardsToDraw = 1;
    
    if (flipThreeCard) {
      cardsToDraw = 3;
      // Remove Flip Three card after use
      player.actionCards = player.actionCards.filter(c => c.id !== flipThreeCard.id);
      player.cards = player.cards.filter(c => c.id !== flipThreeCard.id);
      this.gameState.discardPile.push(flipThreeCard);
    }

    // Draw cards - all action cards will be resolved immediately in dealCardToPlayer
    // Action cards (Flip3/Freeze) are resolved BEFORE being added to hand, so they can't be held
    for (let i = 0; i < cardsToDraw; i++) {
      if (this.gameState.deck.length === 0) {
        if (this.gameState.discardPile.length === 0) {
          throw new Error('No cards remaining');
        }
        this.gameState.deck = shuffleDeck([...this.gameState.discardPile]);
        this.gameState.discardPile = [];
      }

      const card = this.gameState.deck.pop()!;
      
      // Deal card - action cards (Flip3/Freeze) will be resolved immediately before being added to hand
      this.dealCardToPlayer(player, card, false, !!flipThreeCard);

      // If player busted or achieved Flip 7, stop drawing
      if (player.hasBusted || hasFlip7(player)) {
        break;
      }
    }

    // Move to next player if round is still active AND no pending action card
    // If there's a pending action card, the player must resolve it before their turn ends
    if (this.gameState.gameStatus === 'playing' && !this.gameState.pendingActionCard) {
      this.moveToNextPlayer();
    }

    return this.gameState;
  }

  /**
   * Player stays (ends turn)
   */
  stay(playerId: string): GameState {
    if (!this.gameState) {
      throw new Error('Game not initialized');
    }

    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player || !player.isActive || player.hasBusted) {
      throw new Error('Player not active');
    }

    // CRITICAL: Check if there's a pending action card that must be resolved first
    // Action cards like Freeze must be resolved immediately when picked up
    if (this.gameState.pendingActionCard && this.gameState.pendingActionCard.playerId === playerId) {
      throw new Error('You must resolve the pending action card before taking another action');
    }

    // Calculate and bank score
    const score = calculateScore(player);
    this.gameState.roundScores[player.id] = score;
    player.isActive = false;

    // Move to next player
    this.moveToNextPlayer();

    // Check if round should end
    this.checkRoundEnd();

    return this.gameState;
  }

  /**
   * Move to next active player
   */
  private moveToNextPlayer(): void {
    if (!this.gameState) return;

    const activePlayers = getActivePlayers(this.gameState.players);
    if (activePlayers.length === 0) {
      this.endRound();
      return;
    }

    // Find next active player
    let nextIndex = (this.gameState.currentPlayerIndex + 1) % this.gameState.players.length;
    let attempts = 0;
    while (
      !this.gameState.players[nextIndex].isActive ||
      this.gameState.players[nextIndex].hasBusted
    ) {
      nextIndex = (nextIndex + 1) % this.gameState.players.length;
      attempts++;
      if (attempts >= this.gameState.players.length) {
        this.endRound();
        return;
      }
    }

    this.gameState.currentPlayerIndex = nextIndex;
  }

  /**
   * Check if round should end
   */
  private checkRoundEnd(): void {
    if (!this.gameState) return;

    const activePlayers = getActivePlayers(this.gameState.players);
    if (activePlayers.length === 0) {
      this.endRound();
    }
  }

  /**
   * End the current round
   */
  endRound(): void {
    if (!this.gameState) return;

    // Prevent double-processing if round already ended
    if (this.gameState.gameStatus === 'roundEnd') {
      return;
    }

    this.gameState.gameStatus = 'roundEnd';

    // Calculate final scores for all players
    const playerScores: Record<string, number> = {};
    const playerBusts: Record<string, boolean> = {};
    const playerCards: Record<string, Card[]> = {};
    
    this.gameState.players.forEach(player => {
      if (!this.gameState) return;
      
      // Always recalculate the score at round end to ensure accuracy
      // The cached roundScores value might be stale if player's cards changed
      const roundScore = player.hasBusted ? 0 : calculateScore(player);
      
      player.score += roundScore;
      this.gameState.roundScores[player.id] = roundScore;
      
      // Capture round data for history
      playerScores[player.id] = roundScore;
      playerBusts[player.id] = player.hasBusted;
      // Deep copy cards for history (they'll be discarded when next round starts)
      playerCards[player.id] = player.cards.map(card => ({ ...card }));
    });

    // Record round history
    const roundHistoryEntry: RoundHistory = {
      roundNumber: this.gameState.round,
      playerScores,
      playerBusts,
      playerCards,
    };
    
    if (!this.gameState.roundHistory) {
      this.gameState.roundHistory = [];
    }
    this.gameState.roundHistory.push(roundHistoryEntry);

    // Update largest round if this round has a higher score
    let maxScoreThisRound = 0;
    let maxScorePlayerId: string | null = null;
    
    this.gameState.players.forEach(player => {
      const score = playerScores[player.id];
      if (score > maxScoreThisRound) {
        maxScoreThisRound = score;
        maxScorePlayerId = player.id;
      }
    });

    if (maxScorePlayerId && maxScoreThisRound > 0) {
      const currentLargestScore = this.gameState.largestRound?.score || 0;
      if (maxScoreThisRound > currentLargestScore) {
        const maxScorePlayer = this.gameState.players.find(p => p.id === maxScorePlayerId);
        if (maxScorePlayer) {
          const largestRoundEntry: LargestRound = {
            roundNumber: this.gameState.round,
            playerId: maxScorePlayer.id,
            playerName: maxScorePlayer.name,
            score: maxScoreThisRound,
            cards: playerCards[maxScorePlayerId].map(card => ({ ...card })),
          };
          this.gameState.largestRound = largestRoundEntry;
        }
      }
    }

    // NOTE: Cards are NOT discarded here - they remain visible until the next round starts
    // This allows players to see the final state of the round
    
    // Discard all Second Chance cards at the end of the round (per rules)
    this.gameState.players.forEach(player => {
      if (!this.gameState) return;
      
      // Find all Second Chance cards
      const secondChanceCards = player.actionCards.filter(
        c => c.type === 'action' && c.actionType === 'secondChance'
      );
      
      // Move them to discard pile
      if (secondChanceCards.length > 0) {
        secondChanceCards.forEach(card => {
          this.gameState!.discardPile.push(card);
          player.cards = player.cards.filter(c => c.id !== card.id);
        });
        
        // Reorganize cards
        const reorganized = organizePlayerCards(player.cards);
        player.actionCards = reorganized.actionCards;
        player.numberCards = reorganized.numberCards;
        player.modifierCards = reorganized.modifierCards;
        
        // Reset Second Chance flag
        player.hasSecondChance = false;
        player.secondChanceUsedBy = undefined;
      }
    });

    // Check for game end (200 points)
    const winner = this.gameState.players.find(p => p.score >= 200);
    if (winner) {
      this.gameState.gameStatus = 'gameEnd';
    }
  }

  /**
   * Start next round
   */
  startNextRound(): GameState {
    if (!this.gameState) {
      throw new Error('Game not initialized');
    }

    // Move dealer to next player
    this.gameState.dealerIndex = (this.gameState.dealerIndex + 1) % this.gameState.players.length;
    this.gameState.round++;

    // If deck is low, reshuffle discard pile
    if (this.gameState.deck.length < 10) {
      const allCards = [...this.gameState.deck, ...this.gameState.discardPile];
      this.gameState.deck = shuffleDeck(allCards);
      this.gameState.discardPile = [];
    }

    return this.startRound();
  }

  /**
   * Get current game state
   */
  getGameState(): GameState | null {
    return this.gameState;
  }

  /**
   * Restore game state from a serialized state object
   * Used for stateless API operations where state is passed with each request
   */
  restoreState(state: GameState): void {
    this.gameState = state;
  }

  /**
   * Play an action card
   */
  playActionCard(
    playerId: string,
    cardId: string,
    targetPlayerId?: string
  ): GameState {
    if (!this.gameState) {
      throw new Error('Game not initialized');
    }

    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const card = player.actionCards.find(c => c.id === cardId);
    if (!card) {
      throw new Error('Action card not found');
    }

    // Clear pending action card if this is the one that was pending
    if (this.gameState.pendingActionCard?.cardId === cardId && 
        this.gameState.pendingActionCard?.playerId === playerId) {
      this.gameState.pendingActionCard = undefined;
    }

    // Get active players
    const activePlayers = getActivePlayers(this.gameState.players);
    
    // Determine target player
    let targetPlayer: Player;
    if (targetPlayerId) {
      targetPlayer = this.gameState.players.find(p => p.id === targetPlayerId)!;
      if (!targetPlayer || !targetPlayer.isActive || targetPlayer.hasBusted) {
        throw new Error('Target player not found or not active');
      }
    } else {
      // No target specified - use self if no other active players, otherwise error
      if (activePlayers.length === 1 && activePlayers[0].id === playerId) {
        targetPlayer = player;
      } else if (activePlayers.length > 1) {
        throw new Error('Must specify target player when other active players exist');
      } else {
        targetPlayer = player;
      }
    }

    // Remove card from player's hand
    player.actionCards = player.actionCards.filter(c => c.id !== cardId);
    player.cards = player.cards.filter(c => c.id !== cardId);

    // Apply the action card to the target
    // For FREEZE and FLIP THREE, handle them specially
    if (card.actionType === 'freeze' || card.actionType === 'flipThree') {
      // Apply the card effect to the target
      // Pass playerId for freeze to track who froze them
      this.handleActionCard(targetPlayer, card, false, card.actionType === 'freeze' ? playerId : undefined);
      
      if (card.actionType === 'freeze') {
        // Freeze card stays visible on the target player
        targetPlayer.cards.push(card);
        const reorganized = organizePlayerCards(targetPlayer.cards);
        targetPlayer.actionCards = reorganized.actionCards;
      } else {
        // Flip Three card is discarded after use (effect already applied)
        this.gameState.discardPile.push(card);
      }
    } else {
      // For other action cards, deal normally
      this.dealCardToPlayer(targetPlayer, card, false);
    }

    // Move to next player after resolving action card (if round is still active)
    // BUT: If the target player is the current player and they now have a pending action card
    // (e.g., one of the 3 cards drawn was an action card), don't move to next player yet
    // Let them resolve the new pending action card first
    if (this.gameState.gameStatus === 'playing') {
      const targetIsCurrentPlayer = targetPlayer.id === this.gameState.players[this.gameState.currentPlayerIndex].id;
      const hasNewPendingAction = this.gameState.pendingActionCard && 
                                  this.gameState.pendingActionCard.playerId === targetPlayer.id;
      
      // Only move to next player if target doesn't have a new pending action card to resolve
      if (!(targetIsCurrentPlayer && hasNewPendingAction)) {
        this.moveToNextPlayer();
      }
    }

    return this.gameState;
  }

  /**
   * Get AI decision for a player
   */
  makeAIDecision(playerId: string): { action: 'hit' | 'stay'; actionCard?: { cardId: string; targetPlayerId?: string } } {
    if (!this.gameState) {
      throw new Error('Game not initialized');
    }

    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player || !player.isAI) {
      throw new Error('Player not found or not AI');
    }

    return makeAIDecision(player, this.gameState, player.aiDifficulty || 'moderate');
  }

  /**
   * Get current game state (alias for getGameState)
   */
  getState(): GameState | null {
    return this.getGameState();
  }
}

