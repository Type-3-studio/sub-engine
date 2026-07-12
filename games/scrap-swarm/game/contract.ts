import { registerSchema } from '@sub-engine/core'
import type { ComponentMap } from '@sub-engine/core'

export const SCHEMA = {
  POSITION: 'Position',
  VELOCITY: 'Velocity',
  HEALTH: 'Health',
  COLLIDER: 'Collider',
  CAMERA: 'Camera',
  ZORDER: 'ZOrder',
  TARGET_SCANNER: 'TargetScanner',
  PATH_FOLLOWER: 'PathFollower',
  AUDIO_SOURCE: 'AudioSource',
  PARTICLE_EMITTER: 'ParticleEmitter',
  PARTICLE: 'Particle',
  LABEL: 'Label',
  GAME_STATE: 'GameState',
  RESOURCE_NODE: 'ResourceNode',
  ECONOMY_STORAGE: 'EconomyStorage',
  UNIT_AI: 'UnitAI',
  FIGHTER: 'Fighter',
  WORKER: 'Worker',
  SCOUT: 'Scout',
  ENEMY: 'Enemy',
  PROJECTILE: 'Projectile',
  WAVE_CONFIG: 'WaveConfig',
  ACCUMULATOR: 'Accumulator',
  FLOW_FIELD_TARGET: 'FlowFieldTarget',
  SPAWNER: 'Spawner',
} as const

export interface ScrapSwarmComponents extends ComponentMap {
  'Position': { x: number; y: number }
  'Velocity': { x: number; y: number }
  'Health': { current: number; max: number }
  'Collider': { width: number; height: number; offsetX?: number; offsetY?: number; solid?: boolean; group?: number; mask?: number }
  'Camera': { x: number; y: number; width: number; height: number; zoom: number; targetEntity?: number; minX?: number; minY?: number; maxX?: number; maxY?: number }
  'ZOrder': { layer: number; order: number }
  'TargetScanner': { range: number; targetEntity?: number }
  'PathFollower': { path: Array<{ x: number; y: number }>; index: number; speed: number; loop?: boolean }
  'AudioSource': { src: string; volume: number; loop: boolean; spatial: boolean }
  'ParticleEmitter': { rate: number; lifetime: number; speed: number; color: string; size: number; active: boolean }
  'Particle': { remaining: number; color: string; size: number }
  'Label': { value: string }
  'GameState': { phase: string; wave: number; score: number; tick: number; totalSpawned: number }
  'ResourceNode': { type: string; remaining: number; max: number; depleted: boolean }
  'EconomyStorage': { balances: Record<string, number> }
  'UnitAI': { state: string; role: string; targetId: number | null; orderX: number; orderY: number }
  'Fighter': { damage: number; range: number; fireRate: number; cooldown: number; variant: string }
  'Worker': { carryAmount: number; carryType: string; buildSpeed: number }
  'Scout': { patrolPath: Array<{ x: number; y: number }>; patrolIndex: number; speed: number }
  'Enemy': { damage: number; speed: number; reward: number; variant: string }
  'Projectile': { targetId: number; speed: number; damage: number; lifetime: number }
  'WaveConfig': { count: number; spawned: number; interval: number; timer: number; variants: string[] }
  'Accumulator': { value: number; threshold: number }
  'FlowFieldTarget': { x: number; y: number; active: boolean }
  'Spawner': { x: number; y: number; wave: number; interval: number; variant: string; active: boolean }
}

registerSchema(SCHEMA.LABEL, {
  value: { type: 'string', required: true },
})

registerSchema(SCHEMA.GAME_STATE, {
  phase: { type: 'string', required: true },
  wave: { type: 'number', required: true },
  score: { type: 'number', required: true },
  tick: { type: 'number', required: true },
  totalSpawned: { type: 'number', required: true },
})

registerSchema(SCHEMA.RESOURCE_NODE, {
  type: { type: 'string', required: true },
  remaining: { type: 'number', required: true },
  max: { type: 'number', required: true },
  depleted: { type: 'boolean', required: true },
})

registerSchema(SCHEMA.ECONOMY_STORAGE, {
  balances: { type: 'object', required: true },
})

registerSchema(SCHEMA.UNIT_AI, {
  state: { type: 'string', required: true },
  role: { type: 'string', required: true },
  targetId: { type: 'any', required: false },
  orderX: { type: 'number', required: true },
  orderY: { type: 'number', required: true },
})

registerSchema(SCHEMA.FIGHTER, {
  damage: { type: 'number', required: true },
  range: { type: 'number', required: true },
  fireRate: { type: 'number', required: true },
  cooldown: { type: 'number', required: true },
  variant: { type: 'string', required: true },
})

registerSchema(SCHEMA.WORKER, {
  carryAmount: { type: 'number', required: true },
  carryType: { type: 'string', required: true },
  buildSpeed: { type: 'number', required: true },
})

registerSchema(SCHEMA.SCOUT, {
  patrolPath: { type: 'array', required: true },
  patrolIndex: { type: 'number', required: true },
  speed: { type: 'number', required: true },
})

registerSchema(SCHEMA.ENEMY, {
  damage: { type: 'number', required: true },
  speed: { type: 'number', required: true },
  reward: { type: 'number', required: true },
  variant: { type: 'string', required: true },
})

registerSchema(SCHEMA.PROJECTILE, {
  targetId: { type: 'number', required: true },
  speed: { type: 'number', required: true },
  damage: { type: 'number', required: true },
  lifetime: { type: 'number', required: true },
})

registerSchema(SCHEMA.WAVE_CONFIG, {
  count: { type: 'number', required: true },
  spawned: { type: 'number', required: true },
  interval: { type: 'number', required: true },
  timer: { type: 'number', required: true },
  variants: { type: 'array', required: true },
})

registerSchema(SCHEMA.ACCUMULATOR, {
  value: { type: 'number', required: true },
  threshold: { type: 'number', required: true },
})

registerSchema(SCHEMA.FLOW_FIELD_TARGET, {
  x: { type: 'number', required: true },
  y: { type: 'number', required: true },
  active: { type: 'boolean', required: true },
})

registerSchema(SCHEMA.SPAWNER, {
  x: { type: 'number', required: true },
  y: { type: 'number', required: true },
  wave: { type: 'number', required: true },
  interval: { type: 'number', required: true },
  variant: { type: 'string', required: true },
  active: { type: 'boolean', required: true },
})
