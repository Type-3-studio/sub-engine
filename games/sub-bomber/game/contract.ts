import { registerSchema } from '@sub-engine/core'

export const SCHEMA = {
  GRID_POSITION: 'GridPosition',
  PLAYER: 'Player',
  MOVE_COOLDOWN: 'MoveCooldown',
  BOMB: 'Bomb',
  EXPLOSION: 'Explosion',
  ENEMY: 'Enemy',
  POWERUP: 'Powerup',
  DOOR: 'Door',
  LABEL: 'Label',
} as const

export interface BomberComponents {
  'GridPosition': { x: number; y: number }
  'Player': {
    bombCount: number
    bombRadius: number
    moveInterval: number
    alive: boolean
    lives: number
    invulnTimer: number
    bombCooldown: number
  }
  'MoveCooldown': { remaining: number }
  'Bomb': { timer: number; radius: number; ownerId: number }
  'Explosion': { timer: number }
  'Enemy': { alive: boolean; moveTimer: number; dirX: number; dirY: number }
  'Powerup': { type: string }
  'Door': { open: boolean }
  'Label': { value: string }
}

registerSchema(SCHEMA.GRID_POSITION, {
  x: { type: 'number', required: true },
  y: { type: 'number', required: true },
})

registerSchema(SCHEMA.PLAYER, {
  bombCount: { type: 'number', required: true },
  bombRadius: { type: 'number', required: true },
  moveInterval: { type: 'number', required: true },
  alive: { type: 'boolean', required: true },
  lives: { type: 'number', required: true },
  invulnTimer: { type: 'number', required: true },
  bombCooldown: { type: 'number', required: true },
})

registerSchema(SCHEMA.MOVE_COOLDOWN, {
  remaining: { type: 'number', required: true },
})

registerSchema(SCHEMA.BOMB, {
  timer: { type: 'number', required: true },
  radius: { type: 'number', required: true },
  ownerId: { type: 'number', required: true },
})

registerSchema(SCHEMA.EXPLOSION, {
  timer: { type: 'number', required: true },
})

registerSchema(SCHEMA.ENEMY, {
  alive: { type: 'boolean', required: true },
  moveTimer: { type: 'number', required: true },
  dirX: { type: 'number', required: true },
  dirY: { type: 'number', required: true },
})

registerSchema(SCHEMA.POWERUP, {
  type: { type: 'string', required: true },
})

registerSchema(SCHEMA.DOOR, {
  open: { type: 'boolean', required: true },
})
