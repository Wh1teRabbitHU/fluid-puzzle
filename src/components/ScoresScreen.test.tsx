import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { formatDateTime } from '../game/format';
import { encodeSeed } from '../game/seed';
import { recordGame } from '../game/storage';
import type { GameRecord } from '../game/types';
import { SCORES_PAGE_SIZE, ScoresScreen } from './ScoresScreen';
import { shortSeedCode } from './SeedStat';

function renderScores(hasSavedGame = false) {
  const props = { hasSavedGame, onPlay: vi.fn(), onBack: vi.fn() };
  render(<ScoresScreen {...props} />);
  return props;
}

/** Game `n` was finished at minute `n`, so a higher number is more recent. */
const game = (n: number, extra: Partial<GameRecord> = {}): GameRecord => ({
  seed: { difficulty: 'medium', seed: n },
  finishedAt: Date.UTC(2026, 0, 1) + n * 60_000,
  elapsedMs: 60_000 + n * 1_000,
  pours: 20 + n,
  score: 500,
  ...extra,
});

const rows = () => screen.queryAllByRole('row').slice(1);
const cells = (row: HTMLElement) => within(row).getAllByRole('cell').map((cell) => cell.textContent);
const statValue = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

describe('ScoresScreen', () => {
  it('shows empty stats and a hint before any game is solved', () => {
    renderScores();
    expect(screen.getByRole('heading', { name: 'Scores' })).toBeInTheDocument();
    expect(statValue('Finished games')).toBe('0');
    expect(statValue('Fastest solve')).toBe('–');
    expect(statValue('Fewest pours')).toBe('–');
    expect(statValue('Overall score')).toBe('0');
    expect(screen.getByText(/No solved games yet/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load older games' })).not.toBeInTheDocument();
  });

  it('shows the stored stats', () => {
    recordGame(game(1, { elapsedMs: 95_000, pours: 40, score: 1_000 }));
    recordGame(game(2, { elapsedMs: 75_500, pours: 45, score: 600 }));
    renderScores();
    expect(statValue('Finished games')).toBe('2');
    expect(statValue('Fastest solve')).toBe('01:15');
    expect(statValue('Fewest pours')).toBe('40');
    expect(statValue('Overall score')).toBe((1_600).toLocaleString());
  });

  it('lists the games with the most recent on top', () => {
    recordGame(game(1));
    recordGame(game(3));
    recordGame(game(2));
    renderScores();

    const header = within(screen.getAllByRole('row')[0]).getAllByRole('columnheader').map((cell) => cell.textContent);
    expect(header).toEqual(['Finished at', 'Difficulty', 'Time', 'Pours', 'Seed']);
    // In the order they were recorded, newest first, whatever their finish times say.
    expect(rows().map(cells)).toEqual(
      [2, 3, 1].map((n) => [
        formatDateTime(game(n).finishedAt),
        'Medium',
        `01:0${n}`,
        String(20 + n),
        shortSeedCode(encodeSeed(game(n).seed)),
      ]),
    );
  });

  it('loads older games page by page', async () => {
    const total = SCORES_PAGE_SIZE * 2 + 5;
    for (let n = 1; n <= total; n++) recordGame(game(n));
    renderScores();
    const firstSeed = () => within(rows()[0]).getByRole('button');
    const lastSeed = () => within(rows().at(-1)!).getByRole('button');

    expect(rows()).toHaveLength(SCORES_PAGE_SIZE);
    expect(firstSeed()).toHaveAccessibleName(`Play game ${encodeSeed(game(total).seed)}`);

    await userEvent.click(screen.getByRole('button', { name: 'Load older games' }));
    expect(rows()).toHaveLength(SCORES_PAGE_SIZE * 2);

    await userEvent.click(screen.getByRole('button', { name: 'Load older games' }));
    expect(rows()).toHaveLength(total);
    expect(lastSeed()).toHaveAccessibleName(`Play game ${encodeSeed(game(1).seed)}`);
    expect(screen.queryByRole('button', { name: 'Load older games' })).not.toBeInTheDocument();
  });

  it('plays a listed game straight away when nothing is in progress', async () => {
    recordGame(game(7));
    const { onPlay } = renderScores(false);
    await userEvent.click(screen.getByRole('button', { name: `Play game ${encodeSeed(game(7).seed)}` }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onPlay).toHaveBeenCalledWith(game(7).seed);
  });

  it('asks before replacing a game in progress', async () => {
    recordGame(game(7));
    const { onPlay } = renderScores(true);
    const seedButton = screen.getByRole('button', { name: `Play game ${encodeSeed(game(7).seed)}` });

    await userEvent.click(seedButton);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onPlay).not.toHaveBeenCalled();

    await userEvent.click(seedButton);
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Play this game?' })).getByRole('button', { name: 'Play' }));
    expect(onPlay).toHaveBeenCalledWith(game(7).seed);
  });

  it('goes back to the menu', async () => {
    const { onBack } = renderScores();
    await userEvent.click(screen.getByRole('button', { name: 'Back to menu' }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
