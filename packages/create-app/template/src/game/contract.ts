import { registerSchema } from '@sub-engine/core'

export const SCHEMA = {
  POSITION: 'Position',
  VELOCITY: 'Velocity',
  LABEL: 'Label',
} as const

export interface GameComponents {
  'Position': { x: number; y: number }
  'Velocity': { x: number; y: number }
  'Label': { value: string }
}

