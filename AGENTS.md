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
  engine/           # Core ECS: Registry, schemas, validation
    index.js        # Barrel exports
    Registry.js     # Entity/component store
    schemas.js      # Schema definitions + validation
    MapLoader.js    # 2D JSON matrix → walkable grid
    FlowFieldNav.js # BFS + differentiation flow field pathfinding
  game/
    config/
      towerDefense.js  # Tower types, waves, map layout, waypoints
    systems/         # Stateless system functions
      MovementSystem.js
      CombatSystem.js
      EnemySystem.js     # Path following + lives
      TowerSystem.js     # Targeting + firing
      ProjectileSystem.js # Homing + damage + rewards
      WaveSystem.js      # Wave spawning + completion
  simulation/
    simRunner.js    # Headless game loop
  client/
    PixiViewBridge.js  # Sprite pool, sync, lerp render (legacy)
    main.js            # PIXI app entry (legacy Phase 4)
    towerDefense/
      main.js         # Tower defense entry point
      gameScene.js    # Map, placement, game loop, entity visuals
      ui.js           # HUD + build menu
index.html          # Vite entry (loads tower defense)
testRegistry.js     # Phase 1 validation script
testNavigation.js   # Phase 3 validation script
state.md            # Progress tracking
AGENTS.md           # This file — agent conventions
```

### System Conventions
- Systems are standalone exported functions: `function name(registry) { ...; return registry }`
- Systems never hold internal state — they read from registry, mutate via `addComponent`, return the registry
- System ordering is managed by the caller (e.g. `simRunner.js`); systems themselves don't know about each other
- Cross-system communication happens through shared component data only
- Systems use `getEntitiesWith` to filter, `getComponent` to read, `addComponent` to write

## Running Tests
```bash
node testRegistry.js           # Phase 1: registry/schema unit tests
node src/simulation/simRunner.js  # Phase 2: headless simulation
node testNavigation.js         # Phase 3: map/flow field tests
npm run dev                    # Tower defense (browser)
```
All scripts exit with code 0 on pass, 1 on failure.
