# Fluid Puzzle — Rules

## Goal

Sort the fluids so that every vial contains only a single color. The puzzle is
solved when each vial is either **empty** or **completely full (4 units) of one
color**.

## Setup

- The playfield has **12 vials**.
- Each vial holds at most **4 units** of fluid.
- There are **10 distinct fluid colors**, with exactly **4 units of each color**
  (40 units in total).
- At the start, **10 vials are full** (4 units each) with the units randomly
  distributed, and **2 vials are empty**. The empty vials give the player room
  to maneuver.

### Difficulty and seeds

A new game starts by picking a difficulty, which sets how many random moves
mix the board:

| Difficulty | Shuffle moves |
| ---------- | ------------- |
| Easy       | 100           |
| Medium     | 300           |
| Hard       | 600           |

Every game has a **seed**. The same seed and difficulty always generate the
same board, so a game can be replayed or shared. The seed shown in the game is
a code: base64 of a JSON object `{"difficulty": "easy" | "medium" | "hard",
"seed": <unsigned 32-bit integer>}`. Clicking it copies it; **Load seed** on
the new-game page plays that board again.

### Generating a new game

The board is built from the seed in four steps:

1. Each of the 10 colors fills its own vial (sorted); the other 2 vials are empty.
2. **Random single-unit moves** (as many as the difficulty sets) mix the fluids. Only the capacity limits
   apply here (the source is not empty, the target is not full, and they are
   different vials); there is no stacking and no color matching.
3. Any units left in the 2 extra vials are moved at random into the first 10,
   leaving the 2 extra vials empty.
4. If a vial ended up **complete** (4 units of one color), its top unit is
   swapped with the top unit of a random other vial that has a different color
   on top. This repeats until no vial is complete, so a game never starts with
   a locked vial.

**Retry** restarts the same generated setup, with the time and pours reset.

## Pouring

A move is a single **pour** from a source vial into a target vial.

1. Only the **top** fluid of the source vial can be poured.
2. A pour is allowed only if:
   - the source vial is not empty,
   - the source vial is not **complete** (see below),
   - the source and target are different vials,
   - the target vial is not full, and
   - the target vial is **empty**, or its **top fluid has the same color** as
     the fluid being poured.
3. If the source vial has **several units of the same color stacked on top**,
   they are poured together. Pouring continues until one of these happens:
   - the next unit in the source vial is a different color,
   - the source vial is empty, or
   - the target vial is full.

   Any units that do not fit stay in the source vial.
4. A vial that is **full of a single color is complete**: it gets capped and
   is locked, so it can no longer be poured from.
5. Each successful pour counts as **one move**, regardless of how many units
   were transferred.

## Revert, reset, new game and share

The top of the play screen has these actions (next to **How to play**):

- **Revert** takes back the last pour: the units go back where they came from,
  even if that wouldn't be a legal pour (e.g. onto a different color). Pours
  can be reverted one by one back to the start. A reverted pour still counts
  towards the pour total, and the clock keeps running.
- **Reset** starts the game over from its starting position, with the clock
  and the pour count back at zero (the same as **Retry** after a game over).
- **New game** asks for confirmation, then starts a new random board on the
  same difficulty as the current game. (To pick another difficulty, start the
  new game from the menu.)
- **Share** shares a link to the current board: the page address with a
  `game_hash` parameter holding the game's seed code. On touch devices
  (phones, tablets) it opens the system share sheet; in a desktop browser, or
  without a share sheet, it copies just the link to the clipboard.

The **New game** buttons on the end screens work the same way: after a game
over it asks for confirmation (the board could still be retried), after a
solve it starts the next board straight away, since nothing is lost.

### Continue

The menu offers **Continue** while a game is in progress: it has had at least
one pour and isn't solved. A board that hasn't been poured on yet (its clock
hasn't started) doesn't count, so the menu offers no Continue for it, and
starting another game or playing one from **Scores** doesn't ask first.

### Shared links

Opening the game with a valid `game_hash` parameter starts that board right
away, replacing any game in progress. The parameter is then removed from the
address, so reloading the page doesn't start the board over. An invalid code
is removed too, and the game opens on the menu as usual.

## Winning and losing

The puzzle is **solved** as soon as every vial is either empty or holds 4 units
of a single color.

The game is **over** when the puzzle is not solved and no legal pour is left.
While a vial is empty, there is always a legal pour, so this can only happen
once every vial holds some fluid.

## Time

The clock starts with the first pour. It pauses while the player is in the
menu, reading **How to play**, or the page is hidden, and stops when the game
is solved or over.

## Scoring

The score rewards solving the puzzle **quickly** and with **few pours**. It is
calculated when the puzzle is solved and shown on the success screen, not
during play:

```
score = max(10, 1000 − 5 × ⌊seconds / 5⌋ − 10 × (pours − 1))
```

- `seconds` — the whole seconds on the clock (see **Time**) when the puzzle is
  solved. Every full **5 seconds** cost **5 points**.
- `pours` — the number of successful pours, including reverted ones. Every pour
  **after the first** costs **10 points**.

A solve in 1 pour and under 5 seconds earns the full **1 000 points**. A solved
puzzle is always worth at least **10 points**.

## Scores

Every solved game is stored in the browser (`localStorage`) and kept forever,
so the full history can always be read back. Each entry holds when the game
was finished, the time, the pours, the score and the game's seed, which
includes its difficulty. Games that
end in a game over are not recorded.

A separate **statistics** summary is stored next to the history:

- **Finished games** — the number of solved games.
- **Fastest solve** — the shortest solve time.
- **Fewest pours** — the fewest pours in a solve.
- **Overall score** — the sum of the scores of every solved game.

The **Scores** screen in the menu shows the statistics and lists the games,
the most recent first: finished at, difficulty, time, pours, score and seed. It shows
10 games at first; **Load older games** at the bottom adds 10 more each time. Clicking
a seed starts that board again (asking first if a game is in progress).
