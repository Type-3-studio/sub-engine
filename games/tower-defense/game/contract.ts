import { registerSchema } from '@sub-engine/core'

export const SCHEMA = {
  POSITION: 'Position',
  VELOCITY: 'Velocity',
  HEALTH: 'Health',
  TARGET_SCANNER: 'TargetScanner',
  PATH_FOLLOWER: 'TdPathFollower',
  TOWER: 'Tower',
  PROJECTILE: 'Projectile',
  GAME_STATE: 'GameState',
  WAVE_CONFIG: 'WaveConfig',
  ENEMY: 'Enemy',
  LABEL: 'Label',
} as const

export interface TdComponents {
  'Position': { x: number; y: number }
  'Velocity': { x: number; y: number }
  'Health': { current: number; max: number }
  'TargetScanner': { range: number; targetEntity?: number }
  'TdPathFollower': { waypoints: Array<{ x: number; y: number }>; waypointIndex: number; speed: number }
  'Tower': { range: number; damage: number; fireRate: number; cooldown: number; towerType: string; projectileSpeed?: number; cost: number }
  'Projectile': { targetEntity: number; speed: number; damage: number }
  'GameState': { money: number; lives: number; wave: number; phase: string }
  'WaveConfig': { count: number; spawned: number; waypoints: Array<{ x: number; y: number }>; enemySpeed: number; enemyHealth: number; spawnInterval: number; reward: number; spawnTimer: number; maxWave: number }
  'Enemy': { reward: number }
  'Label': { value: string }
}

registerSchema('TdPathFollower', {
  waypoints: { type: 'array', required: true },
  waypointIndex: { type: 'number', required: true },
  speed: { type: 'number', required: true },
})

registerSchema(SCHEMA.TOWER, {
  range: { type: 'number', required: true },
  damage: { type: 'number', required: true },
  fireRate: { type: 'number', required: true },
  cooldown: { type: 'number', required: true },
  towerType: { type: 'string', required: true },
  projectileSpeed: { type: 'number', required: false },
  cost: { type: 'number', required: true },
})

registerSchema(SCHEMA.PROJECTILE, {
  targetEntity: { type: 'number', required: true },
  speed: { type: 'number', required: true },
  damage: { type: 'number', required: true },
})

registerSchema(SCHEMA.GAME_STATE, {
  money: { type: 'number', required: true },
  lives: { type: 'number', required: true },
  wave: { type: 'number', required: true },
  phase: { type: 'string', required: true },
})

registerSchema(SCHEMA.WAVE_CONFIG, {
  count: { type: 'number', required: true },
  spawned: { type: 'number', required: true },
  waypoints: { type: 'array', required: true },
  enemySpeed: { type: 'number', required: true },
  enemyHealth: { type: 'number', required: true },
  spawnInterval: { type: 'number', required: true },
  reward: { type: 'number', required: true },
  spawnTimer: { type: 'number', required: true },
  maxWave: { type: 'number', required: true },
})

registerSchema(SCHEMA.ENEMY, {
  reward: { type: 'number', required: true },
})

registerSchema(SCHEMA.LABEL, {
  value: { type: 'string', required: true },
})
