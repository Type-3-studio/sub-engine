import type { PngSequenceDef } from '@sub-engine/pixi'

export const TILE_SIZE = 64
export const MOVE_SPEED = 3
export const SEQUENCES_PATH = 'sequences'

export type Direction = 'front' | 'back' | 'left' | 'right'
export type AnimType = 'idle' | 'idle_blinking' | 'run' | 'walk' | 'attack' | 'hurt' | 'dying'

const DIR_SEQ: Record<string, string> = {
  front: 'Front',
  back: 'Back',
  left: 'Left',
  right: 'Right',
}

const FRAME_COUNTS: Record<AnimType, number> = {
  idle: 16,
  idle_blinking: 16,
  run: 12,
  walk: 20,
  attack: 10,
  hurt: 10,
  dying: 10,
}

const FRAME_RATES: Record<AnimType, number> = {
  idle: 6,
  idle_blinking: 6,
  run: 12,
  walk: 8,
  attack: 10,
  hurt: 8,
  dying: 6,
}

const LOOP: Record<AnimType, boolean> = {
  idle: true,
  idle_blinking: true,
  run: true,
  walk: true,
  attack: false,
  hurt: false,
  dying: false,
}

const ANIM_SEQ: Record<AnimType, string> = {
  idle: 'Idle',
  idle_blinking: 'Idle Blinking',
  run: 'Running',
  walk: 'Walking',
  attack: 'Attacking',
  hurt: 'Hurt',
  dying: 'Dying',
}

const DIR_ANIMS: Record<Direction, AnimType[]> = {
  front: ['idle', 'idle_blinking', 'run', 'walk', 'attack', 'hurt'],
  back: ['idle', 'run', 'walk', 'attack', 'hurt'],
  left: ['idle', 'idle_blinking', 'run', 'walk', 'attack', 'hurt'],
  right: ['idle', 'idle_blinking', 'run', 'walk', 'attack', 'hurt'],
}

export function animDirName(dir: Direction, anim: AnimType): string {
  return `${DIR_SEQ[dir]} - ${ANIM_SEQ[anim]}`
}

export const ANIM_SEQUENCES: PngSequenceDef[] = []

for (const [dir, anims] of Object.entries(DIR_ANIMS) as [Direction, AnimType[]][]) {
  for (const anim of anims) {
    ANIM_SEQUENCES.push({
      name: `${dir}_${anim}`,
      directory: `${SEQUENCES_PATH}/${animDirName(dir, anim)}`,
      frameCount: FRAME_COUNTS[anim],
      frameRate: FRAME_RATES[anim],
      loop: LOOP[anim],
    })
  }
}

ANIM_SEQUENCES.push({
  name: 'any_dying',
  directory: `${SEQUENCES_PATH}/Dying`,
  frameCount: FRAME_COUNTS.dying,
  frameRate: FRAME_RATES.dying,
  loop: LOOP.dying,
})

export function getAnimName(anim: AnimType, dir: Direction): string {
  return `${dir}_${anim}`
}
