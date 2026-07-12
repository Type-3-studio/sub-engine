# Sub-Engine — Agent Guide

## Architecture Decisions

### Core Pillars
- **AI-first, pure-data ECS** — no classes, no inheritance, no OOP. Entities are integers, components are flat JSON objects.
- **Headless-first** — simulation runs in Node.js. Graphics (PixiJS) is a separate view bridge added last.
- **Stateless systems** — systems are pure functions: `(registry) => registry`. Zero internal state.

### Why TypeScript (migrated from JS)
- **Compile-time safety** — `getComponent(id, 'Position')` returns typed `{x: number, y: number}` instead of `any`
- **AI agent intelligence** — `.d.ts` files give AI agents exact type shapes without running code
- **Self-documenting contracts** — the `ComponentMap` interface in `contract.ts` is the single source of truth for all component shapes
- **Zero cost** — types are erased at compile time, runtime behavior unchanged

### Why plain objects (not bitECS) — still true
1. **AI transparency** — every debug dump is clean JSON the agent can read instantly
2. **Zero custom serialization** — `JSON.stringify` / `JSON.parse` works natively
3. **Dynamic schemas** — add/remove fields freely, no pre-allocation of typed arrays
4. **Upgrade path** — columnar storage (`TypedArray`) can be swapped in later behind the same public API if profiling proves necessary

### Code Conventions
- **ES Modules** (`import`/`export`) everywhere
- **Factory functions** over classes — `createRegistry()` not `new Registry()`
- **Pure data copies** — `getComponent`, `getEntitiesWith`, `getAllEntities` return fresh object copies to prevent accidental mutation
- **Error-first validation** — throw descriptive errors on invalid operations
- **No comments in source** — keep code self-documenting; use this `AGENTS.md` and `src/game/contract.ts` for rationale

### TypeScript Conventions
- **All source files are `.ts`** — no `.js` allowed in `src/` or `games/`
- **Imports use `.js` extension** — `import { X } from './foo.js'` resolves to `./foo.ts` via `moduleResolution: "bundler"`
- **Every game defines a `ComponentMap` interface** in its `contract.ts` — this is what parameterizes `Registry<M>`
- **SCHEMA objects use `as const`** to preserve string literal types for the generic registry
- **Systems are typed** as `(registry: Registry<GameComponents>) => Registry<GameComponents>`
- **Avoid type assertions** (`as T`) where possible — prefer proper generics
- **Built-in types** live in `src/engine/types.ts` — `Registry`, `ComponentMap`, `EntityWith`, `Entity`, `GameMap`, `FlowField`, `Vec2`

### Component Schema Rules
- Every component must be registered via `registerSchema(name, fields)` before use (runtime validation)
- Every component must have a corresponding entry in the game's `ComponentMap` interface (compile-time typing)
- Fields define `{ type, required }` — supported runtime types: `number`, `string`, `boolean`, `integer`, `array`
- Schemas are validated on every `addComponent` call
- **Register schemas in your game's `contract.ts`** — this is the single source of truth

### Schema Name Constants
- Always use `SCHEMA.XXX` constants from your game's `contract.ts` instead of raw strings
- This eliminates typos: `SCHEMA.POSITION` vs `'Positon'`
- Import: `import { SCHEMA } from '../contract.js'`
- Usage: `registry.getEntitiesWith([SCHEMA.POSITION, SCHEMA.VELOCITY])`

### Registry Generic Pattern
```ts
// game/contract.ts
export interface MyComponents {
  'Position': { x: number; y: number }
  'Player': { name: string; health: number }
}

// game/system/MySystem.ts
import type { Registry } from '../../../src/engine/types.js'

export function mySystem(registry: Registry<MyComponents>): Registry<MyComponents> {
  const entities = registry.getEntitiesWith(['Position', 'Player'])
  // entities: Array<{ id: number } & { Position: MyComponents['Position']; Player: MyComponents['Player'] }>
  for (const { id, Position, Player } of entities) {
    // Position.x is typed as number
    // Player.name is typed as string
  }
  return registry
}
```

## Project Structure

