# Open World Sky — working rules

Browser No Man's Sky clone. Plain ES modules, three.js r169 vendored at `vendor/three.module.js`,
no build step, every asset procedural. `PRD.md` is the scope doc and the feature list.

## More than one agent works in this repo at a time

Sessions run in parallel on the same working tree. Assume another agent is editing files you are
not, in the same minute.

- **Never stage the whole tree.** No `git add -A`, no `git add .`, no `git commit -a`. Stage the
  exact paths you touched: `git add src/duel PRD.md`. Broad staging has already swept unrelated
  in-progress work into commits whose message says something else entirely.
- **Re-read before editing** a file you read more than a few minutes ago; it may have moved under
  you. Prefer adding a new module over editing a shared one.
- **One import + one array entry per feature** in `src/game/addons.js` and
  `src/gameplay/world-addons.js`, so two agents adding features never collide on the same line.
- Commit and push only when the user asks.

## Architecture

- Max 300 lines per file, max 30 lines per function. A file approaching the limit gets split.
- Features attach as addons, never by editing the core:
  - **Meta addon** (`src/game/addons.js`) — runs every playing frame in space and on a planet,
    receives the input, owns panels and HUD. State persists in `wiring.log.s.<name>`.
  - **World addon** (`src/gameplay/world-addons.js`) — mounted on every landing, disposed on
    take-off. Receives the surface gameplay ctx.
  - A feature that needs both halves bridges them with a plain shared object, never an import
    cycle: see `src/raid/raid-world-link.js`, `src/mech/mech-link.js`, `src/duel/duel-link.js`.
- New hostiles plug into the damage paths that already exist rather than adding their own:
  a `combat.pirates` entry in space (see `src/raid/boss-part.js`, `src/duel/rival-space.js`),
  a Wildlife group on the ground (see `src/raid/surface-boss.js`, `src/duel/rival-ground.js`).
- All player-facing text is Indonesian. Code, comments and commit messages are English.

## Running and testing

```bash
python3 -m http.server 8765          # then open http://localhost:8765
```

`window.__game` drives the game from a console or a headless browser:
`land(planet)`, `arrive(planet)`, `takeOff()`, `warpTo(i)`, `start()`, plus `player`, `space`,
`surface`, `spaceMode`, `surfaceMode`, `app`.

Headless runs need `__game.input.locked = true`, or the game counts itself as paused and nothing
moves. Use playwright-core against system Chrome with `--use-angle=metal`.

Feature debug handles follow the same shape: `__raid`, `__duel`, `__mech`.
