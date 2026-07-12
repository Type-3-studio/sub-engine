import { Container, Application } from 'pixi.js'

export function createResponsiveContainer(app: Application, virtualWidth: number, virtualHeight: number): Container {
  const container = new Container()
  app.stage.addChild(container)

  function fit(): void {
    const sx = app.screen.width / virtualWidth
    const sy = app.screen.height / virtualHeight
    const s = Math.min(sx, sy)
    container.scale.set(s)
    container.x = (app.screen.width - virtualWidth * s) / 2
    container.y = (app.screen.height - virtualHeight * s) / 2
  }

  window.addEventListener('resize', fit)
  window.addEventListener('orientationchange', () => setTimeout(fit, 200))
  fit()

  return container
}
