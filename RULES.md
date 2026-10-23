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

### Generating a new game

Every new game gets a fresh random setup, built in three steps:

1. Each of the 10 colors fills its own vial (sorted); the other 2 vials are empty.
2. **50 random single-unit moves** mix the fluids. Only the capacity limits
   apply here (the source is not empty, the target is not full, and they are
   different vials); there is no stacking and no color matching.
3. Any units left in the 2 extra vials are moved at random into the first 10,
   leaving the 2 extra vials empty.

**Retry** restarts the same generated setup, with the time and pours reset.

## Pouring

A move is a single **pour** from a source vial into a target vial.

1. Only the **top** fluid of the source vial can be poured.
2. A pour is allowed only if:
   - the source vial is not empty,
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
4. Each successful pour counts as **one move**, regardless of how many units
   were transferred.

## Winning and losing

The puzzle is **solved** as soon as every vial is either empty or holds 4 units
of a single color.

The game is **over** when the puzzle is not solved and no legal pour is left.
While a vial is empty, there is always a legal pour, so this can only happen
once every vial holds some fluid.

## Time

The clock starts with the first pour. It pauses while the player is in the
menu or the page is hidden, and stops when the game is solved or over.

## Scoring

The score rewards solving the puzzle **quickly** and with **few pours**. It is
calculated when the puzzle is solved:

```
score = max(100, 10 000 − 5 × seconds − 20 × pours)
```

- `seconds` — the time on the clock (see **Time**) when the puzzle is solved.
- `pours` — the number of successful pours.

Every second costs 5 points and every pour costs 20 points, so one pour is
worth about four seconds of thinking. A solved puzzle is always worth at least
100 points. The constants may be tuned as the game evolves.
