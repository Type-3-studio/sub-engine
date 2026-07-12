export interface GameLoop {
  start(): void
  stop(): void
  pause(): void
  resume(): void
  step(): void
  isRunning(): boolean
  isPaused(): boolean
}

export interface GameLoopOptions {
  tickRate?: number
  maxFrameMs?: number
  onStep: () => void
  onFrame?: (alpha: number) => void
}

export function createGameLoop(options: GameLoopOptions): GameLoop {
  const { tickRate = 60, maxFrameMs = 100, onStep, onFrame } = options
  const tickInterval = 1000 / tickRate

  let running = false
  let paused = false
  let rafId = 0
  let lastT = 0
  let tickAcc = 0

  function step(): void {
    onStep()
  }

  function loop(t: number): void {
    if (!running) return

    const raw = t - lastT
    lastT = t

    if (!paused) {
      const dt = Math.min(raw, maxFrameMs)
      tickAcc += dt
      while (tickAcc >= tickInterval) {
        step()
        tickAcc -= tickInterval
      }
    }

    const alpha = tickAcc / tickInterval
    onFrame?.(alpha)
    rafId = requestAnimationFrame(loop)
  }

  function start(): void {
    if (running) return
    running = true
    paused = false
    lastT = performance.now()
    tickAcc = 0
    rafId = requestAnimationFrame(loop)
  }

  function stop(): void {
    running = false
    paused = false
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
  }

  function pause(): void {
    paused = true
  }

  function resume(): void {
    if (!paused) return
    paused = false
    lastT = performance.now()
    tickAcc = 0
  }

  function isRunning(): boolean {
    return running
  }

  function isPaused(): boolean {
    return paused
  }

  return { start, stop, pause, resume, step, isRunning, isPaused }
}