```
sub-engine/
├── index.html              # Template entry — Vite resolves .js imports to .ts
├── tsconfig.json           # TypeScript config (strict, noEmit, bundler resolution)
├── src/
│   ├── engine/             # ★ Core ECS — copy as-is, never edit
│   │   ├── index.ts        #   Barrel exports
│   │   ├── types.ts        #   Core type definitions (Registry, ComponentMap, etc.)
│   │   ├── Registry.ts     #   Generic entity/component store
│   │   ├── schemas.ts      #   Runtime schema validation + 4 built-in schemas
│   │   ├── MapLoader.ts    #   2D matrix → walkable grid
│   │   ├── FlowFieldNav.ts #   BFS integration → flow vectors
│   │   └── TiledMapLoader.ts #   Tiled JSON parser + GameMap converter
│   ├── common/             # ★ Reusable utilities — import, extend
│   │   ├── index.ts        #   Barrel exports
│   │   ├── responsive.ts   #   Responsive scaling for any screen
│   │   ├── spriteLoader.ts #   PNG sequence → AnimatedSprite loader
│   │   ├── TiledMapRenderer.ts #   PixiJS tilemap rendering (spritesheet + collection-of-images)
│   │   └── systems/        #   Generic reusable ECS systems
│   │       ├── MovementSystem.ts  # Position + Velocity → move entity
│   │       ├── CombatSystem.ts    # TargetScanner → damage Health
│   │       └── TileMapSystem.ts   # Tile map utility (getTileAt, setTileAt)
│   ├── game/               # ★ TEMPLATE — replace entirely for your game
│   │   ├── contract.ts     #   Contract file: ComponentMap + schema registrations
│   │   ├── config/
│   │   │   └── _example.ts
│   │   └── systems/
│   │       └── _example.ts
│   └── client/             # ★ TEMPLATE — replace entirely for your game
│       └── main.ts         #   Minimal PixiJS setup
├── games/                  # Reference implementations (study these)
│   ├── tower-defense/      #   Complete tower defense game (fully typed)
│   │   ├── index.html
│   │   ├── game/           #     ECS: contract.ts, config, systems
│   │   └── client/         #     PixiJS: main.ts, scene, UI
│   ├── movement-demo/       #   Flow field navigation demo
│   ├── combat-demo/         #   Archers vs melee combat demo
│   ├── map-demo/            #   Interactive map + pathfinding demo
│   ├── input-demo/          #   Scaled container input handler demo
│   ├── serialization-demo/  #   Save/load registry state demo
│   ├── character-demo/      #   Animated character with sprite sheets
│   ├── tilemap-demo/        #   Tile map demo (Tiled integration)
│   └── castle/             #   Castle management game (WIP, still .js)
├── PNG Tiles/               # 89 summer-themed tile PNGs (56 ground + 33 props)
├── tests/
│   ├── testRegistry.ts     # Engine unit tests (45)
│   ├── testNavigation.ts   # Map/flow field tests (23)
│   ├── simRunner.ts        # Headless flow-field simulation
│   └── testTiledMapLoader.ts # Tiled map loader tests (40)
├── ROADMAP.md
├── AGENTS.md               # This file
└── vite.config.js
```

### Template usage
To start a new game:
```bash
cp -r /path/to/sub-engine /path/to/my-game
cd /path/to/my-game
npm install
# Then:
#   1. Edit src/game/contract.ts — define ComponentMap interface + register schemas
#   2. Replace src/game/config/   — your game config
#   3. Replace src/game/systems/  — your ECS systems (typed with your ComponentMap)
#   4. Replace src/client/        — your rendering + UI
# Keep src/engine/ and src/common/ as-is
```

### The Contract File
`src/game/contract.ts` is the **most important file for AI**. It:
1. Defines the `ComponentMap` interface (TypeScript compile-time type)
2. Registers ALL game-specific component schemas (runtime validation)
3. Exports `SCHEMA` object with `as const` for literal types (prevents typos)
4. Documents every schema with field types
5. Documents the system function contract
6. Documents the game loop pattern
7. Documents the rendering pattern

**AI: Read `src/game/contract.ts` first before writing any game code.**
**Study `games/tower-defense/` for a complete working reference.**

### System Conventions
- Systems are standalone exported functions: `function name(registry: Registry<M>): Registry<M>`
- Systems are typed with the game's `ComponentMap` interface
- Systems never hold internal state — they read from registry, mutate via `addComponent`, return the registry
- System ordering is managed by the caller (e.g. `main.ts`); systems themselves don't know about each other
- Cross-system communication happens through shared component data only
- Systems use `getEntitiesWith` to filter, `getComponent` to read, `addComponent` to write
- Systems import `{ SCHEMA }` from their game's `contract.js` for all component name references

### Critical PixiJS Input Rule
When the game uses a scaled virtual container for responsive layout:
- Do NOT attach pointer handlers to children of the scaled container
- Do NOT use `hitArea` on the scaled container or transparent overlays
- Instead: listen on `app.stage`, use `FederatedPointerEvent`, convert via `container.toLocal(new Point(e.clientX, e.clientY), app.stage)`, then check bounds manually
- Import `FederatedPointerEvent` from `pixi.js` for proper event typing

## Tile Map Architecture

