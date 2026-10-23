import { useState } from 'react';
import { MainMenu } from './components/MainMenu';
import { NewGameMenu } from './components/NewGameMenu';
import { PlayField } from './components/PlayField';
import { ScoresScreen } from './components/ScoresScreen';
import { generateBoard } from './game/generate';
import { isSolved, newGameState, score } from './game/logic';
import { randomSeed } from './game/seed';
import { clearGame, loadGame, recordGame, saveGame } from './game/storage';
import type { GameSeed, GameState } from './game/types';

/** `new`: picking the difficulty (or seed) for a new game. */
type Screen = 'menu' | 'new' | 'play' | 'scores';

interface AppProps {
  /** The game a shared link opened the page with: it starts straight away, replacing any saved game. */
  sharedSeed?: GameSeed | null;
}

function openingGame(sharedSeed: GameSeed | null): GameState | null {
  if (sharedSeed === null) return loadGame();
  const game = newGameState(sharedSeed, generateBoard(sharedSeed));
  saveGame(game);
  return game;
}

export function App({ sharedSeed = null }: AppProps) {
  const [screen, setScreen] = useState<Screen>(sharedSeed === null ? 'menu' : 'play');
  // The game being played (or last played); null when nothing is stored.
  const [game, setGame] = useState(() => openingGame(sharedSeed));
  // Bumped on every new game or retry so the play field starts over (selection, timer).
  const [round, setRound] = useState(0);

  function updateGame(next: GameState) {
    // A solved game can't be continued, so it isn't kept. A stuck one is, so it can still be retried.
    if (isSolved(next.board)) {
      // Only the solving pour records it; the play field may still report the solved game afterwards.
      if (game === null || !isSolved(game.board)) {
        const { seed, elapsedMs, pours } = next;
        recordGame({ seed, finishedAt: Date.now(), elapsedMs, pours, score: score(elapsedMs, pours) });
      }
      clearGame();
    } else saveGame(next);
    setGame(next);
  }

  function start(next: GameState) {
    updateGame(next);
    setRound((r) => r + 1);
    setScreen('play');
  }

  const startNewGame = (seed: GameSeed) => start(newGameState(seed, generateBoard(seed)));
  const retry = () => game && start(newGameState(game.seed, game.initial));
  const startSameDifficulty = () => game && startNewGame({ difficulty: game.seed.difficulty, seed: randomSeed() });
  // The saved game is only replaced once a new one actually starts, so backing out keeps it.
  const chooseNewGame = () => setScreen('new');

  // A board nobody has poured on yet (its clock hasn't started) has nothing to continue or lose.
  const hasSavedGame = game !== null && game.pours > 0 && !isSolved(game.board);

  return (
    <div className="app">
      {screen === 'menu' && (
        <MainMenu
          hasSavedGame={hasSavedGame}
          onContinue={() => setScreen('play')}
          onNewGame={chooseNewGame}
          onScores={() => setScreen('scores')}
        />
      )}
      {screen === 'new' && <NewGameMenu onStart={startNewGame} onBack={() => setScreen('menu')} />}
      {screen === 'scores' && (
        <ScoresScreen hasSavedGame={hasSavedGame} onPlay={startNewGame} onBack={() => setScreen('menu')} />
      )}
      {screen === 'play' && game !== null && (
        <PlayField
          key={round}
          game={game}
          onChange={updateGame}
          onNewGame={startSameDifficulty}
          onRetry={retry}
          onExit={() => setScreen('menu')}
        />
      )}
    </div>
  );
}
