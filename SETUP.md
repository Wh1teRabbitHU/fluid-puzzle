# Fluid Puzzle — Setup

How to build, test and publish the game. For the game itself, see the [README](README.md); the
full rules are in [RULES.md](RULES.md).

## Requirements

- [Node.js](https://nodejs.org/) with npm

The game is written in TypeScript with React and built with Vite. There is no backend: the
game runs entirely in the browser and keeps its save in `localStorage`.

## Development

```sh
npm install
npm run dev      # dev server with hot reload
npm run build    # type-check and build to dist/
npm run build:docs  # type-check and build to docs/ (the published site)
npm run serve    # rebuild dist/ on change and serve it at http://localhost:4173
npm test         # run the unit tests once
npm run test:watch  # re-run the tests on change
npm run typecheck   # type-check only
```

The build outputs `dist/index.html` and a single `dist/app.js` (React, game logic and CSS
bundled together). `dist/index.html` can be opened directly from disk or served statically.

## Project layout

| Path              | Contents                                                        |
| ----------------- | --------------------------------------------------------------- |
| `src/game/`       | Game logic: board generation, pouring rules, seeds, saving      |
| `src/components/` | React screens and dialogs (menu, play field, how to play, …)    |
| `src/test/`       | Shared test boards, queries and setup                           |
| `public/`         | Static files copied into every build (favicon, `.nojekyll`)     |
| `scripts/`        | Helper scripts (`serve.mjs`)                                    |
| `.githooks/`      | The pre-commit hook                                             |
| `docs/`           | The generated site served by GitHub Pages (don't edit by hand)  |

Tests live next to the code they cover (`*.test.ts` / `*.test.tsx`) and run with Vitest and
Testing Library in jsdom.

## Publishing

The game is published with GitHub Pages from the `docs/` folder on `master`. The pre-commit
hook (`.githooks/pre-commit`, enabled by `npm install`) runs the tests before every commit; on
`master` it then rebuilds `docs/` and adds it to the commit, so every pushed commit carries an
up-to-date build. Skip the hook once with `git commit --no-verify`.

To set up Pages on a fork: **Settings → Pages**, deploy from branch `master`, folder `/docs`.