### Tiled Compatibility
The engine fully supports [Tiled](https://www.mapeditor.org/) map editor export. The workflow:
1. Create/edit maps in Tiled → export as JSON (.tmj + .tsj)
2. Place JSON files in `games/<your-game>/assets/`
3. Load at runtime: `const map = await loadTiledMap('./assets/my-map.tmj')`

**Key files:**
- `src/engine/TiledMapLoader.ts` — Parse Tiled JSON format (`.tmj`/`.tsj`), resolve external tilesets, convert to `GameMap` for pathfinding
- `src/common/TiledMapRenderer.ts` — PixiJS rendering: loads tileset textures (supports spritesheet and collection-of-images), renders layered tilemaps
- `src/common/systems/TileMapSystem.ts` — Headless ECS system for tile map data (empty by default, extend for game-specific tile logic)

**Tileset formats supported:**
- **Single image spritesheet** — Tileset has `image`, `imagewidth`, `imageheight`, `columns`
- **Collection of images** — Tileset has `tiles` array with `{id, image}` per tile
- **External TSJ files** — TMJ references `.tsj` file via `"source"` field (loaded recursively)

### Loading API
```ts
// From URL (resolves external tilesets automatically):
const tiledMap = await loadTiledMap('./assets/map.tmj')

// From JSON string:
const json = await fetch('./assets/map.tmj').then(r => r.text())
const tiledMap = parseTiledMap(json, './assets')

// Convert to GameMap for pathfinding:
const gameMap = tiledMapToGameMap(tiledMap, 'ground') // uses 'ground' layer
```

### PixiJS Rendering (with scale)
```ts
import { createTiledMapRenderer } from '../../../src/common/index.js'

// Scale = 0.25 renders 256px tiles as 64px on screen
const renderer = await createTiledMapRenderer(tiledMap, 0.25)
container.addChild(renderer.container)
// later: renderer.destroy()
```

### Procedural Map Creation
```ts
import { createProceduralMap } from '../../../src/common/index.js'

const map = createProceduralMap(12, 10, 256, (x, y) => {
  if (x === 0 || y === 0) return 1  // GID 1 = grass
  return 0 // empty
})
```

### ECS Integration
Store the parsed map as a `TileMap` component on a world entity:
```ts
registry.addComponent(worldEntity, SCHEMA.TILE_MAP, tiledMapData)
// Then read it in systems:
const mapData = registry.getComponent(worldEntity, SCHEMA.TILE_MAP)
```

## Asset Sizing Conventions (PNG Tiles)

The `PNG Tiles/` folder contains 256×256 ground tiles and larger props (up to 480×640). To keep maps at a reasonable screen size, use a `RENDER_SCALE` factor:

| Setting | Tile (px) | 12×10 map (px) | Use case |
|---------|-----------|----------------|----------|
| `RENDER_SCALE = 1.0` | 256 | 3072×2560 | Full-res, very large |
| `RENDER_SCALE = 0.5` | 128 | 1536×1280 | High-res, large map |
| `RENDER_SCALE = 0.25` | 64 | 768×640 | Good default |

The responsive container (`createResponsiveContainer`) then scales the virtual game area to fit the viewport — so the game looks correct at any screen size.

**Asset pipeline options** (from easiest to most performant):

1. **Symlink + collection-of-images** (current default) — Symlink `assets/tiles/ → ../../PNG Tiles/`, TSJ references individual `./tiles/*.png`. No preprocessing, works with any tile count. Used by the tilemap-demo reference game.

2. **Spritesheet** — Run `scripts/build-tileset.mjs` (requires `sharp`) to stitch all tiles into a single PNG with a standalone TSJ. One HTTP request for all tiles. More complex setup but better for production.

3. **Tiled workflow** — Create tilemaps in Tiled editor, export as `.tmj`+`.tsj`, place in `assets/`. The engine loads them at runtime. Edit → export → refresh — no code changes needed for map layout.

**How to export from Tiled:**
1. Open your map in Tiled.
2. In the tileset panel, make sure tilesets reference `./tiles/` for images (or use the standalone spritesheet).
3. File → Export As → choose `JSON (Tiled Map) (*.tmj)`.
4. Save to `games/<your-game>/assets/`.
5. The engine's `loadTiledMap(url)` fetches the `.tmj`, recursively resolves external `.tsj` files, and converts to `TiledMapData`.
6. If you added/changed layers, update the layer name in `tiledMapToGameMap(tiledMap, 'ground')`.
7. Refresh the browser — no build step needed.

### Demo (`games/tilemap-demo/`)
Complete reference implementation showing:
- Procedural map generation with ground tiles
- Tiled map loading from `.tmj`/`.tsj` files
- `RENDER_SCALE` config for controlling display size independently of source PNGs
- Interactive tile editing (click to cycle ground types)
- Flow field overlay (F key)
- Map reload (R key) / procedural map (P key)

## Running Tests
```bash
npm run typecheck                    # tsc --noEmit (full type check)
npm test                             # tsx tests/testRegistry.ts  +  tsx tests/testNavigation.ts  +  tsx tests/simRunner.ts + tsx tests/testTiledMapLoader.ts
npm run dev                          # Template (place holder)
npm run dev:td                       # Tower defense reference game
npm run dev:castle                   # Castle reference game
npm run dev:movement                 # Movement demo (flow field nav)
npm run dev:combat                   # Combat demo (archers vs melee)
npm run dev:map                      # Map demo (click walls, pathfinding)
npm run dev:input                    # Input demo (scaled container, drag)
npm run dev:serial                   # Serialization demo (save/load)
npm run dev:tilemap                  # Tile map demo (Tiled integration)
```
All test scripts exit with code 0 on pass, 1 on failure. Type checking is separate via `npm run typecheck`.

---

## Unified Action Plan (ROADMAP.md)

**`ROADMAP.md` is the canonical action plan.** Read it before every session to understand:
- Which phase we are in (see "Current Phase" dashboard)
- What tasks are pending vs complete
- What design decisions are locked (DDL entries)

**AI agents must follow these rules when working:**
1. Read `ROADMAP.md` first. Identify current phase and task.
2. Check the DDL before making any architectural choice.
3. Do not implement features from phases ahead of the current one unless explicitly asked.
4. Update `ROADMAP.md` task status when completing work.
5. Add Lessons Learned entries for anything surprising.

---

## Design Decision Log (DDL) — Quick Reference

These are locked. Do not reverse without a superseding entry in ROADMAP.md.

| ID | Decision | Rationale |
|----|----------|-----------|
| DDL-001 | AI-first, pure-data ECS (integers + flat JSON) | AI transparency, free serialization, dynamic schemas |
| DDL-002 | Headless-first (sim runs in Node.js, PixiJS is bridge) | Server-side sim, testing without browser, AI training |
| DDL-003 | Stateless pure function systems `(registry) => registry` | Predictable, testable, AI-reasoning-friendly |
| DDL-004 | Pure data copies on read (`getComponent` returns fresh copy) | Prevents accidental mutation; columnar upgrade path later |
| DDL-005 | Schema validation on every `addComponent` call | Catches AI typos/type errors instantly |
| DDL-006 | Factory functions over classes (`createRegistry()` not `new Registry`) | Consistency with functional ECS |
| DDL-007 | Component schemas registered via `registerSchema()` before use | Runtime type safety for AI-generated code |
| DDL-008 | Common systems must NOT import from `src/game/contract.js` | Reusability; use parameterized component names instead |

---

## Architectural Constraints (for AI agents)

These are patterns that must be followed in ALL code:

### Systems
```
❌ system(registry: Registry) → system(registry: Registry)
   import { SCHEMA } from '../../game/contract.js'  // WRONG — see DDL-008

✅ system(registry: Registry, dt: number) → system(registry: Registry, dt: number)
   // component names as parameters or local constants
```

### Component Design
```
❌ { type: 'Position', data: { x: 10, y: 20, z: 0, layer: 'ground', label: 'foo' } }
   // Too many concerns in one component

✅ { type: 'Position', data: { x: 10, y: 20 } }
   // One concern per component. Compose: Position + ZOrder + Label
```

### Game Loop
```
// CORRECT fixed-timestep pattern:
const FIXED_DT = 1000 / 60  // 16.67ms
function tick(dt: number): void {
  for (const system of systems) {
    system(registry, dt)
  }
}
// Magic constants like 0.06 are FORBIDDEN — use dt
```

### Rendering
```
// CORRECT: View bridge pattern
// `game/` systems never import pixi.js
// `client/` reads registry and creates PixiJS sprites
// React to events (Phase 2+) or poll via getAllEntities (Phase 1 fallback)
```

### Castle's 25-field GameState
```
// DO NOT REPLICATE THIS PATTERN. It is a known design flaw (Task 1.5).
// Correct: split into Economy, Population, Happiness components.
```

---

## Lessons Learned (Context for All Work)

1. **AI agents copy the closest reference game.** If Castle is broken .js, agents will write broken .js. Fix Castle first.
2. **Common utilities must be utility-shaped, not game-shaped.** MovementSystem broke reusability by importing from the template contract. All common code must be self-contained.
3. **Perf traps hide in small tests.** Array.shift() passes 10×10 map tests but fails at 500×500. Always think about algorithmic complexity.
4. **Fixed timestep is non-negotiable.** Magic speed constants break at different frame rates. Every system must receive `dt`.
5. **Events over polling.** Polling `getAllEntities()` every frame is O(n) on entity count. The event system (Phase 2) enables O(1) reactivity.
