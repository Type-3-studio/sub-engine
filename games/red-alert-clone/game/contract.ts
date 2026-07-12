import { registerSchema } from '@sub-engine/core'

export const SCHEMA = {
  POSITION: 'Position',
  VELOCITY: 'Velocity',
  HEALTH: 'Health',
  TARGET_SCANNER: 'TargetScanner',
  PATH_FOLLOWER: 'PathFollower',
  LABEL: 'Label',
  OWNER: 'Owner',
  UNIT: 'Unit',
  BUILDING: 'Building',
  BUILD_QUEUE: 'BuildQueue',
  GAME_STATE: 'GameState',
  MAP_STATE: 'MapState',
  FOG_STATE: 'FogState',
  SELECTED: 'Selected',
  PROJECTILE: 'Projectile',
  ORE_DEPOSIT: 'OreDeposit',
  CONTROL_GROUP: 'ControlGroup',
  HARVESTER_TARGET: 'HarvesterTarget',
  AI_TIMER: 'AITimer',
} as const

export interface RaComponents {
  'Position': { x: number; y: number }
  'Velocity': { x: number; y: number }
  'Health': { current: number; max: number }
  'TargetScanner': { range: number; targetEntity?: number; damage?: number; fireRate?: number; cooldownRemaining?: number; ownerFaction?: string }
  'PathFollower': { path: Array<{ x: number; y: number }>; index: number; speed: number; loop?: boolean }
  'Label': { value: string }
  'Owner': { faction: string }
  'Unit': {
    type: string
    state: string
    payload: number
    payloadCapacity: number
    attackCooldown: number
    attackRange: number
    damage: number
    moveSpeed: number
    buildTime: number
    cost: number
    faction: string
  }
  'Building': {
    type: string
    state: string
    progress: number
    width: number
    height: number
    powerProvided: number
    powerDrain: number
    faction: string
  }
  'BuildQueue': { items: Array<{ type: string; progress: number; totalTime: number; cost: number }> }
  'GameState': { credits: number; phase: string; playerFaction: string }
  'MapState': { width: number; height: number; tiles: number[]; ore: number[] }
  'FogState': { visible: number[]; revealed: number[] }
  'Selected': { entityIds: number[] }
  'Projectile': { targetX: number; targetY: number; startX: number; startY: number; speed: number; damage: number; ownerFaction: string }
  'OreDeposit': { amount: number }
  'ControlGroup': { group: number; entityIds: number[] }
  'HarvesterTarget': { tileX: number; tileY: number }
  'AITimer': { timer: number }
}


registerSchema('Owner', {
  faction: { type: 'string', required: true },
})

registerSchema('Unit', {
  type: { type: 'string', required: true },
  state: { type: 'string', required: true },
  payload: { type: 'number', required: true },
  payloadCapacity: { type: 'number', required: true },
  attackCooldown: { type: 'number', required: true },
  attackRange: { type: 'number', required: true },
  damage: { type: 'number', required: true },
  moveSpeed: { type: 'number', required: true },
  buildTime: { type: 'number', required: true },
  cost: { type: 'number', required: true },
  faction: { type: 'string', required: true },
})

registerSchema('Building', {
  type: { type: 'string', required: true },
  state: { type: 'string', required: true },
  progress: { type: 'number', required: true },
  width: { type: 'number', required: true },
  height: { type: 'number', required: true },
  powerProvided: { type: 'number', required: true },
  powerDrain: { type: 'number', required: true },
  faction: { type: 'string', required: true },
})

registerSchema('BuildQueue', {
  items: { type: 'array', required: true },
})

registerSchema('GameState', {
  credits: { type: 'number', required: true },
  phase: { type: 'string', required: true },
  playerFaction: { type: 'string', required: true },
})

registerSchema('MapState', {
  width: { type: 'number', required: true },
  height: { type: 'number', required: true },
  tiles: { type: 'array', required: true },
  ore: { type: 'array', required: true },
})

registerSchema('FogState', {
  visible: { type: 'array', required: true },
  revealed: { type: 'array', required: true },
})

registerSchema('Selected', {
  entityIds: { type: 'array', required: true },
})

registerSchema('Projectile', {
  targetX: { type: 'number', required: true },
  targetY: { type: 'number', required: true },
  startX: { type: 'number', required: true },
  startY: { type: 'number', required: true },
  speed: { type: 'number', required: true },
  damage: { type: 'number', required: true },
  ownerFaction: { type: 'string', required: true },
})

registerSchema('OreDeposit', {
  amount: { type: 'number', required: true },
})

registerSchema('ControlGroup', {
  group: { type: 'number', required: true },
  entityIds: { type: 'array', required: true },
})

registerSchema('HarvesterTarget', {
  tileX: { type: 'number', required: true },
  tileY: { type: 'number', required: true },
})

registerSchema('AITimer', {
  timer: { type: 'number', required: true },
})
