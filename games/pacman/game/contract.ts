import { registerSchema } from '@sub-engine/core'

export const SCHEMA = {
  POSITION: 'Position',
  VELOCITY: 'Velocity',
  DIRECTION: 'Direction',
  PACMAN: 'PacMan',
  GHOST: 'Ghost',
  PELLET: 'Pellet',
  GAME_STATE: 'GameState',
  LABEL: 'Label',
  ZORDER: 'ZOrder',
} as const

export interface PacComponents {
  'Position': { x: number; y: number }
  'Velocity': { x: number; y: number }
  'Direction': { current: string; next: string }
  'PacMan': {
    speed: number
    score: number
    lives: number
    powerTimer: number
    moveTimer: number
    mouthOpen: boolean
    invincible: number
  }
  'Ghost': {
    type: string
    state: string
    speed: number
    frightenedTimer: number
    moveTimer: number
    homeX: number
    homeY: number
    scatterX: number
    scatterY: number
    released: boolean
  }
  'Pellet': {
    value: number
    isPowerUp: boolean
  }
  'GameState': {
    score: number
    lives: number
    level: number
    phase: string
    dotsEaten: number
    totalDots: number
    ghostModeTimer: number
    ghostMode: string
    combo: number
    message: string
    messageTimer: number
  }
  'Label': { value: string }
  'ZOrder': { layer: number; order: number }
}

registerSchema('Direction', {
  current: { type: 'string', required: true },
  next: { type: 'string', required: true },
})

registerSchema('PacMan', {
  speed: { type: 'number', required: true },
  score: { type: 'number', required: true },
  lives: { type: 'number', required: true },
  powerTimer: { type: 'number', required: true },
  moveTimer: { type: 'number', required: true },
  mouthOpen: { type: 'boolean', required: true },
  invincible: { type: 'number', required: true },
})

registerSchema('Ghost', {
  type: { type: 'string', required: true },
  state: { type: 'string', required: true },
  speed: { type: 'number', required: true },
  frightenedTimer: { type: 'number', required: true },
  moveTimer: { type: 'number', required: true },
  homeX: { type: 'number', required: true },
  homeY: { type: 'number', required: true },
  scatterX: { type: 'number', required: true },
  scatterY: { type: 'number', required: true },
  released: { type: 'boolean', required: true },
})

registerSchema('Pellet', {
  value: { type: 'number', required: true },
  isPowerUp: { type: 'boolean', required: true },
})

registerSchema('GameState', {
  score: { type: 'number', required: true },
  lives: { type: 'number', required: true },
  level: { type: 'number', required: true },
  phase: { type: 'string', required: true },
  dotsEaten: { type: 'number', required: true },
  totalDots: { type: 'number', required: true },
  ghostModeTimer: { type: 'number', required: true },
  ghostMode: { type: 'string', required: true },
  combo: { type: 'number', required: true },
  message: { type: 'string', required: true },
  messageTimer: { type: 'number', required: true },
})

export const TILE_SIZE = 32
export const HALF_TILE = TILE_SIZE / 2

export function tileCenter(col: number, row: number): { x: number; y: number } {
  return { x: col * TILE_SIZE + HALF_TILE, y: row * TILE_SIZE + HALF_TILE }
}

export function posToTile(x: number, y: number): { col: number; row: number } {
  return { col: Math.floor(x / TILE_SIZE), row: Math.floor(y / TILE_SIZE) }
}

export function distToTileCenter(x: number, y: number): number {
  const t = posToTile(x, y)
  const c = tileCenter(t.col, t.row)
  return Math.abs(x - c.x) + Math.abs(y - c.y)
}

export function dirToVec(dir: string): { x: number; y: number } {
  switch (dir) {
    case 'up': return { x: 0, y: -1 }
    case 'down': return { x: 0, y: 1 }
    case 'left': return { x: -1, y: 0 }
    case 'right': return { x: 1, y: 0 }
    default: return { x: 0, y: 0 }
  }
}

export const DIRS = ['up', 'down', 'left', 'right'] as const
export type Dir = typeof DIRS[number]

export const OPPOSITE: Record<string, string> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}
