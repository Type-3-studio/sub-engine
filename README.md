# Sub-Engine

**AI-first, pure-data ECS 2D game engine** — headless core with optional PixiJS rendering bridge.

[![npm](https://img.shields.io/npm/v/@sub-engine/core)](https://www.npmjs.com/package/@sub-engine/core)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)](tsconfig.json)

```bash
npx create-sub-engine my-game
cd my-game && npm install && npm run dev
```

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| `@sub-engine/core` | [![npm](https://img.shields.io/npm/v/@sub-engine/core)](https://www.npmjs.com/package/@sub-engine/core) | Headless ECS (Registry, schemas, systems, utilities) — zero browser deps |
| `@sub-engine/pixi` | [![npm](https://img.shields.io/npm/v/@sub-engine/pixi)](https://www.npmjs.com/package/@sub-engine/pixi) | PixiJS 8 rendering bridge (responsive, sprites, tilemaps, debug overlay) |
| `create-sub-engine` | CLI | Scaffold new game projects |

## Quick Start

```bash
npm install @sub-engine/pixi pixi.js
```

```ts
import { createRegistry, registerSchema } from '@sub-engine/core'
import { createResponsiveContainer, DebugOverlay } from '@sub-engine/pixi'
import { Application } from 'pixi.js'

registerSchema('Position', { x: { type: 'number', required: true }, y: { type: 'number', required: true } })

const app = new Application()
await app.init({ resizeTo: window })

const registry = createRegistry()
const player = registry.createEntity()
registry.addComponent(player, 'Position', { x: 0, y: 0 })
```

## Features

- **Pure-data ECS** — Entities are integers. Components are flat JSON. Systems are pure functions `(registry, dt) => registry`.
- **Headless-first** — Run simulation in Node.js. No browser needed for game logic.
- **Fully typed** — Generic `Registry<M>` parameterized by your `ComponentMap` interface.
- **Schema validation** — Every write validates against registered schemas. Catches typos instantly.
- **Built-in systems** — Movement, combat, camera (follow + clamp + zoom), AABB collision (groups/masks), pathfinding (A*), particles, audio, z-ordering, tile maps.
- **Utilities** — Spatial hash grid, fixed-timestep game loop (`GameLoop`), entity factory, undo/redo, serialization, debug overlay (F12).
- **Tiled support** — Load `.tmj`/`.tsj` maps. Spritesheet + collection-of-images tilesets. Procedural map generation.
- **Columnar storage** — Optional `createColumnarRegistry()` for 11x faster bulk numeric operations.
- **AI-friendly** — Clean JSON data, no classes, no hidden state.

## Architecture

```
┌─────────────────────┐     ┌──────────────────────────┐
│  @sub-engine/core   │     │   @sub-engine/pixi       │
│                     │     │                          │
│  Registry           │     │  createResponsiveContainer│
│  Entity CRUD        │     │  createAnimManager       │
│  Schema validation  │     │  createTiledMapRenderer  │
│  Built-in schemas   │     │  DebugOverlay            │
│  Common systems     │     │  (depends on core)       │
│  Utilities          │     │                          │
└─────────────────────┘     └──────────────────────────┘
         ▲                            ▲
         │                            │
         └──────── game code ─────────┘
              (imports both)
```

## Reference Games

The `games/` directory contains 10 complete reference implementations. Run any with:

```
npm run dev:td        npm run dev:castle     npm run dev:movement
npm run dev:combat    npm run dev:map        npm run dev:input
npm run dev:serial    npm run dev:character  npm run dev:camera
npm run dev:tilemap
```

Read `games/tower-defense/` first — it's the most complete reference.

## Development

```bash
npm install           # Install workspace
npm run dev           # Root playground (arrow key movement demo)
npm run typecheck     # Full type check (0 errors)
npm test              # Run 187 engine tests
npm run build:pkgs    # Build both packages to dist/
```

## Project Structure

```
├── packages/
│   ├── core/            # @sub-engine/core (headless ECS)
│   ├── pixi/            # @sub-engine/pixi (rendering bridge)
│   └── create-app/      # create-sub-engine CLI + template
├── games/               # 10 reference implementations
├── tests/               # 187 engine tests (vitest)
├── src/                 # Root dev playground
├── package.json         # Workspace root
└── tsconfig.json
```

## License

MIT
