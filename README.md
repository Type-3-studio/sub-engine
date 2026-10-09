<p align="center">
  <img src="assets/logo-lockup.svg" alt="Sub-Engine" width="380">
</p>

<p align="center">
  <b>The layer beneath the game.</b><br>
  <sub>AI-first, pure-data ECS 2D engine — headless core with an optional PixiJS bridge.</sub>
</p>

<p align="center">
  <a href="#packages"><img src="https://img.shields.io/badge/packages-3-FF5A1F?style=flat-square" alt="packages"></a>
  <a href="https://www.npmjs.com/package/@sub-engine/core"><img src="https://img.shields.io/npm/v/@sub-engine/core?style=flat-square&label=core" alt="@sub-engine/core"></a>
  <a href="https://www.npmjs.com/package/@sub-engine/pixi"><img src="https://img.shields.io/npm/v/@sub-engine/pixi?style=flat-square&label=pixi" alt="@sub-engine/pixi"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-FF5A1F?style=flat-square" alt="MIT"></a>
  <img src="https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square" alt="TypeScript strict">
  <img src="https://img.shields.io/badge/tests-201-8A8A93?style=flat-square" alt="201 tests">
  <img src="https://img.shields.io/badge/core_dependencies-0-FF5A1F?style=flat-square" alt="zero dependencies">
  <img src="https://img.shields.io/badge/Type-3_Studio-FF5A1F?style=flat-square" alt="by Type-3 Studio">
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#why">Why</a> ·
  <a href="#reference-games">Reference games</a> ·
  <a href="brand/README.md">Identity</a>
</p>

---

```bash
npx create-sub-engine my-game
cd my-game && npm install && npm run dev
```

## Why

Most 2D engines make you choose between a simulation you can test and a game
you can look at. Sub-Engine doesn't: the simulation is pure data and runs in
Node, and PixiJS is a bridge you attach when you want pixels.

- **Entities are integers.** There is no object graph to serialise, diff or
  inspect. An agent can read the entire world state as JSON and write it back.
- **The core has zero dependencies.** `@sub-engine/core` has no `dependencies`
  field at all and will not touch `window`. Simulation logic runs in a test, a
  CI job or a game server.
- **Systems are pure functions.** `(registry, dt) => registry`. No hidden state,
  no lifecycle, nothing to mock.
- **Every write is validated.** Schemas are registered once; a typo in a
  component name throws at the call site instead of at 3am.
- **Typing is structural.** `Registry<M>` is parameterised by your
  `ComponentMap`, so `getEntitiesWith` destructures to exactly the components
  the query asked for.

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
npm test              # Run 201 engine tests
npm run build:pkgs    # Build both packages to dist/
```

## Project Structure

```
├── packages/
│   ├── core/            # @sub-engine/core (headless ECS)
│   ├── pixi/            # @sub-engine/pixi (rendering bridge)
│   └── create-app/      # create-sub-engine CLI + template
├── games/               # 10 reference implementations
├── tests/               # 201 engine tests (vitest)
├── src/                 # Root dev playground
├── package.json         # Workspace root
└── tsconfig.json
```

## Identity

The mark is a **block in section** — two seams the data rests on, one gate
every system crosses, one entity in flight.

<p align="center">
  <img src="docs/brand/02-brand-system.png" alt="Sub-Engine brand system" width="100%">
</p>

Assets live in [`assets/`](assets) and the full system — exploration,
construction, specification and the rules it ships under — is in
[`brand/`](brand).

| | |
|---|---|
| ![lockup](assets/logo-lockup.svg) | `assets/logo-lockup.svg` |
| ![mark](assets/logo-mark.svg) | `assets/logo-mark.svg` — 32px and up |
| ![inverse](assets/logo-mark-inverse.svg) | `assets/logo-mark-inverse.svg` — dark surfaces |
| ![favicon](assets/favicon.svg) | `assets/favicon.svg` — the designed 16px cut |

Solar orange `#FF5A1F` is inherited from [Type-3 Studio](https://type3.studio);
everything else is Sub-Engine's own.

## License

MIT
