import { Application } from 'pixi.js'
import { createResponsiveContainer, DebugOverlay } from '@sub-engine/pixi'
import { createGameScene } from './gameScene.js'
import { createUI } from './ui.js'
import { SIDEBAR_W } from '../game/config.js'

const GAME_W = 1280
const GAME_H = 720

export async function init(): Promise<void> {
  const app = new Application()
  await app.init({
    resizeTo: window,
    backgroundColor: 0x111111,
    antialias: true,
  })

  const appContainer = document.getElementById('app')
  if (!appContainer) throw new Error('#app element not found')
  appContainer.appendChild(app.canvas as HTMLCanvasElement)

  const gameContainer = createResponsiveContainer(app, GAME_W, GAME_H)

  const game = createGameScene(gameContainer, app, GAME_W, GAME_H)
  const ui = createUI(gameContainer, game, GAME_W, GAME_H)

  // Wire UI update into game
  game.onStateChange = (state) => {
    ui.update(state)
  }
  ui.update(game.getState())

  // Debug overlay
  const debug = new DebugOverlay(app, () => game.getSnapshot(), () => game.togglePause())
  app.ticker.add(() => debug.update())
}
