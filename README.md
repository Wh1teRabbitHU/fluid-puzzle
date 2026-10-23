![Fluid Puzzle: twelve vials of mixed colors waiting to be sorted](.github/screenshot.png)

# fluid-puzzle

### ▶ [Play Fluid Puzzle in your browser](https://wh1terabbithu.github.io/fluid-puzzle/)

Fluid Puzzle is a game written in typescript for simple web usage

A vial-sorting puzzle game. See [RULES.md](RULES.md) for the rules and scoring.

## Development

```sh
npm install
npm run dev      # dev server with hot reload
npm run build    # type-check and build to dist/
npm run build:docs  # type-check and build to docs/ (the published site)
npm run serve    # rebuild dist/ on change and serve it at http://localhost:4173
npm test         # run the unit tests once
npm run test:watch  # re-run the tests on change
```

The build outputs `dist/index.html` and a single `dist/app.js` (React, game logic and CSS
bundled together). `dist/index.html` can be opened directly from disk or served statically —
there is no backend.

## Publishing

The game is published with GitHub Pages from the `docs/` folder on `master`. The pre-commit
hook (`.githooks/pre-commit`) runs the tests before every commit; on `master` it then rebuilds
`docs/` and adds it to the commit, so every pushed commit carries an up-to-date build.
