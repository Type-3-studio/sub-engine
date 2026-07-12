import { Application } from 'pixi.js'
import { createResponsiveContainer } from '@sub-engine/pixi'
import { createGameScene } from './gameScene.js'
import { createUI } from './ui.js'

const GAME_W = 640
const GAME_H = 642

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

  const game = createGameScene(gameContainer, app, GAME_W, GAME_H)
  const ui = createUI(gameContainer, game, GAME_W, GAME_H)
  game.setUI(ui)
  ui.update(game.getState())
}
