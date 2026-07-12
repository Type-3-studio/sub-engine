# Sub-Engine Monorepo — Agent Guide

## Stack
- **Sub-Engine**: AI-first, pure-data ECS 2D engine — split into two packages
  - `@sub-engine/core` — headless ECS (zero browser deps)
  - `@sub-engine/pixi` — PixiJS 8 rendering bridge (depends on core)
- **TypeScript**: strict mode, ES modules
- **PixiJS 8**: rendering (only in `@sub-engine/pixi`)
- **Vite**: dev server + build
- **Vitest**: testing (201 tests)

## Project Structure

```
├── packages/
│   ├── core/                    # @sub-engine/core (published)
│   │   ├── src/
│   │   │   ├── engine/          #   Core ECS — never edit
│   │   │   │   ├── index.ts     #     Barrel exports
│   │   │   │   ├── types.ts     #     Registry, ComponentMap, Entity, etc.
│   │   │   │   ├── Registry.ts / ColumnarRegistry.ts
│   │   │   │   ├── schemas.ts   #     Runtime schema validation + 4 built-in schemas
│   │   │   │   ├── MapLoader.ts / FlowFieldNav.ts / Pathfinding.ts
│   │   │   │   └── TiledMapLoader.ts
│   │   │   └── common/          #   Reusable utilities — import, extend
│   │   │       ├── index.ts     #     Barrel exports (headless only)
│   │   │       ├── GameLoop.ts / createEntity.ts / SpatialGrid.ts
│   │   │       ├── AudioManager.ts / UndoStack.ts
│   │   │       └── systems/     #     Headless ECS systems
│   │   │           ├── MovementSystem.ts / CombatSystem.ts
│   │   │           ├── CameraSystem.ts / CollisionSystem.ts
│   │   │           ├── ZOrderSystem.ts / TileMapSystem.ts
│   │   │           ├── PathfindingSystem.ts / AudioSystem.ts
│   │   │           └── ParticleSystem.ts
│   │   ├── dist/                # Built output (tsc)
│   │   └── package.json         # @sub-engine/core
│   ├── pixi/                    # @sub-engine/pixi (published)
│   │   ├── src/
│   │   │   ├── index.ts         #   Barrel (re-exports nothing from core)
│   │   │   └── common/
│   │   │       ├── responsive.ts      # createResponsiveContainer
│   │   │       ├── spriteLoader.ts     # createAnimManager
│   │   │       ├── TiledMapRenderer.ts # createTiledMapRenderer
│   │   │       └── DebugOverlay.ts     # DebugOverlay
│   │   ├── dist/                # Built output (tsc)
│   │   └── package.json         # @sub-engine/pixi
│   └── create-app/              # create-sub-engine CLI (published)
│       ├── src/index.js         #   CLI script
│       ├── template/            #   Standalone game skeleton
│       └── package.json
├── games/                       # Reference implementations (study these)
│   ├── tower-defense/           #   Complete tower defense (fully typed)
│   ├── castle/                  #   Castle management simulation
│   ├── movement-demo/           #   Flow field navigation
│   ├── combat-demo/             #   Archers vs melee combat
│   ├── map-demo/                #   Interactive map + pathfinding
│   ├── input-demo/              #   Scaled container input handler
│   ├── serialization-demo/      #   Save/load registry state
│   ├── character-demo/          #   Animated character sprite sheets
│   ├── tilemap-demo/            #   Tiled map integration
│   ├── camera-demo/             #   Camera follow, zoom, collision
│   ├── scrap-caravan/           #   Headless sim, economy, flow field drones
│   ├── scrap-swarm/             #   Large-scale RTS swarm combat (stress test)
│   ├── my-rpg/                  #   Altar-defender RPG with composite visuals
│   └── red-alert-clone/         #   C&C-inspired RTS
├── docs/                        # Architecture docs, retrospectives, plans
│   ├── scrap-swarm-retrospective.md
│   ├── engine-review-summary.md
│   └── architecture/            #   ADRs, RFCs, technical debt register
├── tests/                       # Engine tests (201 vitest tests)
├── src/                         # Root dev playground
│   ├── game/                    #   Template game code
│   └── client/                  #   Template client code
├── tsconfig.json                # Workspace root config + path aliases
├── vite.config.js               # Vite config + resolve aliases
├── vitest.config.ts             # Vitest config + resolve aliases
└── package.json                 # Workspace root
```

