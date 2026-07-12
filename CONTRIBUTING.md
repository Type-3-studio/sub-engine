# Contributing to Sub-Engine

## Quick Start

```bash
git clone https://github.com/Type-3-studio/sub-engine.git
cd sub-engine
npm install
npm run dev            # Root dev playground
npm run typecheck      # 0 errors expected
npm test               # 187 tests should pass
```

## Development Workflow

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `npm run typecheck` and `npm test` — both must pass
4. Submit a pull request

## Architecture Rules

Read `AGENTS.md` before contributing. Key constraints:

- **DDL-001**: Pure-data ECS — no classes, no OOP
- **DDL-002**: Headless-first — systems never import pixi.js
- **DDL-003**: Stateless pure function systems `(registry, dt) => registry`
- **DDL-008**: Common systems must not depend on game-specific contracts

## Package Structure

| Package | Description | Build |
|---------|-------------|-------|
| `packages/core` | Headless ECS engine | `npm run build -w packages/core` |
| `packages/pixi` | PixiJS rendering bridge | `npm run build -w packages/pixi` |
| `packages/create-app` | CLI scaffold | No build needed |

## Code Style

- No comments in source code — keep it self-documenting
- TypeScript strict mode, ES modules, `.js` extension in imports
- Factory functions over classes
- Pure data copies on read — use `getComponentReadonly()` only in hot paths

## Testing

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm run typecheck     # Full type check
```

## Publishing

Only maintainers can publish:

```bash
npm run build:pkgs
npm publish -w packages/core --access public
npm publish -w packages/pixi --access public
npm publish -w packages/create-app --access public
```
