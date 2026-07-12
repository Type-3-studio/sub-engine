import { registerSchema } from '@sub-engine/core'

export const SCHEMA = {
  POSITION: 'Position',
  VELOCITY: 'Velocity',
  HEALTH: 'Health',
  TARGET_SCANNER: 'TargetScanner',
  ECONOMY: 'Economy',
  POPULATION: 'Population',
  HAPPINESS: 'Happiness',
  BUILDING: 'Building',
  PERSON: 'Person',
  LABEL: 'Label',
} as const

export interface CastleComponents {
  'Position': { x: number; y: number }
  'Velocity': { x: number; y: number }
  'Health': { current: number; max: number }
  'TargetScanner': { range: number; targetEntity?: number }
  'Economy': {
    food: number
    gold: number
    taxRate: number
    foodRations: number
    workers: number
    farmWorkers: number
    mineWorkers: number
    foodProduction: number
    foodConsumption: number
    goldMining: number
    taxGold: number
    starved: boolean
  }
  'Population': {
    population: number
    maxPopulation: number
    soldiers: number
    maxSoldiers: number
    totalFarmWorkerSlots: number
    totalMineWorkerSlots: number
  }
  'Happiness': {
    happiness: number
    day: number
  }
  'Building': { type: string; level: number }
  'Person': { targetX: number; targetY: number; speed: number; state: string; idleTimer: number }
  'Label': { value: string }
}

registerSchema(SCHEMA.ECONOMY, {
  food: { type: 'number', required: true },
  gold: { type: 'number', required: true },
  taxRate: { type: 'number', required: true },
  foodRations: { type: 'number', required: true },
  workers: { type: 'number', required: true },
  farmWorkers: { type: 'number', required: true },
  mineWorkers: { type: 'number', required: true },
  foodProduction: { type: 'number', required: true },
  foodConsumption: { type: 'number', required: true },
  goldMining: { type: 'number', required: true },
  taxGold: { type: 'number', required: true },
  starved: { type: 'boolean', required: true },
})

registerSchema(SCHEMA.POPULATION, {
  population: { type: 'integer', required: true },
  maxPopulation: { type: 'integer', required: true },
  soldiers: { type: 'integer', required: true },
  maxSoldiers: { type: 'integer', required: true },
  totalFarmWorkerSlots: { type: 'integer', required: true },
  totalMineWorkerSlots: { type: 'integer', required: true },
})

registerSchema(SCHEMA.HAPPINESS, {
  happiness: { type: 'number', required: true },
  day: { type: 'integer', required: true },
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