## Import Rules

| Package | Import from | Examples |
|---------|-------------|---------|
| Game systems (headless) | `@sub-engine/core` | `createRegistry`, `movementSystem`, `Registry` type |
| Client rendering | `@sub-engine/pixi` | `createResponsiveContainer`, `DebugOverlay` |
| Both in one file | Both | core for registry, pixi for rendering |

```ts
import { createRegistry, movementSystem } from '@sub-engine/core'
import { createResponsiveContainer, DebugOverlay } from '@sub-engine/pixi'
```

## Conventions

### ECS
- Entities are integers. Components are flat JSON objects. Systems are pure functions.
- **Systems**: `(registry: Registry<M>, dt: number) => Registry<M>`
- Read with `getEntitiesWith([SCHEMA.X, SCHEMA.Y])` — typed destructuring
- Write with `registry.addComponent(id, SCHEMA.X, data)`
- Never import pixi.js from `game/` systems (headless-first)

### Contract File
`game/contract.ts` is the single source of truth for each game:
1. Define `GameComponents` interface extending `ComponentMap`
2. Register ALL schemas via `registerSchema(name, fields)` before use
3. Export `SCHEMA` object with `as const` for literal types

### Schema Constants
Always use `SCHEMA.XXX` constants — never raw strings.

### Game Loop
Use `createGameLoop()` from `@sub-engine/core` instead of inlining RAF loops:
```ts
import { createGameLoop } from '@sub-engine/core'

const loop = createGameLoop({
  tickRate: 62.5,          // fixed timestep Hz (default 60)
  maxFrameMs: 100,          // dt cap prevents spiral-of-death
  onStep: () => { /* run systems once */ },
  onFrame: (alpha) => { /* render with interpolation */ },
})
loop.start()
// loop.pause() / loop.resume() / loop.stop() / loop.step() / loop.isPaused()
```
- `pause()` freezes simulation; `onFrame` still runs for frozen rendering
- `resume()` resets internal timers — no dt explosion from stale timestamps
- `maxFrameMs` caps frame deltas (default 100ms) — protects against tab-away / lag

### DebugOverlay (Required in Every Game)
Every game's `client/main.ts` MUST wire `DebugOverlay` from `@sub-engine/pixi`. This is non-optional — DebugOverlay is the primary debugging tool for both development and AI agent inspection.

```ts
import { DebugOverlay } from '@sub-engine/pixi'

const debug = new DebugOverlay(app, () => game.getSnapshot(), () => game.togglePause())
app.ticker.add(() => debug.update())
```

#### Default Keyboard Shortcuts (Convention — Do Not Change)
These shortcuts are hard-coded in `DebugOverlay.ts` and must be identical across all games:

