import { registerSchema } from '../../../src/engine/index.js'

export const SCHEMA = {
  POSITION: 'Position',
  VELOCITY: 'Velocity',
  HEALTH: 'Health',
  TARGET_SCANNER: 'TargetScanner',
  GAME_STATE: 'GameState',
  BUILDING: 'Building',
  PERSON: 'Person',
  LABEL: 'Label',
} as const

export interface CastleComponents {
  'Position': { x: number; y: number }
  'Velocity': { x: number; y: number }
  'Health': { current: number; max: number }
  'TargetScanner': { range: number; targetEntity?: number }
  'GameState': {
    population: number
    maxPopulation: number
    soldiers: number
    maxSoldiers: number
    happiness: number
    food: number
    gold: number
    taxRate: number
    foodRations: number
    day: number
    workers: number
    farmWorkers: number
    mineWorkers: number
    foodProduction: number
    foodConsumption: number
    goldMining: number
    taxGold: number
    starved: boolean
    totalFarmWorkerSlots: number
    totalMineWorkerSlots: number
  }
  'Building': { type: string; level: number }
  'Person': { targetX: number; targetY: number; speed: number; state: string; idleTimer: number }
  'Label': { value: string }
}

registerSchema(SCHEMA.GAME_STATE, {
  population: { type: 'number', required: true },
  maxPopulation: { type: 'number', required: true },
  soldiers: { type: 'number', required: true },
  maxSoldiers: { type: 'number', required: true },
  happiness: { type: 'number', required: true },
  food: { type: 'number', required: true },
  gold: { type: 'number', required: true },
  taxRate: { type: 'number', required: true },
  foodRations: { type: 'number', required: true },
  day: { type: 'number', required: true },
  workers: { type: 'number', required: true },
  farmWorkers: { type: 'number', required: true },
  mineWorkers: { type: 'number', required: true },
  foodProduction: { type: 'number', required: true },
  foodConsumption: { type: 'number', required: true },
  goldMining: { type: 'number', required: true },
  taxGold: { type: 'number', required: true },
  starved: { type: 'boolean', required: true },
  totalFarmWorkerSlots: { type: 'number', required: true },
  totalMineWorkerSlots: { type: 'number', required: true },
})

registerSchema(SCHEMA.BUILDING, {
  type: { type: 'string', required: true },
  level: { type: 'number', required: true },
})

registerSchema(SCHEMA.PERSON, {
  targetX: { type: 'number', required: true },
  targetY: { type: 'number', required: true },
  speed: { type: 'number', required: true },
  state: { type: 'string', required: true },
  idleTimer: { type: 'number', required: true },
})

registerSchema(SCHEMA.LABEL, {
  value: { type: 'string', required: true },
})
