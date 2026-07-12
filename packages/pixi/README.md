# @sub-engine/pixi

PixiJS 8 rendering bridge for Sub-Engine — responsive containers, sprite sheets, tilemaps, debug overlay.

Part of the [Sub-Engine](https://github.com/Type-3-studio/sub-engine) monorepo.

## Install

```bash
npm install @sub-engine/pixi pixi.js
```

Includes all of `@sub-engine/core` — no need to install both.

## Usage

```ts
import { Application, Graphics } from 'pixi.js'
import { createRegistry, createResponsiveContainer, DebugOverlay } from '@sub-engine/pixi'

const app = new Application()
await app.init({ resizeTo: window })
const container = createResponsiveContainer(app, 800, 600)

const registry = createRegistry()
// ... your game code

const overlay = new DebugOverlay(app, () => registry.getAllEntities())
app.ticker.add(() => overlay.update())
```

## Included

| Export | Source |
|--------|--------|
| `createResponsiveContainer` | Scaled virtual container for any screen |
| `createAnimManager` | PNG sequence → AnimatedSprite loader |
| `createTiledMapRenderer` | Tiled `.tmj`/`.tsj` map renderer |
| `createProceduralMap` | Procedural tile map generator |
| `DebugOverlay` | F12 debug overlay (FPS, entities, inspect) |
| Everything from `@sub-engine/core` | All headless ECS APIs |

## Docs

Full project structure and conventions: [AGENTS.md](https://github.com/Type-3-studio/sub-engine/blob/main/AGENTS.md)
