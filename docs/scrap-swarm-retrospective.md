# Scrap Swarm — Engine Retrospective

**Date:** July 2026
**Game:** `games/scrap-swarm/` — full RTS-lite with workers, fighters, enemies, waves
**Purpose:** Stress-test the engine. What broke, why, and what the engine needs.

---

## 1. Memory Management (The OOM Crisis)

### Symptom
After ~30 seconds of play, the browser tab consumes all system RAM. Laptop becomes unusable. Force-kill required.

### Root Cause Tree

```
DebugOverlay.update() called every frame via app.ticker.add()
  └─ creates new Text() for every entity each frame
  └─ this.listContainer.removeChildren() — removes from display list
  └─ BUT never calls .destroy() on removed children
  └─ PIXI Text internally allocates RenderTexture (GPU memory)
  └─ ~100 Text objects × 60 fps × 30s = 180,000 leaked GPU objects
  └─ OOM after ~30 seconds
```

Same pattern in `entityRenderer.sync()`: containers removed from display list but not destroyed, and in the selection overlay `overlayLayer.removeChildren()`.

### Why the Engine Allowed This

- PIXI's `removeChild()` and `removeChildren()` are **severely misnamed** — they imply cleanup but only detach from display list. GPU memory is never freed.
- No engine-level enforcement or wrapper around PIXI container operations.
- No lint rule or convention for when `destroy()` is mandatory.

### New Engine Policy

**Rule: Every `removeChild` / `removeChildren` call MUST be paired with `destroy()`.**

```ts
// BAD — leaks GPU memory
container.removeChild(child)
layer.removeChildren()

// GOOD — frees GPU memory
container.removeChild(child)
child.destroy({ children: true })
// or destroy the range:
for (const c of container.removeChildren()) c.destroy()
```

This applies to: `Container`, `Graphics`, `Text`, `Sprite` — any PIXI display object.

### The DebugOverlay Is the Most Dangerous

Because `debug.update()` runs every frame AND creates new objects, it amplifies any leak by 60x. A single unfreed `Text` object = 60 leaked per second. A single unfreed `Graphics` = 60 leaked per second. Over a 5-minute debug session: 18,000 objects. With GPU textures at ~50KB each: ~900MB leaked.

**Mitigation:** The DebugOverlay must be the most aggressively cleaned-up component in the codebase. It should destroy every object it creates, every frame. No exceptions. This is now enforced in the code.

---

## 2. Movement & Delta Time (The Speed Crisis)

### Symptom
Entities cross the entire 30-tile map in 0.2 seconds. Workers, fighters, and enemies are invisible blurs. Game is unplayable outside simulation mode.

### Root Cause

Two independent bugs that compounded:

**Bug A — Wrong speed magnitudes:**
```
WORKER_SPEED = 2.0    → 2.0 tiles/tick
FIGHTER_SPEED = 2.5   → 2.5 tiles/tick
ENEMY_SPEED = 1.5     → 1.5 tiles/tick
Projectile speed = 4  → 4.0 tiles/tick
```

At 62.5 ticks/sec: `2.0 × 62.5 = 125 tiles/sec` on a 30-tile map = crossing in 0.24s.

The reference game (movement-demo) uses `SPEED × 0.05` as the convention for the same coordinate system. The swarm configs were ~15× too high.

**Root cause of Bug A:** Speed configs were chosen without understanding the `movementSystem`'s implicit unit convention. The `movementSystem` has `stepScale = dt / 16`, meaning velocities are in **tiles-per-16ms-tick** (≈ tiles-per-frame at 62.5Hz). But the config values were picked as if they were in tiles-per-second. No documentation existed for the velocity unit convention.

**Bug B — Missing dt scaling in workerSystem:**
```ts
// enemySystem.ts ✓
const speed = enemy.speed * (dt / 16)

// combatSystem.ts ✓
const speed = FIGHTER_SPEED * (dt / 16)

// workerSystem.ts ✗
registry.addComponent(e.id, SCHEMA.VELOCITY, { x: vec.x * WORKER_SPEED, y: vec.y * WORKER_SPEED })
```

The worker system applied velocity directly without the `(dt/16)` factor. At `dt=16` (the fixed timestep), `dt/16=1`, so this happened to be invisible during normal gameplay. But it means workers would move at wrong speed if the game loop's tick rate ever changed, or in any non-standard `dt` scenario.

**Root cause of Bug B:** No standardized pattern for velocity setting. Three systems doing the same operation three slightly different ways. An engine-level helper function would have prevented this.

### New Engine Policy

**Rule 1: All velocity values MUST be in "units per 16ms tick".**
```ts
// Conversion formula:
velocity = desiredUnitsPerSecond / 62.5
```

