import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../stores/gameStore';
import type { Card } from '@shared/types/index';
import CardComponent from './Card';

interface ActionCardButtonsProps {
  playerId: string;
  actionCards: Card[];
}

export default function ActionCardButtons({ playerId, actionCards }: ActionCardButtonsProps) {
  const { gameState, playActionCard, loading } = useGameStore();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const playerAreaRef = useRef<HTMLElement | null>(null);
  
  // Auto-select card if there's a pending action card for this player
  useEffect(() => {
    if (gameState?.pendingActionCard?.playerId === playerId) {
      const pendingCardId = gameState.pendingActionCard.cardId;
      if (actionCards.some(c => c.id === pendingCardId)) {
        setSelectedCard(pendingCardId);
      }
    }
  }, [gameState?.pendingActionCard, playerId, actionCards]);

  // Find the PlayerArea element for this player
  useEffect(() => {
    const findPlayerArea = () => {
      // Look for the PlayerArea container - it has a data attribute or we can find it by structure
      const playerAreas = document.querySelectorAll('[data-player-area]');
      for (const area of playerAreas) {
        const areaPlayerId = (area as HTMLElement).dataset.playerId;
        if (areaPlayerId === playerId) {
          playerAreaRef.current = area as HTMLElement;
          break;
        }
      }
    };
    findPlayerArea();
    // Re-check periodically in case the DOM updates
    const interval = setInterval(findPlayerArea, 100);
    return () => clearInterval(interval);
  }, [playerId]);

  if (!gameState || actionCards.length === 0) {
    return null;
  }

  // Filter to only FREEZE and FLIP THREE cards (playable on others)
  const playableCards = actionCards.filter(
    card => card.type === 'action' && 
    (card.actionType === 'freeze' || card.actionType === 'flipThree')
  );

  if (playableCards.length === 0) {
    return null;
  }

  // Get active players (excluding self if there are others)
  const activePlayers = gameState.players.filter(
    p => p.isActive && !p.hasBusted
  );
  
  const otherActivePlayers = activePlayers.filter(p => p.id !== playerId);
  const canTargetOthers = otherActivePlayers.length > 0;

  const handleCardClick = (cardId: string) => {
    if (selectedCard === cardId) {
      setSelectedCard(null);
    } else {
      setSelectedCard(cardId);
    }
  };

  const handlePlayCard = (cardId: string, targetPlayerId?: string) => {
    playActionCard(playerId, cardId, targetPlayerId);
    setSelectedCard(null);
  };

  const selectedCardData = selectedCard ? playableCards.find(c => c.id === selectedCard) : null;

  // Get card display name and colors
  const getCardInfo = (actionType: string) => {
    if (actionType === 'freeze') {
      return {
        name: 'Freeze',
        bgColor: 'bg-blue-800',
        borderColor: 'border-blue-600',
        textColor: 'text-blue-100',
        ringColor: 'ring-blue-500',
      };
    } else if (actionType === 'flipThree') {
      return {
        name: 'Flip 3',
        bgColor: 'bg-purple-800',
        borderColor: 'border-purple-600',
        textColor: 'text-purple-100',
        ringColor: 'ring-purple-500',
      };
    }
    return {
      name: 'Action',
      bgColor: 'bg-gray-800',
      borderColor: 'border-gray-600',
      textColor: 'text-gray-100',
      ringColor: 'ring-gray-500',
    };
  };

  const cardInfo = selectedCardData ? getCardInfo(selectedCardData.actionType || 'freeze') : null;

  return (
    <>
      <div className="space-y-2 relative">
        <div className="text-sm font-semibold mb-2 text-gray-300">Action Cards:</div>
        <div className="flex flex-wrap gap-2">
          {playableCards.map(card => {
            const info = getCardInfo(card.actionType || 'freeze');
            return (
              <div key={card.id} className="relative">
                <div 
                  onClick={() => !loading && handleCardClick(card.id)}
                  className={`cursor-pointer ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <CardComponent 
                    card={card} 
                    size="sm" 
                    playerId={playerId}
                    className={selectedCard === card.id ? `ring-4 ${info.ringColor}` : ''}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Popup positioned inside PlayerArea on the right side */}
      {selectedCard && selectedCardData && cardInfo && playerAreaRef.current && createPortal(
        <div className={`absolute right-2 top-1/2 -translate-y-1/2 border-2 rounded-lg shadow-xl p-3 z-50 min-w-[220px] max-w-[280px] ${
          cardInfo.bgColor
        } ${cardInfo.borderColor}`}
        style={{ 
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          <div className={`text-sm font-semibold mb-2 ${cardInfo.textColor}`}>
            Play {cardInfo.name} on:
          </div>
          <div className="space-y-1">
            {canTargetOthers ? (
              <>
                {otherActivePlayers.map(target => (
                  <button
                    key={target.id}
                    onClick={() => handlePlayCard(selectedCardData.id, target.id)}
                    disabled={loading}
                    className="w-full text-left px-3 py-2 rounded text-sm font-semibold border bg-blue-800 hover:bg-blue-700 border-blue-600 text-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {target.name}
                  </button>
                ))}
                <button
                  onClick={() => handlePlayCard(selectedCardData.id, playerId)}
                  disabled={loading}
                  className="w-full text-left px-3 py-2 rounded text-sm font-semibold border bg-gray-700 hover:bg-gray-600 border-gray-500 text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Yourself
                </button>
              </>
            ) : (
              <button
                onClick={() => handlePlayCard(selectedCardData.id, playerId)}
                disabled={loading}
                className="w-full text-left px-3 py-2 rounded text-sm font-semibold border bg-blue-800 hover:bg-blue-700 border-blue-600 text-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Yourself (no other active players)
              </button>
            )}
            <button
              onClick={() => setSelectedCard(null)}
              disabled={loading}
              className="w-full px-3 py-1 text-xs mt-2 text-gray-300 hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>,
        playerAreaRef.current
      )}
    </>
  );
}

