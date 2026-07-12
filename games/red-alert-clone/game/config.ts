export const TILE_SIZE = 40
export const MAP_W = 64
export const MAP_H = 64
export const SIDEBAR_W = 220
export const MINIMAP_SIZE = 180

export const TERRAIN = { GROUND: 0, WATER: 1, CLIFF: 2 } as const

export interface UnitDef {
  id: string
  name: string
  faction: string
  cost: number
  hp: number
  speed: number
  damage: number
  attackRange: number
  attackCooldown: number
  buildTime: number
  payloadCapacity: number
  isHarvester: boolean
}

export interface BuildingDef {
  id: string
  name: string
  cost: number
  hp: number
  width: number
  height: number
  powerProvided: number
  powerDrain: number
  buildTime: number
  producesUnits: boolean
  producesVehicles: boolean
  isRefinery: boolean
  isTurret: boolean
  turretRange?: number
  turretDamage?: number
  turretCooldown?: number
}

export const UNIT_DEFS: Record<string, UnitDef> = {
  rifleman: {
    id: 'rifleman', name: 'Rifleman', faction: 'allied',
    cost: 100, hp: 60, speed: 0.12, damage: 12,
    attackRange: 3, attackCooldown: 500, buildTime: 3000,
    payloadCapacity: 0, isHarvester: false,
  },
  light_tank: {
    id: 'light_tank', name: 'Light Tank', faction: 'allied',
    cost: 400, hp: 180, speed: 0.10, damage: 30,
    attackRange: 4, attackCooldown: 800, buildTime: 6000,
    payloadCapacity: 0, isHarvester: false,
  },
  heavy_grenadier: {
    id: 'heavy_grenadier', name: 'Heavy Grenadier', faction: 'soviet',
    cost: 150, hp: 100, speed: 0.09, damage: 25,
    attackRange: 3.5, attackCooldown: 1000, buildTime: 4000,
    payloadCapacity: 0, isHarvester: false,
  },
  heavy_tank: {
    id: 'heavy_tank', name: 'Heavy Tank', faction: 'soviet',
    cost: 600, hp: 350, speed: 0.07, damage: 50,
    attackRange: 4.5, attackCooldown: 1200, buildTime: 8000,
    payloadCapacity: 0, isHarvester: false,
  },
  harvester: {
    id: 'harvester', name: 'Harvester', faction: 'shared',
    cost: 1000, hp: 250, speed: 0.08, damage: 0,
    attackRange: 0, attackCooldown: 0, buildTime: 8000,
    payloadCapacity: 50, isHarvester: true,
  },
}

export const BUILDING_DEFS: Record<string, BuildingDef> = {
  construction_yard: {
    id: 'construction_yard', name: 'Construction Yard',
    cost: 2000, hp: 500, width: 3, height: 3,
    powerProvided: 0, powerDrain: 0, buildTime: 0,
    producesUnits: false, producesVehicles: false,
    isRefinery: false, isTurret: false,
  },
  power_plant: {
    id: 'power_plant', name: 'Power Plant',
    cost: 500, hp: 200, width: 2, height: 2,
    powerProvided: 100, powerDrain: 0, buildTime: 5000,
    producesUnits: false, producesVehicles: false,
    isRefinery: false, isTurret: false,
  },
  ore_refinery: {
    id: 'ore_refinery', name: 'Ore Refinery',
    cost: 1500, hp: 400, width: 3, height: 3,
    powerProvided: 0, powerDrain: 10, buildTime: 10000,
    producesUnits: false, producesVehicles: false,
    isRefinery: true, isTurret: false,
  },
  barracks: {
    id: 'barracks', name: 'Barracks',
    cost: 500, hp: 250, width: 2, height: 2,
    powerProvided: 0, powerDrain: 10, buildTime: 6000,
    producesUnits: true, producesVehicles: false,
    isRefinery: false, isTurret: false,
  },
  war_factory: {
    id: 'war_factory', name: 'War Factory',
    cost: 1000, hp: 350, width: 3, height: 3,
    powerProvided: 0, powerDrain: 20, buildTime: 10000,
    producesUnits: false, producesVehicles: true,
    isRefinery: false, isTurret: false,
  },
  turret: {
    id: 'turret', name: 'Turret',
    cost: 400, hp: 300, width: 1, height: 1,
    powerProvided: 0, powerDrain: 25, buildTime: 6000,
    producesUnits: false, producesVehicles: false,
    isRefinery: false, isTurret: true,
    turretRange: 5, turretDamage: 20, turretCooldown: 600,
  },
}

export const FACTION_UNITS: Record<string, string[]> = {
  allied: ['rifleman', 'light_tank'],
  soviet: ['heavy_grenadier', 'heavy_tank'],
}

export const HARVESTER_PAYLOAD_CREDITS = 1
export const ORE_MAX_PER_TILE = 150
export const ORE_REGROW_RATE = 0.3
export const ORE_SPREAD_CHANCE = 0.001
export const ORE_SPREAD_THRESHOLD = 100

export const PLAYER_START_CREDITS = 3000
export const ENEMY_START_CREDITS = 5000
export const HARVEST_AMOUNT_PER_TICK = 2
