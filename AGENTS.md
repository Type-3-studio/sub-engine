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
│   │   └── FlowFieldNav.ts #   BFS integration → flow vectors
│   ├── common/             # ★ Reusable utilities — import, extend
│   │   ├── index.ts        #   Barrel exports
│   │   ├── responsive.ts   #   Responsive scaling for any screen
│   │   └── systems/        #   Generic reusable ECS systems
│   │       ├── MovementSystem.ts  # Position + Velocity → move entity
│   │       └── CombatSystem.ts    # TargetScanner → damage Health
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
│   └── castle/             #   Castle management game (WIP, still .js)
├── tests/
│   ├── testRegistry.ts     # Engine unit tests (45)
│   ├── testNavigation.ts   # Map/flow field tests (23)
│   └── simRunner.ts        # Headless flow-field simulation
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

## Running Tests
```bash
npm run typecheck                    # tsc --noEmit (full type check)
npm test                             # tsx tests/testRegistry.ts  +  tsx tests/testNavigation.ts  +  tsx tests/simRunner.ts
npm run dev                          # Template (place holder)
npm run dev:td                       # Tower defense reference game
npm run dev:castle                   # Castle reference game
npm run dev:movement                 # Movement demo (flow field nav)
npm run dev:combat                   # Combat demo (archers vs melee)
npm run dev:map                      # Map demo (click walls, pathfinding)
npm run dev:input                    # Input demo (scaled container, drag)
npm run dev:serial                   # Serialization demo (save/load)
```
All test scripts exit with code 0 on pass, 1 on failure. Type checking is separate via `npm run typecheck`.
