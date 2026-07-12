# Game Project — Agent Playbook

## Stack

- **Sub-Engine**: AI-first, pure-data ECS 2D engine
  - `@sub-engine/core` — headless ECS (Registry, schemas, systems, utilities)
  - `@sub-engine/pixi` — PixiJS 8 rendering bridge (responsive container, sprites, debug)
- **TypeScript**: strict mode, ES modules
- **PixiJS 8**: rendering via `src/client/`
- **Vite**: dev server + build

---

## 1. Quick Start — First Render

```bash
npm install
npm run dev
```

Arrow keys move the player. F12 toggles debug overlay.

---

## 2. Project Structure

```
src/
├── game/              # ★ Game logic — headless, no pixi.js imports
│   ├── contract.ts    #   ComponentMap interface + SCHEMA constants
│   ├── config/        #   Tile size, map data, tuning constants
│   └── systems/       #   Pure function ECS systems
├── client/            # PixiJS rendering
│   └── main.ts
└── sim/               # Optional: headless simulation runner
    └── simRunner.ts
```

---

## 3. Contract & Schema Design

**`src/game/contract.ts`** is the single source of truth. It defines:

```ts
import { registerSchema } from '@sub-engine/core'
import type { ComponentMap } from '@sub-engine/core'

// 1. SCHEMA constants (always use these, never raw strings)
export const SCHEMA = {
  POSITION: 'Position',
  VELOCITY: 'Velocity',
  HEALTH: 'Health',
  LABEL: 'Label',
  MY_COMPONENT: 'MyComponent',
} as const

// 2. GameComponents interface
export interface GameComponents extends ComponentMap {
  'Position': { x: number; y: number }
  'Velocity': { x: number; y: number }
  'Health': { current: number; max: number }
  'Label': { value: string }
  'MyComponent': { field1: number; field2: string }
}

// 3. Register custom schemas
registerSchema('MyComponent', {
  field1: { type: 'number', required: true },
  field2: { type: 'string', required: true },
})
```

**Rules:**
- `SCHEMA.XXX` constants everywhere — never raw strings
- All components extend `ComponentMap` (which is `Record<string, any>`)
- Built-in schemas (Position, Velocity, Health, Label, etc.) are pre-registered — do not re-register
- Ship schema validation catches AI typos at the write point

---

## 4. Systems — Pure Function Pattern

```ts
// src/game/systems/mySystem.ts
import { SCHEMA } from '../contract.js'
import type { Registry } from '@sub-engine/core'
import type { GameComponents } from '../contract.js'

export function mySystem(registry: Registry<GameComponents>, dt: number): Registry<GameComponents> {
  // Query: typed destructuring
  const entities = registry.getEntitiesWith([SCHEMA.POSITION, SCHEMA.MY_COMPONENT])

  for (const { id, Position, MyComponent } of entities) {
    // Read
    const oldVal = MyComponent.field1

    // Write — pass ALL fields explicitly (no spread with undefined)
    registry.addComponent(id, SCHEMA.MY_COMPONENT, {
      field1: oldVal + 1,
      field2: MyComponent.field2,
    })
  }

  return registry
}
```

**Rules:**
- Systems are `(registry, dt) => registry` — pure, no side effects
- `dt` is delta time in milliseconds — always forward it to sub-systems
- Read with `getEntitiesWith([SCHEMA.A, SCHEMA.B])` — typed destructuring
- Write ALL fields explicitly — never spread potentially-undefined optional fields
- Never import pixi.js from `game/` systems
- Never call `performance.now()` in systems (non-deterministic)

---

## 5. Velocity Convention (Important)

Velocity is in **"units per 16ms tick"** (the reference tick at 62.5 Hz).

```ts
// To convert from desired units/second:
const velocity = desiredUnitsPerSecond / 62.5

// When setting velocity, ALWAYS multiply by (dt / 16):
registry.addComponent(id, SCHEMA.VELOCITY, {
  x: direction.x * speed * (dt / 16),
  y: direction.y * speed * (dt / 16),
})

// Or use the setVelocity utility:
import { setVelocity } from '@sub-engine/core'
setVelocity(registry, entityId, direction, speed, dt)
```

The `movementSystem` applies `stepScale = dt / 16` internally. Systems that set velocity should set **raw speed** (not speed × stepScale).

---

## 6. Game Loop

Use `createGameLoop` from `@sub-engine/core` for all games:

```ts
import { createGameLoop } from '@sub-engine/core'

const loop = createGameLoop({
  tickRate: 62.5,                     // fixed timestep Hz
  maxFrameMs: 100,                     // caps dt to prevent spiral-of-death
  onStep: (dt) => {                    // simulation — dt is the tick interval (ms)
    mySystem(registry, dt)
    movementSystem(registry, dt)
  },
  onFrame: (alpha) => {               // render with interpolation
    entityRenderer.render(alpha)
  },
})

loop.start()
// loop.pause() / loop.resume() / loop.stop() / loop.step() / loop.isPaused()
```

- `pause()` freezes simulation; `onFrame` still runs for frozen rendering
- `resume()` resets internal timers — no dt explosion from stale timestamps
- `onStep` receives `dt` — use it directly, do NOT hardcode `TICK_MS`

