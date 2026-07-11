export interface BuildingDef {
  type: string
  name: string
  label: string
  count: number
  capacityPerLevel?: number[]
  workerSlotsPerLevel?: number[]
  productionPerWorker?: number[]
  happinessPerLevel?: number[]
  soldierCapacityPerLevel?: number[]
  prestigePerLevel?: number[]
  upgradeCosts: number[]
  color: number
  roofColor: number
  desc: string
}

export interface BuildingLayoutEntry {
  type: string
  x: number
  y: number
}

export const MAP_W = 720
export const MAP_H = 660
export const PANEL_H = 300
export const TOTAL_H = MAP_H + PANEL_H

export const DAY_LENGTH = 180

export const BUILDING_DEFS: BuildingDef[] = [
  {
    type: 'home', name: 'Homes', label: 'Home', count: 3,
    capacityPerLevel: [0, 5, 10, 20],
    upgradeCosts: [0, 50, 120],
    color: 0xCC8833, roofColor: 0xAA6633,
    desc: 'Houses population',
  },
  {
    type: 'farm', name: 'Farms', label: 'Farm', count: 2,
    workerSlotsPerLevel: [0, 2, 4, 6],
    productionPerWorker: [0, 3, 6, 12],
    upgradeCosts: [0, 40, 100],
    color: 0xDDB520, roofColor: 0xBB9930,
    desc: 'Produces food',
  },
  {
    type: 'mine', name: 'Mines', label: 'Mine', count: 2,
    workerSlotsPerLevel: [0, 2, 4, 6],
    productionPerWorker: [0, 3, 6, 12],
    upgradeCosts: [0, 40, 100],
    color: 0x888888, roofColor: 0x666666,
    desc: 'Produces gold',
  },
  {
    type: 'garden', name: 'Gardens', label: 'Garden', count: 2,
    happinessPerLevel: [0, 5, 10, 15],
    upgradeCosts: [0, 30, 80],
    color: 0x44AA44, roofColor: 0x33AA33,
    desc: 'Boosts happiness',
  },
  {
    type: 'barracks', name: 'Barracks', label: 'Barracks', count: 1,
    soldierCapacityPerLevel: [0, 5, 10, 20],
    upgradeCosts: [0, 60, 150],
    color: 0xCC4444, roofColor: 0xAA3333,
    desc: 'Trains and houses soldiers',
  },
  {
    type: 'castle', name: 'Castle', label: 'Castle', count: 1,
    prestigePerLevel: [0, 3, 6, 10],
    upgradeCosts: [0, 100, 250],
    color: 0x8B5E3C, roofColor: 0x6B3E1C,
    desc: 'Center of your domain',
  },
]

export const BUILDING_LAYOUT: BuildingLayoutEntry[] = [
  { type: 'home', x: 180, y: 195 },
  { type: 'home', x: 360, y: 150 },
  { type: 'home', x: 540, y: 195 },
  { type: 'farm', x: 112, y: 510 },
  { type: 'farm', x: 608, y: 510 },
  { type: 'mine', x: 112, y: 120 },
  { type: 'mine', x: 608, y: 120 },
  { type: 'garden', x: 225, y: 375 },
  { type: 'garden', x: 495, y: 375 },
  { type: 'barracks', x: 360, y: 570 },
  { type: 'castle', x: 360, y: 308 },
]

export const STARTING_POPULATION = 10
export const STARTING_FOOD = 30
export const STARTING_GOLD = 50
export const STARTING_TAX_RATE = 10

export const RECRUIT_GOLD_COST = 20
export const DISMISS_GOLD_COST = 0

export const FOOD_CONSUMPTION_RATES = [0.5, 1.0, 1.5]
export const HAPPINESS_RATION_BONUSES = [-10, 0, 10]

export const BUILDING_W = 56
export const BUILDING_H = 56
