import { Application } from 'pixi.js'
import { createResponsiveContainer } from '@sub-engine/pixi'
import { createGameScene } from './gameScene.js'

const GAME_W = 21 * 32
const GAME_H = 16 * 32 + 24

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

  await createGameScene(gameContainer, app, GAME_W, GAME_H)
}
