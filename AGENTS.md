# Game Project — Agent Guide

## Stack
- **Sub-Engine**: AI-first, pure-data ECS 2D engine
- **TypeScript**: strict mode, ES modules
- **PixiJS 8**: rendering via `src/client/`
- **Vite**: dev server + build

## Project Structure

```
├── games/                  # Reference implementations (study these)
│   ├── tower-defense/      #   Complete tower defense game (fully typed)
│   ├── movement-demo/      #   Flow field navigation demo
│   ├── combat-demo/        #   Archers vs melee combat demo
│   ├── map-demo/           #   Interactive map + pathfinding demo
│   ├── input-demo/         #   Scaled container input handler demo
│   ├── serialization-demo/ #   Save/load registry state demo
│   ├── character-demo/     #   Animated character with sprite sheets
│   ├── tilemap-demo/       #   Tile map demo (Tiled integration)
│   ├── camera-demo/        #   Camera follow, zoom, collision
│   └── castle/             #   Castle management simulation game
src/
├── engine/        # Core ECS — copy as-is, never edit
│   ├── index.ts   #   Barrel exports
│   ├── types.ts   #   Registry, ComponentMap, Entity, etc.
│   ├── Registry.ts
│   ├── schemas.ts #   Runtime schema validation + 4 built-in schemas
│   ├── MapLoader.ts / FlowFieldNav.ts / Pathfinding.ts
│   ├── TiledMapLoader.ts
│   └── ColumnarRegistry.ts
├── common/        # Reusable utilities — import, extend
│   ├── index.ts   #   Barrel exports
│   ├── responsive.ts / spriteLoader.ts / TiledMapRenderer.ts
│   ├── GameLoop.ts / createEntity.ts / SpatialGrid.ts
│   ├── AudioManager.ts / UndoStack.ts / DebugOverlay.ts
│   └── systems/   #   Reusable ECS systems
│       ├── MovementSystem.ts / CombatSystem.ts
│       ├── CameraSystem.ts / CollisionSystem.ts
│       ├── ZOrderSystem.ts / TileMapSystem.ts
│       ├── PathfindingSystem.ts / AudioSystem.ts
│       └── ParticleSystem.ts
├── game/          # ★ Game-specific code — edit freely
│   ├── contract.ts  # ComponentMap + SCHEMA + schema registration
│   ├── config/      # Game constants, map data, tuning knobs
│   └── systems/     # Game-specific ECS systems
└── client/        # PixiJS rendering bridge
    └── main.ts
```

## Conventions

### ECS
- Entities are integers. Components are flat JSON objects. Systems are pure functions.
- **Systems**: `(registry: Registry<GameComponents>, dt: number) => Registry<GameComponents>`
- Read components with `getEntitiesWith([SCHEMA.X, SCHEMA.Y])` — typed destructuring
- Write with `registry.addComponent(id, SCHEMA.X, data)`
- Never import pixi.js from `game/` systems (headless-first)

### Contract File
`src/game/contract.ts` is the single source of truth:
1. Define `GameComponents` interface extending `ComponentMap`
2. Register ALL schemas via `registerSchema(name, fields)` before use
3. Export `SCHEMA` object with `as const` for literal types
4. Import `{ SCHEMA }` from `'../contract.js'` in all game systems

### Schema Constants
Always use `SCHEMA.XXX` constants — never raw strings:
```ts
registry.getEntitiesWith([SCHEMA.POSITION, SCHEMA.VELOCITY])
```

### Rendering
- `game/` systems never import pixi.js
- `client/` reads registry and creates PixiJS display objects
- Use `getComponentReadonly()` in render loops for performance

### Debug
- F12 toggles the `DebugOverlay` (FPS, entity list, inspect mode)
- I key + click to inspect entity component data

### Critical PixiJS Input Rule
When using a scaled virtual container:
- Do NOT attach pointer handlers to children of the scaled container
- Listen on `app.stage`, use `FederatedPointerEvent`, convert via `container.toLocal()`
- Check bounds manually

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

## Tile Map Architecture

### Tiled Compatibility
Full support for [Tiled](https://www.mapeditor.org/) maps:
- Load `.tmj`/`.tsj` via `loadTiledMap('./assets/map.tmj')`
- Convert to `GameMap` for pathfinding: `tiledMapToGameMap(tiledMap, 'ground')`
- Render with `createTiledMapRenderer(tiledMap, scale)`
- Supported: spritesheet tilesets, collection-of-images, external TSJ files

### Procedural Maps
```ts
import { createProceduralMap } from '../common/index.js'
const map = createProceduralMap(12, 10, 256, (x, y) => x === 0 ? 1 : 0)
```

## Reference Games

The `games/` directory contains complete, working reference implementations. Study these when implementing similar features:

| Game | Teaches |
|------|---------|
| `tower-defense/` | Full game structure, typed contract, combat, projectiles |
| `combat-demo/` | CombatSystem, target scanning, melee vs ranged |
| `movement-demo/` | Flow field navigation, MovementSystem |
| `map-demo/` | Map interaction, pathfinding, click-to-move |
| `input-demo/` | Scaled container, drag, FederatedPointerEvent |
| `serialization-demo/` | Save/load registry state |
| `character-demo/` | Animated sprites, sprite sheets |
| `tilemap-demo/` | Tiled map loading, procedural maps, tile editing |
| `camera-demo/` | Camera follow, zoom, collision bounds |
| `castle/` | Complex simulation, economy, components |

**AI: Read `games/tower-defense/` first — it's the most complete reference.**

## Running
```bash
npm run dev                # Start game
npm run dev:td             # Tower defense reference game
npm run dev:castle         # Castle simulation reference game
npm run dev:movement       # Movement demo (flow field nav)
npm run dev:combat         # Combat demo (archers vs melee)
npm run dev:map            # Map demo (click walls, pathfinding)
npm run dev:input          # Input demo (scaled container, drag)
npm run dev:serial         # Serialization demo (save/load)
npm run dev:character      # Character demo (animated sprite)
npm run dev:camera         # Camera demo (follow, zoom, collision)
npm run dev:tilemap        # Tile map demo (Tiled integration)
npm run typecheck          # Full type check
npm run test               # Run engine tests
```
