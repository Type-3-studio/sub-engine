# @sub-engine/core

Headless ECS 2D game engine — pure data, typed, AI-friendly.

Part of the [Sub-Engine](https://github.com/anomalyco/sub-engine) monorepo.

## Install

```bash
npm install @sub-engine/core
```

For PixiJS rendering (sprites, tilemaps, debug overlay), also install:

```bash
npm install @sub-engine/pixi pixi.js
```

## Quick Start

```ts
import { createRegistry, registerSchema } from '@sub-engine/core'

registerSchema('Position', { x: { type: 'number', required: true }, y: { type: 'number', required: true } })
registerSchema('Velocity', { x: { type: 'number', required: true }, y: { type: 'number', required: true } })

const registry = createRegistry()
const player = registry.createEntity()
registry.addComponent(player, 'Position', { x: 0, y: 0 })
registry.addComponent(player, 'Velocity', { x: 1, y: 0 })
```

## Features

- **ECS**: Entities are integers. Components are flat JSON. Systems are pure functions `(registry) => registry`.
- **Headless-first**: Run simulation in Node.js. No browser needed.
- **Typed**: Generic `Registry<M>` parameterized by your `ComponentMap` interface.
- **Schema validation**: Every write validates against registered schemas — catches typos instantly.
- **Built-in systems**: Movement, combat, camera, collision, pathfinding, particles, audio, z-ordering, tile maps.
- **Utilities**: Spatial hash grid, fixed-timestep game loop, entity factory, undo/redo, serialization.
- **Columnar storage**: Optional `createColumnarRegistry()` for 11x faster bulk numeric operations.

## Docs

Full project structure and conventions: [AGENTS.md](https://github.com/anomalyco/sub-engine/blob/main/AGENTS.md)
