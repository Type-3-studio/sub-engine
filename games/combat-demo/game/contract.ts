import { registerSchema } from '../../../src/engine/index.js'

export const SCHEMA = {
  POSITION: 'Position',
  VELOCITY: 'Velocity',
  HEALTH: 'Health',
  TARGET_SCANNER: 'TargetScanner',
  GROUP: 'Group',
} as const

export interface CombatComponents {
  'Position': { x: number; y: number }
  'Velocity': { x: number; y: number }
  'Health': { current: number; max: number }
  'TargetScanner': { range: number; targetEntity?: number }
  'Group': { name: string }
}

registerSchema('Group', {
  name: { type: 'string', required: true },
})
