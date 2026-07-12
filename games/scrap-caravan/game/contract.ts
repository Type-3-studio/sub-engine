import { registerSchema } from '@sub-engine/core'
import type { ComponentMap } from '@sub-engine/core'

export const SCHEMA = {
  POSITION: 'Position',
  VELOCITY: 'Velocity',
  HEALTH: 'Health',
  PATH_FOLLOWER: 'PathFollower',
  LABEL: 'Label',
  SCRAP_NODE: 'ScrapNode',
  ECONOMY_STORAGE: 'EconomyStorage',
  INVENTORY: 'Inventory',
  COMPOSITE_VISUAL: 'CompositeVisual',
  DRONE_AI: 'DroneAI',
  CRAWLER: 'Crawler',
  SWARM_BEETLE: 'SwarmBeetle',
  STORM: 'Storm',
  GRID_CELL: 'GridCell',
} as const

export interface ScrapCaravanComponents extends ComponentMap {
  'Position': { x: number; y: number }
  'Velocity': { x: number; y: number }
  'Health': { current: number; max: number }
  'PathFollower': { path: Array<{ x: number; y: number }>; index: number; speed: number; loop?: boolean }
  'Label': { value: string }
  'ScrapNode': { resourceType: 'silicon' | 'iron' | 'copper'; remainingUnits: number; maxUnits: number }
  'EconomyStorage': { balances: Record<string, number> }
  'Inventory': { slots: Array<{ itemId: string; quantity: number }>; maxWeight: number; assignedCollectorId: number | null }
  'CompositeVisual': { baseAsset: string; attachmentAsset: string | null; rotationOffset: number }
  'DroneAI': { state: 'idle' | 'traveling' | 'mining' | 'returning'; targetNodeId: number | null; cargo: Array<{ itemId: string; quantity: number }>; maxCargo: number; cargoCapacity: number }
  'Crawler': { damage: number; range: number; fireRate: number; cooldown: number }
  'SwarmBeetle': { damage: number; speed: number }
  'Storm': { intensity: number; duration: number; elapsed: number; x: number; y: number; radius: number }
  'GridCell': { gx: number; gy: number; walkable: boolean; resourceType: string | null }
}

registerSchema(SCHEMA.SCRAP_NODE, {
  resourceType: { type: 'string', required: true },
  remainingUnits: { type: 'number', required: true },
  maxUnits: { type: 'number', required: true },
})

registerSchema(SCHEMA.ECONOMY_STORAGE, {
  balances: { type: 'object', required: true },
})

registerSchema(SCHEMA.INVENTORY, {
  slots: { type: 'array', required: true },
  maxWeight: { type: 'number', required: true },
  assignedCollectorId: { type: 'any', required: false },
})

registerSchema(SCHEMA.COMPOSITE_VISUAL, {
  baseAsset: { type: 'string', required: true },
  attachmentAsset: { type: 'any', required: false },
  rotationOffset: { type: 'number', required: true },
})

registerSchema(SCHEMA.DRONE_AI, {
  state: { type: 'string', required: true },
  targetNodeId: { type: 'any', required: false },
  cargo: { type: 'array', required: true },
  maxCargo: { type: 'number', required: true },
  cargoCapacity: { type: 'number', required: true },
})

registerSchema(SCHEMA.CRAWLER, {
  damage: { type: 'number', required: true },
  range: { type: 'number', required: true },
  fireRate: { type: 'number', required: true },
  cooldown: { type: 'number', required: true },
})

registerSchema(SCHEMA.SWARM_BEETLE, {
  damage: { type: 'number', required: true },
  speed: { type: 'number', required: true },
})

registerSchema(SCHEMA.STORM, {
  intensity: { type: 'number', required: true },
  duration: { type: 'number', required: true },
  elapsed: { type: 'number', required: true },
  x: { type: 'number', required: true },
  y: { type: 'number', required: true },
  radius: { type: 'number', required: true },
})

registerSchema(SCHEMA.GRID_CELL, {
  gx: { type: 'number', required: true },
  gy: { type: 'number', required: true },
  walkable: { type: 'boolean', required: true },
  resourceType: { type: 'any', required: false },
})

registerSchema(SCHEMA.LABEL, {
  value: { type: 'string', required: true },
})