**Rule 2: All velocity writes MUST multiply by `(dt / 16)`.**
```ts
registry.addComponent(id, SCHEMA.VELOCITY, {
  x: direction.x * speed * (dt / 16),
  y: direction.y * speed * (dt / 16),
})
```

**Recommended: Create an engine utility.**
```ts
// Proposed: @sub-engine/core export
function setVelocity(
  registry: Registry,
  entityId: number,
  direction: Vec2,
  speed: number,       // in "units per 16ms tick"
  dt: number,          // current delta
): void {
  registry.addComponent(entityId, 'Velocity', {
    x: direction.x * speed * (dt / 16),
    y: direction.y * speed * (dt / 16),
  })
}
```

---

## 3. Expensive Operations (The GC Pressure Issue)

### Symptom
Not an OOM crash but janky frame rates and GC pauses. The browser's garbage collector struggles to keep up.

### What Was Happening

`registry.getAllEntities()` was called **4× per frame**:
1. `tick()` → `entityRenderer.sync(registry.getAllEntities())`
2. `onFrame()` → `for (const e of registry.getAllEntities()) { /* LOD */ }`
3. `onFrame()` → `registry.getAllEntities().find(...)` for selected entity
4. `onFrame()` → `registry.getAllEntities().filter(...).map(...)` for minimap

Each call creates a full deep copy of every entity and every component. With ~100 entities each carrying ~5 components, that's ~500 object copies per call × 4 calls = **2000 copies per frame** × 60fps = **120,000 short-lived objects/second**. This creates sustained GC pressure.

### Why the Engine Allowed This

No API surface documentation stating that `getAllEntities()` is O(n) with full deep copy. No `getAllEntitiesReadonly()` or lightweight alternative. The function name sounds innocuous.

### New Engine Policy

**Rule: Cache `getAllEntities()` when iterating multiple times in the same frame.**
```ts
// Instead of:
for (const e of registry.getAllEntities()) { /* ... */ }
const selected = registry.getAllEntities().find(...)
const minimap = registry.getAllEntities().map(...)

// Cache once:
const all = registry.getAllEntities()
for (const e of all) { /* ... */ }
const selected = all.find(...)
const minimap = all.map(...)
```

**Recommended engine improvements:**
- Rename to `getAllEntitiesCopy()` or document the performance characteristic in the function name
- Add a `getAllEntitiesReadonly()` that returns references (not copies) for read-only iteration
- Add a `forEachEntity()` callback-based iteration that avoids array allocation

---

## 4. Engine Architecture Gaps

### 4.1 No Game Loop → System dt Wiring

The `createGameLoop` `onStep` callback receives **no `dt` argument**:

```ts
// GameLoop.ts — onStep receives nothing
onStep: () => void
```

This forces every game to hardcode `TICK_MS` and pass it to systems manually:

```ts
function tick(): void {
  workerSystem(registry, TICK_MS)   // hardcoded 16
  movementSystem(registry, TICK_MS) // hardcoded 16
  // ...
}
```

**Problem:** If anyone changes `tickRate` in `createGameLoop()` without updating `TICK_MS`, the simulation silently runs at wrong speed.

**Fix:** Pass `dt` to `onStep`, and let systems extract it:
```ts
// Proposed GameLoop change:
onStep: (dt: number) => void

// In the loop:
step()  // should receive tickInterval

// Then in game code:
function tick(dt: number): void {
  movementSystem(registry, dt)  // no more TICK_MS
}
```

### 4.2 No Centralized Entity Lifecycle

Entity death is handled in THREE places in the swarm game:
- `enemySystem.ts:127` — removes dead enemies
- `projectileSystem.ts:34` — removes spent projectiles
- `gameScene.ts:367` — `handleDeath()` — catches everything else (fighters, base)

This fragmentation means:
- Particle spawning on death happens in multiple places (double-spawn risk)
- Scrap reward on enemy death is handled in both enemySystem and handleDeath
- Easy to miss cleanup for new entity types

**Fix:** An engine-level `DeathSystem` or `EntityLifecycleSystem` that:
- Queries for `Health.current <= 0`
- Emits a `'entity:death'` event
- Calls a registered `onDeath` callback per entity type
- Handles removal uniformly

### 4.3 No Cache Invalidation for Flow Fields

The `workerSystem` has a `Map<string, FlowField>` cache that grows unbounded:

```ts
const flowCache = new Map<string, FlowField>()

function getCachedFlowField(tx: number, ty: number): FlowField {
  const key = `${tx},${ty}`
  let ff = flowCache.get(key)
  if (!ff) {
    ff = computeFlowField(walkableMap, tx, ty)
    flowCache.set(key, ff)
  }
  return ff
}
```