---

## 7. Entity Visual Sync Pattern

Every game with moving entities needs this pattern:

```ts
// client/gameScene.ts — the canonical rendering approach

interface VisualEntry {
  container: Container
  prevX: number
  prevY: number
  curX: number
  curY: number
  first: boolean
}

const entities = new Map<number, VisualEntry>()

function sync(): void {
  const all = registry.getAllEntitiesCopy()     // ← use Copy variant!
  const active = new Set<number>()

  for (const e of all) {
    active.add(e.id)

    let entry = entities.get(e.id)
    if (!entry) {
      entry = {
        container: createVisual(e),
        prevX: 0, prevY: 0,
        curX: 0, curY: 0,
        first: true,
      }
      entityLayer.addChild(entry.container)
      entities.set(e.id, entry)
    }

    if (e.Position) {
      const sx = e.Position.x * TILE_SIZE
      const sy = e.Position.y * TILE_SIZE
      if (entry.first) {
        entry.prevX = sx; entry.prevY = sy
        entry.curX = sx; entry.curY = sy
        entry.first = false
      } else {
        entry.prevX = entry.curX
        entry.prevY = entry.curY
        entry.curX = sx
        entry.curY = sy
      }
    }
  }

  // Remove dead entities
  for (const [id, entry] of entities) {
    if (!active.has(id)) {
      entry.container.destroy({ children: true })  // ← MUST destroy!
      entities.delete(id)
    }
  }
}

function render(alpha: number): void {
  for (const [, entry] of entities) {
    entry.container.x = entry.prevX + (entry.curX - entry.prevX) * alpha
    entry.container.y = entry.prevY + (entry.curY - entry.prevY) * alpha
  }
}
```

**Cache `getAllEntitiesCopy()`** when iterating multiple times — each call is a full deep copy.

---

## 8. Grid Interaction

```ts
function toGrid(e: FederatedPointerEvent): { gx: number; gy: number } | null {
  const p = container.toLocal(new Point(e.clientX, e.clientY), app.stage)
  const gx = Math.floor(p.x / TILE_SIZE)
  const gy = Math.floor((p.y - HUD_OFFSET) / TILE_SIZE)
  if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return null
  return { gx, gy }
}
```

---

## 9. PIXI Memory Safety — destroy() Is Required

Calling `removeChild()` or `removeChildren()` on a PIXI Container **does NOT free GPU memory**.

```ts
// BAD — leaks GPU memory
container.removeChildren()
layer.removeChild(child)

// GOOD — frees GPU memory
for (const child of container.removeChildren()) child.destroy({ children: true })
entry.container.destroy({ children: true })
```

This applies to: `Container`, `Graphics`, `Text`, `Sprite` — any PIXI display object.

The DebugOverlay is the most dangerous because it creates new objects every frame. It now properly destroys children, but never modify it to skip destroy.

---

## 10. DebugOverlay (Required)

```ts
import { DebugOverlay } from '@sub-engine/pixi'

const debug = new DebugOverlay(app, () => registry.getAllEntitiesCopy() as any[], () => gameLoop.pause())
app.ticker.add(() => debug.update())
```

**Keyboard shortcuts (do not change):**

| Key | Action |
|-----|--------|
| F12 or Backtick (`) | Toggle overlay |
| i | Toggle inspect mode (click entity) |
| Ctrl+I | Pause/resume simulation |

---

## 11. Performance Rules

1. **Cache `getAllEntitiesCopy()`** — never call it more than once per frame
2. **Destroy PIXI objects** on removal — every `removeChild()` needs `destroy()`
3. **No new PIXI objects per frame** outside DebugOverlay — use object pools
4. **Use `setVelocity()`** — ensures correct dt scaling
5. **`maxFrameMs` default 100** protects against tab-away lag spikes

---

## 12. Headless Simulation

Validate your game logic without a browser:

```ts
// sim/simRunner.ts
import { createRegistry, movementSystem } from '@sub-engine/core'
import { mySystem } from '../game/systems/mySystem.js'

const registry = createRegistry<GameComponents>()
// Set up initial state...

const TICKS = 1000
const DT = 16

for (let tick = 0; tick < TICKS; tick++) {
  mySystem(registry, DT)
  movementSystem(registry, DT)

  // Validate
  for (const e of registry.getAllEntitiesCopy()) {
    if (e.Position && (isNaN(e.Position.x) || isNaN(e.Position.y))) {
      throw new Error(`NaN at tick ${tick}, entity ${e.id}`)
    }
  }
}

console.log(`Completed ${TICKS} ticks. Final entities: ${registry.entityCount()}`)
```

Run with: `npx tsx sim/simRunner.ts`

---

## 13. Asset Pipeline

1. Define `PngSequenceDef[]` in config
2. Use `createPlaceholderAnimManager()` for development (generates colored shapes)
3. Switch to `createAdaptiveAnimManager()` for mixed real/placeholder assets
4. Place real PNGs in `public/` matching directory/filename conventions
5. Use `createAnimManager()` when all assets are ready

---

## Running

```bash
npm run dev          # Start dev server
npm run typecheck    # Full type check
npm test             # Run tests (if vitest configured)
npx tsx sim/simRunner.ts  # Headless simulation
```