| Key | Action |
|-----|--------|
| **F12** or **Backtick (\`)** | Toggle overlay on/off |
| **i** | Toggle inspect mode (click entity to view components) |
| **Ctrl+I** | Pause/resume simulation |

Backtick (\`) is the fallback when F12 is captured by the browser (e.g., Chrome DevTools).

## Design Rules (locked — do not reverse)

| ID | Rule | Rationale |
|----|------|-----------|
| DDL-001 | AI-first, pure-data ECS | AI transparency, free serialization |
| DDL-002 | Headless-first (sim in Node.js) | Server-side sim, testing without browser |
| DDL-003 | Stateless pure function systems | Predictable, testable, composable |
| DDL-004 | Pure data copies on read | Prevents accidental mutation |
| DDL-005 | Schema validation on every write | Catches AI typos instantly |
| DDL-006 | Factory functions over classes | Consistency with functional ECS |
| DDL-007 | Schemas registered before use | Runtime type safety |
| DDL-008 | Common systems independent of game contracts | Reusability across games |
| DDL-009 | `destroy()` required on every PIXI removeChild | GPU memory leaks without it (see retrospective) |
| DDL-010 | Velocity always scaled by `(dt/16)` | Ensures frame-rate-independent movement |
| DDL-011 | Cache `getAllEntitiesCopy()` across iterations per frame | Each call is a full deep copy — expensive |

## Running

```bash
npm run dev                # Root dev playground
npm run dev:td             # Tower defense reference game
npm run dev:castle         # Castle simulation
npm run dev:movement       # Flow field navigation
npm run dev:combat         # Combat demo
npm run dev:map            # Map + pathfinding
npm run dev:input          # Scaled container input
npm run dev:serial         # Save/load demo
npm run dev:character      # Animated sprites
npm run dev:camera         # Camera follow
npm run dev:tilemap        # Tiled maps
npm run dev:swarm          # Scrap Swarm (stress test game)
npm run dev:scrap          # Scrap Caravan (headless sim)
npm run dev:ra             # Red Alert clone
npm run dev:rpg            # My-RPG / Altar defender
npm run typecheck          # Full type check (0 errors)
npm test                   # Run 201 engine tests
npm run build:pkgs         # Build both packages to dist/
```

## Reference Games

All reference games compile and work. They import from the correct packages:
- `@sub-engine/core` for headless systems, Registry, utilities
- `@sub-engine/pixi` for rendering, responsive container, debug overlay

**AI: Read `games/tower-defense/` first — it's the most complete reference.**

## Scaffolding a New Game

```bash
npx create-sub-engine my-game
cd my-game && npm install && npm run dev
```

The template produces a standalone project with `@sub-engine/core` and `@sub-engine/pixi` as dependencies.

## Retrospective

A full postmortem of the Scrap Swarm game is at `docs/scrap-swarm-retrospective.md` and `docs/engine-review-summary.md` — read before building new games. They document 6 memory/movement bugs found during development, their root causes, the engine gaps that allowed them, and a checklist for future games.

## Performance & Memory

### Velocity Scaling Convention
The core `movementSystem` uses `stepScale = dt / 16`, meaning **velocity values are in "units per 16ms tick"** (≈62.5 Hz reference). To convert from desired units/second:
```
velocity = desiredUnitsPerSec / 62.5
```
Always multiply velocity by `(dt / 16)` when setting it:
```ts
registry.addComponent(id, SCHEMA.VELOCITY, {
  x: direction.x * speed * (dt / 16),
  y: direction.y * speed * (dt / 16),
})
```
Without this scaling, entities move at full velocity every tick regardless of actual dt.

### PIXI Object Lifecycle — `destroy()` Required
Calling `removeChild()` or `removeChildren()` on a PIXI Container **does NOT free GPU memory**. You MUST call `destroy({ children: true })` on removed objects to prevent GPU texture leaks:
```ts
for (const child of container.removeChildren()) child.destroy()
// or individually:
entry.container.destroy({ children: true })
```
This applies to all PIXI objects: Text, Graphics, Container, Sprite.

### `getAllEntities()` is Expensive
Each call creates a **full deep copy** of every entity and every component. Cache the result when iterating multiple times per frame:
```ts
const all = registry.getAllEntities()
// reuse `all` for LOD, selection, minimap, etc.
```

## Pain Points (Lessons Learned)

### Scrap Swarm Specific Fixes (July 2026)

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Memory leak (OOM after ~30s) | `DebugOverlay.update()` created `Text` objects every frame without `destroy()` — PIXI GPU textures leaked | Changed `removeChildren()` → iterate + child.destroy() in DebugOverlay |
| Memory leak (entity death accumulation) | `entityRenderer.sync()` used `removeChild()` without `destroy()` on dead entities — PIXI containers accumulated | Added `entry.container.destroy({ children: true })` in entityRenderer sync |
| Entities moving insane speed (125+ tiles/sec) | Speed constants were ~15x too high: `WORKER_SPEED=2.0` → 125 tiles/sec on a 30-tile map | Scaled speeds: `WORKER_SPEED=0.12`, `FIGHTER_SPEED=0.14`, `ENEMY_SPEED=0.08`, projectile speed 4→0.3 |
| Worker movement ignored dt scaling | `workerSystem` set velocity as `vec * WORKER_SPEED` without multiplying by `(dt/16)` | Added `* (dt / 16)` to worker velocity (matching enemySystem and combatSystem) |
| Redundant `getAllEntities()` in onFrame | Called 3x per frame for LOD, selection, and minimap — 3x unnecessary deep copies | Cached result in `const allEntities = registry.getAllEntities()` and reused |
| `overlayLayer.removeChildren()` leak | Selection highlight `Graphics` object removed from display list but not destroyed | Changed to iterate + child.destroy() |
