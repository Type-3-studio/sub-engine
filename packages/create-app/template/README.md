# My Game

A game built on [Sub-Engine](https://github.com/Type-3-studio/sub-engine).

## Quick Start

```bash
npm install
npm run dev
```

Arrow keys move the player. F12 toggles debug overlay.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run typecheck` | TypeScript type check |

## Project Structure

```
├── src/
│   ├── game/          # ★ Your game code
│   │   ├── contract.ts  # Component definitions
│   │   ├── config/      # Constants
│   │   └── systems/     # ECS systems
│   └── client/        # PixiJS rendering
├── index.html
└── package.json
```
