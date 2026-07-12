import { registerSchema } from '@sub-engine/core'

export const SCHEMA = {
  POSITION: 'Position',
  VELOCITY: 'Velocity',
  HEALTH: 'Health',
  PLAYER: 'Player',
  ITEM: 'Item',
} as const

export interface SerialComponents {
  'Position': { x: number; y: number }
  'Velocity': { x: number; y: number }
  'Health': { current: number; max: number }
  'Player': { name: string; level: number; xp: number }
  'Item': { name: string; value: number; equippable: boolean }
}

registerSchema('Player', {
  name: { type: 'string', required: true },
  level: { type: 'integer', required: true },
  xp: { type: 'number', required: true },
})

registerSchema('Item', {
  name: { type: 'string', required: true },
  value: { type: 'number', required: true },
  equippable: { type: 'boolean', required: true },
})
