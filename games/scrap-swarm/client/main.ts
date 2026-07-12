import { Application } from 'pixi.js'
import { createResponsiveContainer, DebugOverlay } from '@sub-engine/pixi'
import { createGameScene } from './gameScene.js'
import { createUI } from './ui.js'
import { GAME_W, GAME_H } from '../game/config.js'

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

  const gameContainer = createResponsiveContainer(app, GAME_W, GAME_H)

  const game = createGameScene(gameContainer, app)

  const savedState = localStorage.getItem('scrap-swarm-save')
  if (savedState) {
    game.loadGame(savedState)
  }

  const ui = createUI(gameContainer, () => game.getSelectedUnitInfo())
  game.setUI(ui)

  const debug = new DebugOverlay(app, () => game.getSnapshot() as any, () => game.togglePause())
  app.ticker.add(() => debug.update())

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      game.saveGame()
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
      e.preventDefault()
      const saved = localStorage.getItem('scrap-swarm-save')
      if (saved) game.loadGame(saved)
    }
  })
}
