import { registerSchema } from '../../../src/engine/index.js'

export const SCHEMA = {
  POSITION: 'Position',
  VELOCITY: 'Velocity',
  LABEL: 'Label',
} as const

export interface MovementComponents {
  'Position': { x: number; y: number }
  'Velocity': { x: number; y: number }
  'Label': { value: string }
}

registerSchema('Label', {
  value: { type: 'string', required: true },
})
