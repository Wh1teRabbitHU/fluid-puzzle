import { useState } from 'react';
import { MainMenu } from './components/MainMenu';
import { PlayField } from './components/PlayField';
import { generateBoard } from './game/generate';
import { isSolved, newGameState } from './game/logic';
import { clearGame, loadGame, saveGame } from './game/storage';
import type { GameState } from './game/types';

type Screen = 'menu' | 'play';

export function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  // The game being played (or last played); null when nothing is stored.
  const [game, setGame] = useState<GameState | null>(loadGame);
  // Bumped on every new game or retry so the play field starts over (selection, timer).
  const [round, setRound] = useState(0);

  function updateGame(next: GameState) {
    // A solved game can't be continued, so it isn't kept. A stuck one is, so it can still be retried.
    if (isSolved(next.board)) clearGame();
    else saveGame(next);
    setGame(next);
  }

  function start(next: GameState) {
    updateGame(next);
    setRound((r) => r + 1);
    setScreen('play');
  }

  const startNewGame = () => start(newGameState(generateBoard()));
  const retry = () => game && start(newGameState(game.initial));

  return (
    <div className="app">
      {screen === 'menu' && (
        <MainMenu
          hasSavedGame={game !== null && !isSolved(game.board)}
          onContinue={() => setScreen('play')}
          onNewGame={startNewGame}
        />
      )}
      {screen === 'play' && game !== null && (
        <PlayField
          key={round}
          game={game}
          onChange={updateGame}
          onNewGame={startNewGame}
          onRetry={retry}
          onExit={() => setScreen('menu')}
        />
      )}
    </div>
  );
}
