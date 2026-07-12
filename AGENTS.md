# Sub-Engine Monorepo — Agent Guide

## Stack
- **Sub-Engine**: AI-first, pure-data ECS 2D engine — split into two packages
  - `@sub-engine/core` — headless ECS (zero browser deps)
  - `@sub-engine/pixi` — PixiJS 8 rendering bridge (depends on core)
- **TypeScript**: strict mode, ES modules
- **PixiJS 8**: rendering (only in `@sub-engine/pixi`)
- **Vite**: dev server + build
- **Vitest**: testing (187 tests)

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
│   └── camera-demo/             #   Camera follow, zoom, collision
├── tests/                       # Engine tests (187 vitest tests)
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

### Debug
- F12 toggles `DebugOverlay` (FPS, entity list, inspect mode)
- I key + click to inspect entity component data

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
npm run typecheck          # Full type check (0 errors)
npm test                   # Run 187 engine tests
npm run build:pkgs         # Build both packages to dist/
```

## Reference Games

All 10 reference games compile and work. They import from the correct packages:
- `@sub-engine/core` for headless systems, Registry, utilities
- `@sub-engine/pixi` for rendering, responsive container, debug overlay

**AI: Read `games/tower-defense/` first — it's the most complete reference.**

## Scaffolding a New Game

```bash
npx create-sub-engine my-game
cd my-game && npm install && npm run dev
```

The template produces a standalone project with `@sub-engine/core` and `@sub-engine/pixi` as dependencies.
