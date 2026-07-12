export const TILE_SIZE = 48
export const MAP_WIDTH = 15
export const MAP_HEIGHT = 13
export const HUD_HEIGHT = 40

export const TICK_RATE = 62.5

export const PLAYER_DEFAULT_BOMBS = 1
export const PLAYER_DEFAULT_RADIUS = 2
export const PLAYER_DEFAULT_MOVE_INTERVAL = 250
export const PLAYER_DEFAULT_LIVES = 3
export const PLAYER_INVULN_DURATION = 2000

export const BOMB_FUSE_DURATION = 2500
export const BOMB_COOLDOWN = 300
export const EXPLOSION_DURATION = 400
export const EXPLOSION_DAMAGE = 1

export const ENEMY_MOVE_INTERVAL = 150
export const ENEMY_DIR_CHANGE_INTERVAL = 1500

export const POWERUP_CHANCE = 0.2

export const STAGE_ENEMY_BASE = 3
export const STAGE_ENEMY_PER_STAGE = 2

export enum TileType {
  FLOOR = 0,
  CONCRETE = 1,
  BRICK = 2,
  DOOR = 3,
}

export const COLORS = {
  floor: 0x2d5a27,
  concrete: 0x888888,
  concreteBorder: 0x666666,
  brick: 0x8b4513,
  brickBorder: 0x6b3410,
  player: 0x4488ff,
  playerOutline: 0x2266dd,
  bomb: 0x333333,
  bombFuse: 0xff6600,
  explosionInner: 0xffffff,
  explosionOuter: 0xff8800,
  explosionFade: 0xff4400,
  enemy: 0xff4444,
  enemyOutline: 0xcc2222,
  powerupBomb: 0xff44ff,
  powerupFire: 0xff8800,
  powerupSpeed: 0x44ff44,
  door: 0x44dd44,
  doorGlow: 0x88ff88,
  hudBg: 0x1a1a2e,
  hudText: 0xffffff,
  gameOver: 0xff0000,
}
