import { useGameStore } from '../stores/gameStore';
import Card from './Card';

export default function GameStats() {
  const { gameState } = useGameStore();

  if (!gameState || !gameState.roundHistory || gameState.roundHistory.length === 0) {
    return null;
  }

  const roundHistory = gameState.roundHistory;
  const totalRounds = roundHistory.length;

  // Calculate overall stats
  let totalBusts = 0;
  let totalScoringRounds = 0;
  const playerStats: Record<string, {
    name: string;
    busts: number;
    scoringRounds: number;
    totalScore: number;
    averageScore: number;
  }> = {};

  // Initialize player stats
  gameState.players.forEach(player => {
    playerStats[player.id] = {
      name: player.name,
      busts: 0,
      scoringRounds: 0,
      totalScore: 0,
      averageScore: 0,
    };
  });

  // Calculate stats from round history
  roundHistory.forEach(round => {
    Object.keys(round.playerBusts).forEach(playerId => {
      if (round.playerBusts[playerId]) {
        totalBusts++;
        playerStats[playerId].busts++;
      }
    });

    Object.keys(round.playerScores).forEach(playerId => {
      const score = round.playerScores[playerId];
      if (score > 0 && !round.playerBusts[playerId]) {
        totalScoringRounds++;
        playerStats[playerId].scoringRounds++;
      }
      playerStats[playerId].totalScore += score;
    });
  });

  // Calculate averages
  Object.keys(playerStats).forEach(playerId => {
    const roundsPlayed = roundHistory.length;
    playerStats[playerId].averageScore = roundsPlayed > 0 
      ? Math.round((playerStats[playerId].totalScore / roundsPlayed) * 10) / 10
      : 0;
  });

  // Get largest round details
  const largestRound = gameState.largestRound;

  return (
    <div className="rounded-lg p-1.5 sm:p-2 border-2 mt-1 sm:mt-2 text-xs sm:text-sm bg-gray-800 border-gray-600">
      <h3 className="text-sm sm:text-base font-bold mb-1 sm:mb-2 text-white">Game Statistics</h3>

      {/* Overall Stats - Compact */}
      <div className="mb-1.5 sm:mb-2 p-1.5 sm:p-2 rounded bg-gray-700">
        <div className="grid grid-cols-3 gap-1 sm:gap-2 text-[10px] sm:text-xs">
          <div>
            <div className="text-gray-400">Rounds</div>
            <div className="text-base sm:text-lg font-bold text-white">
              {totalRounds}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Busts</div>
            <div className="text-base sm:text-lg font-bold text-white">
              {totalBusts}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Scoring</div>
            <div className="text-base sm:text-lg font-bold text-white">
              {totalScoringRounds}
            </div>
          </div>
        </div>
      </div>

      {/* Per-Player Stats - Compact */}
      <div className="mb-1.5 sm:mb-2 p-1.5 sm:p-2 rounded bg-gray-700">
        <div className="text-[10px] sm:text-xs font-semibold mb-1 sm:mb-1.5 text-gray-300">Per Player</div>
        <div className="space-y-1 sm:space-y-1.5">
          {/* Header Row */}
          <div className="grid grid-cols-3 gap-1 sm:gap-2 px-1 sm:px-1.5 pb-0.5 border-b border-gray-600 text-[10px] sm:text-xs text-gray-400 font-semibold">
            <div>Busts</div>
            <div>Scored</div>
            <div>Avg</div>
          </div>
          {/* Player Rows */}
          {gameState.players.map(player => {
            const stats = playerStats[player.id];
            if (!stats) return null;
            
            return (
              <div key={player.id} className="px-1 sm:px-1.5 py-0.5 sm:py-1 rounded border text-[10px] sm:text-xs bg-gray-800 border-gray-600">
                <div className="font-semibold mb-0.5 text-gray-200">
                  {stats.name}
                </div>
                <div className="grid grid-cols-3 gap-1 sm:gap-2">
                  <div className="font-bold text-white">
                    {stats.busts}
                  </div>
                  <div className="font-bold text-white">
                    {stats.scoringRounds}
                  </div>
                  <div className="font-bold text-white">
                    {stats.averageScore}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Largest Round - Compact */}
      {largestRound && (
        <div className="p-1.5 sm:p-2 rounded bg-gray-700">
          <div className="text-[10px] sm:text-xs font-semibold mb-1 sm:mb-1.5 text-gray-300">Largest Round</div>
          <div className="mb-1 sm:mb-1.5 p-1 sm:p-1.5 rounded bg-gray-800">
            <div className="font-semibold text-[10px] sm:text-xs text-gray-200">
              {largestRound.playerName} - R{largestRound.roundNumber}
            </div>
            <div className="text-base sm:text-lg font-bold text-yellow-400">
              {largestRound.score} pts
            </div>
          </div>

          {/* Cards - Compact */}
          <div>
            {(() => {
              const numberCards = largestRound.cards.filter(c => c.type === 'number');
              const modifierCards = largestRound.cards.filter(c => c.type === 'modifier');
              const actionCards = largestRound.cards.filter(c => c.type === 'action');

              return (
                <div className="space-y-0.5 sm:space-y-1">
                  {numberCards.length > 0 && (
                    <div>
                      <div className="text-[9px] sm:text-[10px] mb-0.5 text-gray-400">
                        Numbers:
                      </div>
                      <div className="flex flex-wrap gap-0.5 sm:gap-1">
                        {numberCards.map(card => (
                          <Card key={card.id} card={card} size="xs" />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {(modifierCards.length > 0 || actionCards.length > 0) && (
                    <div className="flex flex-wrap gap-0.5 sm:gap-1">
                      {modifierCards.map(card => (
                        <Card key={card.id} card={card} size="xs" />
                      ))}
                      {actionCards.map(card => (
                        <Card key={card.id} card={card} size="xs" />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
