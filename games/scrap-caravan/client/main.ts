import { Application } from 'pixi.js'
import { createResponsiveContainer, DebugOverlay } from '@sub-engine/pixi'
import { createGameScene } from './gameScene.js'
import { createUI } from './ui.js'
import { GRID_W, GRID_H, HUD_H } from '../game/config.js'

export async function init(): Promise<void> {
  const app = new Application()
  await app.init({
    resizeTo: window,
    backgroundColor: 0x0a0a1a,
    antialias: true,
  })

  const appContainer = document.getElementById('app')
  if (!appContainer) throw new Error('#app element not found')
  appContainer.appendChild(app.canvas as HTMLCanvasElement)

  const gameContainer = createResponsiveContainer(app, GRID_W, GRID_H + HUD_H)

  const game = createGameScene(gameContainer, app)
  const ui = createUI(game)
  game.setUI(ui)

  const debug = new DebugOverlay(app, () => game.getSnapshot() as any, () => game.togglePause())
  app.ticker.add(() => debug.update())

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Space') {
      e.preventDefault()
      game.startWave()
    }
    if (e.key === 'b' || e.key === 'B') {
      e.preventDefault()
      game.buildCrawler()
    }
  })
}
