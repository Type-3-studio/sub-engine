# Sub-Engine — Agent Guide

## Architecture Decisions

### Core Pillars
- **AI-first, pure-data ECS** — no classes, no inheritance, no OOP. Entities are integers, components are flat JSON objects.
- **Headless-first** — simulation runs in Node.js. Graphics (PixiJS) is a separate view bridge added last.
- **Stateless systems** — systems are pure functions: `(registry) => registry`. Zero internal state.

### Why plain objects (not bitECS)
1. **AI transparency** — every debug dump is clean JSON the agent can read instantly
2. **Zero custom serialization** — `JSON.stringify` / `JSON.parse` works natively
3. **Dynamic schemas** — add/remove fields freely, no pre-allocation of typed arrays
4. **Upgrade path** — columnar storage (`TypedArray`) can be swapped in later behind the same public API if profiling proves necessary

### Code Conventions
- **ES Modules** (`import`/`export`) everywhere
- **Factory functions** over classes — `createRegistry()` not `new Registry()`
- **Pure data copies** — `getComponent`, `getEntitiesWith`, `getAllEntities` return fresh object copies to prevent accidental mutation
- **Error-first validation** — throw descriptive errors on invalid operations
- **No comments in source** — keep code self-documenting; use this `AGENTS.md` for rationale

### Component Schema Rules
- Every component must be registered via `registerSchema(name, fields)` before use
- Fields define `{ type, required }` — supported types: `number`, `string`, `boolean`, `integer`, `array`
- Schemas are validated on every `addComponent` call

## Project Structure

```
src/
  engine/             # ★ Core ECS — copy as-is, never edit
    index.js
    Registry.js
    schemas.js
  common/             # ★ Reusable utilities — import, extend, improve
    index.js
    responsive.js     #   Responsive scaling for any screen
  game/               # ★ GAME FOLDER — replace entirely for new games
    config/
      towerDefense.js
    systems/
      EnemySystem.js
      TowerSystem.js
      ProjectileSystem.js
      WaveSystem.js
  client/             # ★ GAME FOLDER — replace entirely for new games
    towerDefense/
      main.js
      gameScene.js
      ui.js
demos/                # Legacy demos (Phase 4 reference)
  phase4/
    PixiViewBridge.js
    main.js
index.html            # Vite entry
tests/
  testRegistry.js
  testNavigation.js
  simRunner.js
state.md              # Progress tracking
AGENTS.md             # This file — agent conventions
```

### Template usage
To start a new game:
```bash
cp -r /path/to/sub /path/to/new-game
# Then replace src/game/ and src/client/ with your game's code
# Keep src/engine/ and src/common/ as-is
```

### System Conventions
- Systems are standalone exported functions: `function name(registry) { ...; return registry }`
- Systems never hold internal state — they read from registry, mutate via `addComponent`, return the registry
- System ordering is managed by the caller (e.g. `gameScene.js`); systems themselves don't know about each other
- Cross-system communication happens through shared component data only
- Systems use `getEntitiesWith` to filter, `getComponent` to read, `addComponent` to write

### Critical PixiJS Input Rule
When the game uses a scaled virtual container for responsive layout:
- Do NOT attach pointer handlers to children of the scaled container
- Do NOT use `hitArea` on the scaled container or transparent overlays
- Instead: listen on `app.stage`, convert via `container.toLocal(new Point(e.clientX, e.clientY), app.stage)`, then check bounds manually
- This reliably handles all transforms (scale, position) without coordinate drift

## Running Tests
```bash
node tests/testRegistry.js              # Engine unit tests
node tests/testNavigation.js            # Map/flow field tests
node tests/simRunner.js                 # Headless simulation
npm run dev                             # Tower defense (browser)
```
All scripts exit with code 0 on pass, 1 on failure.
