import { Application } from 'pixi.js'
import { createResponsiveContainer } from '@sub-engine/pixi'
import { createGameScene } from './gameScene.js'
import { createUI } from './ui.js'
import { MAP_W, TOTAL_H } from '../game/config/castle.js'

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

  const gameContainer = createResponsiveContainer(app, MAP_W, TOTAL_H)

  const game = createGameScene(gameContainer, app, MAP_W, TOTAL_H)
  const ui = createUI(gameContainer, game, MAP_W, TOTAL_H)
  game.setUI(ui)
  ui.update(game.getState())
}
