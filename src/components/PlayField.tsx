import { useEffect, useState } from 'react';
import { canPour, gameStatus, isComplete, isSelectable, pour, revertMove, score } from '../game/logic';
import { formatTime } from '../game/format';
import { DIFFICULTY_LABELS } from '../game/seed';
import type { GameState, Vial } from '../game/types';
import { ConfirmDialog } from './ConfirmDialog';
import { Dialog } from './Dialog';
import { HowToPlayDialog } from './HowToPlayDialog';
import { SeedStat } from './SeedStat';
import { POUR_DURATION_MS, VialView, type VialState } from './VialView';

interface PlayFieldProps {
  game: GameState;
  /** Called with the new state after every pour (and when the clock pauses); the owner persists it. */
  onChange: (game: GameState) => void;
  /** Starts a fresh random board on the current game's difficulty (after the player confirms). */
  onNewGame: () => void;
  /** Starts the game over from its initial board: Retry after a loss, and Reset. */
  onRetry: () => void;
  onExit: () => void;
}

/** A pour being animated: `source` is the source vial as it was before the pour. */
interface PourAnimation {
  from: number;
  to: number;
  amount: number;
  source: Vial;
}

export function PlayField({ game, onChange, onNewGame, onRetry, onExit }: PlayFieldProps) {
  const { board, pours } = game;
  const status = gameStatus(board);
  const [selected, setSelected] = useState<number | null>(null);
  const [animation, setAnimation] = useState<PourAnimation | null>(null);
  // The cap drops in with an animation only on the vial the player just completed, not on vials that
  // were already complete when the game was loaded.
  const [lastTarget, setLastTarget] = useState<number | null>(null);
  const [confirmingNewGame, setConfirmingNewGame] = useState(false);
  const [showingHelp, setShowingHelp] = useState(false);

  // The clock runs from the first pour until the game ends, paused while the page is hidden, the player
  // is in the menu or reading the help. `runningSince` is when the current stretch started; null while paused.
  const canRun = () => pours > 0 && status === 'playing' && !document.hidden && !showingHelp;
  const [runningSince, setRunningSince] = useState<number | null>(() => (canRun() ? Date.now() : null));
  const [now, setNow] = useState(Date.now);
  const elapsedAt = (time: number) => game.elapsedMs + (runningSince === null ? 0 : Math.max(0, time - runningSince));

  function pauseClock() {
    if (runningSince === null) return;
    onChange({ ...game, elapsedMs: elapsedAt(Date.now()) });
    setRunningSince(null);
  }

  useEffect(() => {
    if (runningSince === null) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [runningSince]);

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) pauseClock();
      else if (canRun()) setRunningSince(Date.now());
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  });

  useEffect(() => {
    if (animation === null) return;
    const timeout = setTimeout(() => setAnimation(null), POUR_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [animation]);

  function vialState(index: number): VialState {
    if (animation !== null) return 'idle';
    if (index === selected) return 'selected';
    if (selected !== null && canPour(board, selected, index)) return 'target';
    if (isSelectable(board[index])) return 'selectable';
    return 'idle';
  }

  function handleClick(index: number) {
    if (animation !== null) return;
    if (selected !== null && canPour(board, selected, index)) {
      const next = pour(board, selected, index);
      const time = Date.now();
      setAnimation({ from: selected, to: index, amount: board[selected].length - next[selected].length, source: board[selected] });
      setLastTarget(index);
      setRunningSince(gameStatus(next) === 'playing' ? time : null);
      setNow(time);
      setSelected(null);
      const amount = board[selected].length - next[selected].length;
      onChange({
        ...game,
        board: next,
        moves: [...game.moves, { from: selected, to: index, amount }],
        pours: pours + 1,
        elapsedMs: elapsedAt(time),
      });
    } else if (index === selected || !isSelectable(board[index])) {
      setSelected(null);
    } else {
      setSelected(index);
    }
  }

  /** Takes back the last pour, animated as a pour in the other direction. It still counts as a pour made. */
  function revert() {
    const move = game.moves.at(-1);
    if (animation !== null || move === undefined) return;
    setAnimation({ from: move.to, to: move.from, amount: move.amount, source: board[move.to] });
    setLastTarget(null);
    setSelected(null);
    onChange({ ...game, board: revertMove(board, move), moves: game.moves.slice(0, -1) });
  }

  const elapsed = elapsedAt(now);

  return (
    <main className="play">
      <header className="play__header">
        <button
          className="icon-button"
          onClick={() => {
            pauseClock();
            onExit();
          }}
          aria-label="Back to menu"
        >
          ←
        </button>
        <div className="play__actions">
          <button
            className="play__action"
            onClick={() => {
              pauseClock();
              setShowingHelp(true);
            }}
          >
            How to play
          </button>
          <button className="play__action" onClick={revert} disabled={game.moves.length === 0 || animation !== null}>
            Revert
          </button>
          <button className="play__action" onClick={onRetry} disabled={pours === 0}>
            Reset
          </button>
          <button className="play__action" onClick={() => setConfirmingNewGame(true)}>
            New game
          </button>
        </div>
        <div className="play__stats">
          <SeedStat seed={game.seed} />
          <div className="stat">
            <span className="stat__label">Time</span>
            <span className="stat__value">{formatTime(elapsed)}</span>
          </div>
          <div className="stat">
            <span className="stat__label">Pours</span>
            <span className="stat__value">{pours}</span>
          </div>
        </div>
      </header>

      <section className="board">
        {board.map((vial, index) => {
          let vialAnimation;
          if (animation?.from === index) vialAnimation = { kind: 'drain', amount: animation.amount } as const;
          if (animation?.to === index) vialAnimation = { kind: 'fill', amount: animation.amount } as const;
          return (
            <VialView
              key={index}
              vial={animation?.from === index ? animation.source : vial}
              state={vialState(index)}
              animation={vialAnimation}
              // A vial being filled gets its cap once the last unit has landed.
              cap={isComplete(vial) && animation?.to !== index ? (lastTarget === index ? 'new' : 'shown') : 'none'}
              onClick={() => handleClick(index)}
            />
          );
        })}
      </section>

      {showingHelp && (
        <HowToPlayDialog
          onClose={() => {
            setShowingHelp(false);
            // canRun() would still see the help as open here.
            if (pours > 0 && status === 'playing' && !document.hidden) setRunningSince(Date.now());
          }}
        />
      )}

      {confirmingNewGame && (
        <ConfirmDialog
          title="Start a new game?"
          message={`Your current game will be lost and a new ${DIFFICULTY_LABELS[game.seed.difficulty]} game starts. This can't be undone.`}
          confirmLabel="New game"
          onConfirm={onNewGame}
          onCancel={() => setConfirmingNewGame(false)}
        />
      )}

      {animation === null && status === 'solved' && (
        <Dialog
          title="Congratulations!"
          actions={
            <>
              <button className="menu__button menu__button--primary" onClick={onNewGame} autoFocus>
                New game
              </button>
              <button className="menu__button" onClick={onExit}>
                Menu
              </button>
            </>
          }
        >
          <p>You solved the puzzle.</p>
          <dl className="dialog__stats">
            <div>
              <dt>Time</dt>
              <dd>{formatTime(game.elapsedMs)}</dd>
            </div>
            <div>
              <dt>Pours</dt>
              <dd>{pours}</dd>
            </div>
            <div>
              <dt>Score</dt>
              <dd>{score(game.elapsedMs, pours).toLocaleString()}</dd>
            </div>
          </dl>
        </Dialog>
      )}

      {animation === null && status === 'stuck' && !confirmingNewGame && (
        <Dialog
          title="Game over"
          actions={
            <>
              <button className="menu__button menu__button--primary" onClick={() => setConfirmingNewGame(true)} autoFocus>
                New game
              </button>
              <button className="menu__button" onClick={onRetry}>
                Retry
              </button>
              <button className="menu__button" onClick={onExit}>
                Menu
              </button>
            </>
          }
        >
          <p>No more legal moves left.</p>
        </Dialog>
      )}
    </main>
  );
}
