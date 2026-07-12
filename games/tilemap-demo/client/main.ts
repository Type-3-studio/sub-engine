import { Application } from 'pixi.js'
import { createScene } from './tilemapScene.js'

export async function init(): Promise<void> {
  const app = new Application()
  await app.init({ resizeTo: window, backgroundColor: 0x0a0a1a, antialias: true })
  const appContainer = document.getElementById('app')
  if (!appContainer) throw new Error('#app element not found')
  appContainer.appendChild(app.canvas as HTMLCanvasElement)

  await createScene(app)
}

init()
