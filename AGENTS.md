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
- **No comments in source** — keep code self-documenting; use this `AGENTS.md` and `src/game/contract.js` for rationale

### Component Schema Rules
- Every component must be registered via `registerSchema(name, fields)` before use
- Fields define `{ type, required }` — supported types: `number`, `string`, `boolean`, `integer`, `array`
- Schemas are validated on every `addComponent` call
- **Register schemas in your game's `contract.js`** — this is the single source of truth

### Schema Name Constants
- Always use `SCHEMA.XXX` constants from your game's `contract.js` instead of raw strings
- This eliminates typos: `SCHEMA.POSITION` vs `'Positon'`
- Import: `import { SCHEMA } from '../contract.js'`
- Usage: `registry.getEntitiesWith([SCHEMA.POSITION, SCHEMA.VELOCITY])`

## Project Structure

```
sub-engine/
├── index.html              # Template entry — replace with your game
├── src/
│   ├── engine/             # ★ Core ECS — copy as-is, never edit
│   │   ├── index.js        #   Barrel exports
│   │   ├── Registry.js     #   Entity/component store
│   │   ├── schemas.js      #   Schema validation + 4 built-in schemas
│   │   ├── MapLoader.js    #   2D matrix → walkable grid
│   │   └── FlowFieldNav.js #   BFS integration → flow vectors
│   ├── common/             # ★ Reusable utilities — import, extend
│   │   ├── index.js        #   Barrel exports
│   │   ├── responsive.js   #   Responsive scaling for any screen
│   │   └── systems/        #   Generic reusable ECS systems
│   │       ├── MovementSystem.js  # Position + Velocity → move entity
│   │       └── CombatSystem.js    # TargetScanner → damage Health
│   ├── game/               # ★ TEMPLATE — replace entirely for your game
│   │   ├── contract.js     #   Contract file: documents + registers schemas
│   │   ├── config/
│   │   │   └── _example.js
│   │   └── systems/
│   │       └── _example.js
│   └── client/             # ★ TEMPLATE — replace entirely for your game
│       └── main.js         #   Minimal PixiJS setup
├── games/                  # Reference implementations (study these)
│   ├── tower-defense/      #   Complete tower defense game
│   │   ├── index.html
│   │   └── src/
│   │       ├── game/       #     ECS: contract, config, systems
│   │       └── client/     #     PixiJS: main, scene, UI
│   └── castle/             #   Castle management game (WIP)
│       ├── index.html
│       └── src/
│           ├── game/
│           └── client/
├── tests/
│   ├── testRegistry.js     # Engine unit tests (46)
│   ├── testNavigation.js   # Map/flow field tests (23)
│   └── simRunner.js        # Headless flow-field simulation
├── plan.md                 # Transformation plan
├── state.md                # State tracking
└── AGENTS.md               # This file — agent conventions
```

### Template usage
To start a new game:
```bash
cp -r /path/to/sub-engine /path/to/my-game
cd /path/to/my-game
npm install
# Then:
#   1. Edit src/game/contract.js — register your schemas + add SCHEMA entries
#   2. Replace src/game/config/   — your game config
#   3. Replace src/game/systems/  — your ECS systems
#   4. Replace src/client/        — your rendering + UI
# Keep src/engine/ and src/common/ as-is
```

### The Contract File
`src/game/contract.js` is the **most important file for AI**. It:
1. Registers ALL game-specific component schemas
2. Exports `SCHEMA` object with name constants (prevents typos)
3. Documents every schema with field types
4. Documents the system function contract
5. Documents the game loop pattern
6. Documents the rendering pattern

**AI: Read `src/game/contract.js` first before writing any game code.**
**Study `games/tower-defense/` for a complete working reference.**

### System Conventions
- Systems are standalone exported functions: `function name(registry) { ...; return registry }`
- Systems never hold internal state — they read from registry, mutate via `addComponent`, return the registry
- System ordering is managed by the caller (e.g. `main.js`); systems themselves don't know about each other
- Cross-system communication happens through shared component data only
- Systems use `getEntitiesWith` to filter, `getComponent` to read, `addComponent` to write
- Systems import `{ SCHEMA }` from their game's `contract.js` for all component name references

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
npm run dev                             # Template (place holder)
npm run dev:td                          # Tower defense reference game
npm run dev:castle                      # Castle reference game
```
All test scripts exit with code 0 on pass, 1 on failure.
