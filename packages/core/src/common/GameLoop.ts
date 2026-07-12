import type { Registry, ComponentMap } from '../engine/types.js'

export interface GameLoop {
  start(): void
  stop(): void
  step(): void
  isRunning(): boolean
}

export function createGameLoop<M extends ComponentMap = Record<string, any>>(
  registry: Registry<M>,
  systems: Array<(registry: Registry<M>, dt: number) => Registry<M>>,
  tickRate: number = 60
): GameLoop {
  let running = false
  let rafId = 0
  let lastT = 0
  let tickAcc = 0
  const tickInterval = 1000 / tickRate

  function step(): void {
    for (let i = 0; i < systems.length; i++) {
      systems[i]!(registry, tickInterval)
    }
  }

  function tick(dt: number): void {
    tickAcc += dt
    while (tickAcc >= tickInterval) {
      step()
      tickAcc -= tickInterval
    }
  }

  function loop(t: number): void {
    if (!running) return
    const dt = t - lastT
    lastT = t
    tick(dt)
    rafId = requestAnimationFrame(loop)
  }

  function start(): void {
    if (running) return
    running = true
    lastT = performance.now()
    tickAcc = 0
    rafId = requestAnimationFrame(loop)
  }

  function stop(): void {
    running = false
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
  }

  function isRunning(): boolean {
    return running
  }

  return { start, stop, step, isRunning }
}
