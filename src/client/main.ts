import { Application, Text } from 'pixi.js'
import { createResponsiveContainer } from '../common/responsive.js'

export async function init(): Promise<void> {
  const app = new Application()
  await app.init({
    resizeTo: window,
    backgroundColor: 0x111122,
    antialias: true,
  })

  const appContainer = document.getElementById('app')
  if (!appContainer) throw new Error('#app element not found')
  appContainer.appendChild(app.canvas as HTMLCanvasElement)

  const container = createResponsiveContainer(app, 640, 480)

  const text = new Text({
    text: 'Replace me!\nSee games/tower-defense/ for a reference game.',
    style: { fill: 0x888888, fontSize: 20, fontFamily: 'monospace' },
  })
  text.anchor = { x: 0.5, y: 0.5 }
  text.x = 320
  text.y = 240
  container.addChild(text)
}