For a 30×20 grid, this is bounded at 600 entries (~5.7 MB), but:
- If resources are depleted (changing walkability), flow fields are stale
- No eviction strategy exists
- Flow field ownership is split between workerSystem (cache) and enemySystem (single-entry cache)
- Systems that could benefit from shared flow fields recompute independently

**Fix:** Add `clearFlowCache()` call when world changes (resource depletion), or use LRU eviction. Share the cache between workerSystem and enemySystem where targets overlap.

### 4.4 No Convention for Component Write Patterns

Three different patterns for updating a component exist in the codebase:

```ts
// Pattern A (scrap-swarm style): spread
registry.addComponent(id, SCHEMA.POSITION, {
  ...oldComp, x: oldComp.x + 1,
})

// Pattern B (tower-defense style): explicit fields
registry.addComponent(id, SCHEMA.POSITION, {
  x: oldComp.x + 1,
  y: oldComp.y,
})

// Pattern C (internal): get + set in one call (validated)
registry.getComponent(id, 'Position') // returns copy
registry.addComponent(id, 'Position', { x: newX, y: newY })
```

Pattern A is the most common but has a problem: if `oldComp` has optional fields that are `undefined`, they get written as `undefined` (which the schema then validates). Pattern B is safer but verbose. Pattern C is cleanest but requires two calls.

**Recommended: Pick ONE convention and enforce it.** Pattern C (explicit every field) is safest because schema validation catches missing required fields.

---

## 5. Checklist for Future Games

Before declaring a new game "working," verify:

### Memory Safety
- [ ] All `removeChild()` calls are paired with `destroy()`
- [ ] All `removeChildren()` iterations call `.destroy()` on each child
- [ ] `DebugOverlay` properly destroys its objects every frame
- [ ] Entity death cleanup doesn't leak PIXI containers
- [ ] Particle systems have bounded lifetimes and are verified to clean up
- [ ] Flow field or other caches have size limits or eviction

### Movement Correctness
- [ ] Every velocity write includes `* (dt / 16)` scaling
- [ ] Speed constants account for tick rate (values ≈ desiredTilePerSec / 62.5)
- [ ] Diagonal movement is normalized (vector length = 1)
- [ ] No movement happens on entities without Velocity component

### Performance
- [ ] `getAllEntities()` is cached when used multiple times per frame
- [ ] `getEntitiesWith()` is not called inside tight loops unnecessarily
- [ ] No new PIXI objects created per frame (exception: DebugOverlay)
- [ ] Game loop uses fixed timestep (`createGameLoop`), not raw RAF

### Consistency
- [ ] All systems receive `dt` parameter and use it consistently
- [ ] `SCHEMA.X` constants used everywhere (no raw strings)
- [ ] Component writes pass all fields explicitly (no spread with undefined)
- [ ] Contract file defines all schemas before use

---

## 6. Summary: What the Engine Needs

| Priority | Gap | Engine Change Required |
|----------|-----|----------------------|
| **P0** | PIXI `destroy()` not enforced on remove | Add `destroyGuarded` wrapper or lint rule |
| **P0** | No velocity-setting convention | Add `setVelocity()` utility to core |
| **P1** | `onStep` doesn't receive `dt` | Pass `tickInterval` to `onStep` callback |
| **P1** | `getAllEntities()` hides O(n) copy cost | Rename or add lightweight read-only variant |
| **P2** | No centralized death system | Consider a `DeathSystem` or lifecycle hook |
| **P2** | Flow field caches unbounded | Add LRU eviction to core flow field cache |
| **P3** | Multiple component write patterns | Document and enforce single convention |

---

## 7. Concrete Fixes Applied (July 2026)

The following changes were made in a single pass:

| File | Change | Category |
|------|--------|----------|
| `packages/pixi/src/common/DebugOverlay.ts` | Destroy old children before replacing each frame | Memory |
| `packages/pixi/src/common/entityRenderer.ts` | `destroy({ children: true })` on dead entity containers | Memory |
| `games/scrap-swarm/client/gameScene.ts` | Destroy overlay graphics; cache getAllEntities() | Memory + Perf |
| `games/scrap-swarm/game/config.ts` | Scale speeds: 2.0→0.12, 2.5→0.14, 1.5→0.08 | Movement |
| `games/scrap-swarm/game/systems/combatSystem.ts` | Projectile speed 4→0.3 | Movement |
| `games/scrap-swarm/game/systems/workerSystem.ts` | Add `*(dt/16)` to both worker velocity writes | Movement |
| `games/scrap-swarm/sim/headlessSim.ts` | Use imported ENEMY_SPEED instead of hardcoded 1.5 | Consistency |
| `AGENTS.md` | Added Performance/Memory section + Pain Points table | Documentation |
