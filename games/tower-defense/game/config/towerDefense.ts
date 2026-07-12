export interface TowerDef {
  id: string
  name: string
  cost: number
  damage: number
  range: number
  fireRate: number
  color: number
  projectileSpeed: number
  projectileColor: number
  hp: number
}

export interface WaveDef {
  count: number
  enemySpeed: number
  enemyHealth: number
  spawnInterval: number
  reward: number
  hasBomber?: boolean
}

export interface Waypoint {
  x: number
  y: number
}

export const TILE_SIZE = 64

export const TOWERS: TowerDef[] = [
  {
    id: 'arrow',
    name: 'Arrow Tower',
    cost: 50,
    damage: 15,
    range: 3.5,
    fireRate: 800,
    color: 0x44aaff,
    projectileSpeed: 5,
    projectileColor: 0x88ccff,
    hp: 30,
  },
  {
    id: 'cannon',
    name: 'Cannon Tower',
    cost: 100,
    damage: 40,
    range: 2.5,
    fireRate: 1500,
    color: 0xff8844,
    projectileSpeed: 3,
    projectileColor: 0xffaa44,
    hp: 50,
  },
  {
    id: 'magic',
    name: 'Magic Tower',
    cost: 150,
    damage: 25,
    range: 4.5,
    fireRate: 1000,
    color: 0xcc44ff,
    projectileSpeed: 4,
    projectileColor: 0xdd88ff,
    hp: 40,
  },
  {
    id: 'bomb',
    name: 'Bomb Trap',
    cost: 75,
    damage: 80,
    range: 1.5,
    fireRate: 0,
    color: 0xff4444,
    projectileSpeed: 0,
    projectileColor: 0xff4444,
    hp: 20,
  },
]

export const BOMBER_CONFIG = {
  bombInterval: 3000,
  bombDamage: 40,
  bombRange: 1,
  bombFuse: 2500,
}

export const WAVES: WaveDef[] = [
  { count: 3, enemySpeed: 1.2, enemyHealth: 30, spawnInterval: 1500, reward: 20 },
  { count: 5, enemySpeed: 1.4, enemyHealth: 35, spawnInterval: 1300, reward: 25 },
  { count: 7, enemySpeed: 1.5, enemyHealth: 45, spawnInterval: 1200, reward: 30, hasBomber: true },
  { count: 8, enemySpeed: 1.6, enemyHealth: 55, spawnInterval: 1100, reward: 35, hasBomber: true },
  { count: 10, enemySpeed: 1.8, enemyHealth: 65, spawnInterval: 1000, reward: 40, hasBomber: true },
]

export const WAYPOINTS: Waypoint[] = [
  { x: 0, y: 4 },
  { x: 3, y: 4 },
  { x: 3, y: 2 },
  { x: 6, y: 2 },
  { x: 6, y: 4 },
  { x: 9, y: 4 },
]

export const MAP_COLS = 10
export const MAP_ROWS = 8

export const STARTING_MONEY = 100
export const STARTING_LIVES = 20
