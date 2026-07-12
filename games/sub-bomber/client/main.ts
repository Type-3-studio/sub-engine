import { Application } from 'pixi.js'
import { createResponsiveContainer, DebugOverlay } from '@sub-engine/pixi'
import type { EntitySnapshot } from '@sub-engine/pixi'
import { createGameLoop } from '@sub-engine/core'
import { BomberGame } from '../game/game.js'
import { Renderer } from './renderer.js'
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, HUD_HEIGHT } from '../game/config.js'

const GAME_W = MAP_WIDTH * TILE_SIZE
const GAME_H = MAP_HEIGHT * TILE_SIZE + HUD_HEIGHT

export async function init(): Promise<void> {
  const app = new Application()
  await app.init({
    resizeTo: window,
    backgroundColor: 0x000000,
    antialias: true,
  })

  const appContainer = document.getElementById('app')
  if (!appContainer) throw new Error('#app element not found')
  appContainer.appendChild(app.canvas as HTMLCanvasElement)

  const gameContainer = createResponsiveContainer(app, GAME_W, GAME_H)
  const renderer = new Renderer(gameContainer, GAME_W, GAME_H)

  const game = new BomberGame()

  const keys = new Set<string>()
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    keys.add(e.key)
    if (e.key === 'Enter' && game.phase === 'won') {
      game.initStage(game.stage + 1)
    }
    if ((e.key === 'r' || e.key === 'R') && game.phase === 'gameover') {
      game.score = 0
      game.initStage(1)
    }
    e.preventDefault()
  })
  window.addEventListener('keyup', (e: KeyboardEvent) => {
    keys.delete(e.key)
  })

  const debug = new DebugOverlay(
    app,
    () => game.getSnapshot() as EntitySnapshot[],
    () => game.togglePause(),
  )
  app.ticker.add(() => debug.update())

  const loop = createGameLoop({
    tickRate: 62.5,
    maxFrameMs: 100,
    onStep: (dt) => {
      game.inputState.dx = 0
      game.inputState.dy = 0
      game.inputState.wantBomb = false

      if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) game.inputState.dy = -1
      else if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) game.inputState.dy = 1
      else if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) game.inputState.dx = -1
      else if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) game.inputState.dx = 1

      if (keys.has(' ') || keys.has('Space')) game.inputState.wantBomb = true

      game.tick(dt)
    },
    onFrame: () => {
      renderer.render(game)
    },
  })

  loop.start()
}
