# Game Project — Agent Guide

## Stack
- **Sub-Engine**: AI-first, pure-data ECS 2D engine
  - `@sub-engine/core` — headless ECS (game systems, contract)
  - `@sub-engine/pixi` — PixiJS rendering bridge (client)
- **TypeScript**: strict mode, ES modules
- **PixiJS 8**: rendering via `src/client/`
- **Vite**: dev server + build

## Project Structure

```
src/
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

### Schema Constants
Always use `SCHEMA.XXX` constants — never raw strings.

### Rendering
- `game/` systems never import pixi.js
- `client/` reads registry and creates PixiJS display objects

### Debug
- F12 toggles the `DebugOverlay` (FPS, entity list, inspect mode)
- `i` key + click to inspect entity component data
- `Ctrl+I` toggles pause (freezes simulation, overlay stays interactive)
- Pass `onTogglePause` callback to sync with game loop:
  ```ts
  new DebugOverlay(app, getSnapshot, () => gameLoop.pause())
  ```

### Placeholder Assets
- During early development, use `createPlaceholderAnimManager()` from `@sub-engine/pixi`
- Define all animation sequences in `src/game/config/` as `PngSequenceDef[]`
- The function generates canvas textures at runtime and returns a `SpriteManager` (same interface as `createAnimManager`)
- A full `AssetManifest` is available at `spriteManager.manifest` and logged to console
- Each frame shows: animation name, frame index/total, dimensions, and a colored shape
- **Generate a static `ASSETS.md` file** from the same config listing every required PNG path — the user uses this as a checklist when replacing placeholders with real art
- Switch to `createAnimManager()` when real PNGs are placed in `public/`

## Running
```bash
npm run dev          # Start game
npm run typecheck    # Full type check
```
