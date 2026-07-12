import { createRegistry, createGameLoop } from '@sub-engine/core'
import type { Registry } from '@sub-engine/core'
import { DebugOverlay } from '@sub-engine/pixi'
import type { Container, Application } from 'pixi.js'
import { Graphics, Text, TextStyle } from 'pixi.js'
import { SCHEMA, TILE_SIZE, tileCenter } from '../game/contract.js'
import type { PacComponents } from '../game/contract.js'
import { pacmanSystem, setInputDirection, getInputDirection } from '../game/systems/PacManSystem.js'
import { ghostSystem } from '../game/systems/GhostSystem.js'
import { pelletSystem } from '../game/systems/PelletSystem.js'
import { gameStateSystem } from '../game/systems/GameStateSystem.js'
import { MAZE_TEMPLATE, MAZE_COLS, MAZE_ROWS } from '../game/config/maze.js'
import { loadSprites } from '../game/config/assets.js'
import type { PlaceholderSpriteManager } from '@sub-engine/pixi'
import { AnimatedSprite, Container as PixiContainer } from 'pixi.js'

export interface GameHandle {
  getSnapshot: () => any[]
  togglePause: () => void
}

export async function createGameScene(
  container: Container,
  app: Application,
  gameW: number,
  gameH: number,
): Promise<GameHandle> {
  const mazeGfx = new Graphics()
  const pelletGfx = new Graphics()
  container.addChild(mazeGfx)
  container.addChild(pelletGfx)

  const entityLayer = new PixiContainer()
  container.addChild(entityLayer)

  const scoreText = new Text({
    text: 'SCORE: 0',
    style: new TextStyle({ fill: '#ffffff', fontFamily: 'monospace', fontSize: 16 }),
  })
  scoreText.x = 8
  scoreText.y = 5

  const livesText = new Text({
    text: 'LIVES: 3',
    style: new TextStyle({ fill: '#ffffff', fontFamily: 'monospace', fontSize: 16 }),
  })
  livesText.x = gameW - 130
  livesText.y = 5

  const msgText = new Text({
    text: '',
    style: new TextStyle({ fill: '#ffff00', fontFamily: 'monospace', fontSize: 24, fontWeight: 'bold' }),
  })
  msgText.anchor.set(0.5)
  msgText.x = gameW / 2
  msgText.y = gameH / 2 - 20

  const uiBg = new Graphics()
  container.addChild(uiBg)
  container.addChild(scoreText)
  container.addChild(livesText)
  container.addChild(msgText)

  const sprites = await loadSprites()

  const registry = createRegistry<PacComponents>()
  let paused = false

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (paused) return
    const key = e.key.toLowerCase()
    if (key === 'arrowup' || key === 'w') { setInputDirection('up'); e.preventDefault() }
    if (key === 'arrowdown' || key === 's') { setInputDirection('down'); e.preventDefault() }
    if (key === 'arrowleft' || key === 'a') { setInputDirection('left'); e.preventDefault() }
    if (key === 'arrowright' || key === 'd') { setInputDirection('right'); e.preventDefault() }
  })

  initLevel(registry)

  function step(): void {
    if (paused) return

    const pacEnts = registry.getEntitiesWith([SCHEMA.PACMAN, SCHEMA.DIRECTION])
    if (pacEnts.length > 0) {
      const dir = pacEnts[0]!.Direction
      const keyDir = getInputDirection()
      if (keyDir && keyDir !== dir.current) {
        dir.next = keyDir
        registry.addComponent(pacEnts[0]!.id, SCHEMA.DIRECTION, { ...dir })
      }
    }

    pacmanSystem(registry, 16)
    ghostSystem(registry, 16)
    pelletSystem(registry, 16)
    gameStateSystem(registry, 16)
  }

  let pacSprite: AnimatedSprite | null = null
  const ghostSprites: AnimatedSprite[] = []

  function frame(_alpha: number): void {
    if (!sprites) return

    mazeGfx.clear()
    drawMaze(mazeGfx)

    pelletGfx.clear()
    drawPellets(pelletGfx, registry)

    const ghosts = registry.getEntitiesWith([SCHEMA.GHOST, SCHEMA.POSITION])
    let ghostIdx = 0
    for (const g of ghosts) {
      if (ghostIdx >= ghostSprites.length) {
        const animName = getGhostAnimName(g.Ghost)
        const s = sprites.createSprite(animName)
        s.anchor.set(0.5)
        entityLayer.addChild(s)
        ghostSprites.push(s)
      }
      const sprite = ghostSprites[ghostIdx]!
      sprite.x = g.Position.x
      sprite.y = g.Position.y
      const expectedAnim = getGhostAnimName(g.Ghost)
      if (sprite.textures !== sprites.textures.get(expectedAnim)) {
        sprite.textures = sprites.textures.get(expectedAnim) ?? sprite.textures
        sprite.play()
      }
      ghostIdx++
    }
    while (ghostSprites.length > ghostIdx) {
      const s = ghostSprites.pop()!
      entityLayer.removeChild(s)
      s.destroy()
    }

    const pacs = registry.getEntitiesWith([SCHEMA.PACMAN, SCHEMA.POSITION, SCHEMA.DIRECTION])
    if (pacs.length > 0) {
      if (!pacSprite) {
        pacSprite = sprites.createSprite('pacman_right')
        pacSprite.anchor.set(0.5)
        entityLayer.addChild(pacSprite)
      }
      pacSprite.x = pacs[0]!.Position.x
      pacSprite.y = pacs[0]!.Position.y
    } else if (pacSprite) {
      entityLayer.removeChild(pacSprite)
      pacSprite.destroy()
      pacSprite = null
    }

    const stateEnts = registry.getEntitiesWith([SCHEMA.GAME_STATE])
    if (stateEnts.length > 0) {
      const s = stateEnts[0]!.GameState
      scoreText.text = `SCORE: ${s.score}`
      livesText.text = `LIVES: ${s.lives}`

      const displayMsg = s.message || (s.phase === 'gameover' ? 'GAME OVER' : s.phase === 'win' ? 'YOU WIN!' : '')
      msgText.text = displayMsg
      msgText.alpha = s.messageTimer > 0 ? Math.min(1, s.messageTimer / 500) : (displayMsg ? 1 : 0)
    }

    uiBg.clear()
    uiBg.fill({ color: 0x000000 })
    uiBg.rect(0, 0, gameW, 24)
    uiBg.fill()
  }

  const loop = createGameLoop({ onStep: step, onFrame: frame })

  const debug = new DebugOverlay(app, () => {
    return registry.getAllEntitiesCopy().map((e: any) => ({
      id: e.id,
      components: Object.fromEntries(Object.entries(e).filter(([k]) => k !== 'id')),
    }))
  }, () => { paused = !paused; if (paused) loop.pause(); else loop.resume() })
  app.ticker.add(() => debug.update())

  loop.start()

  return {
    getSnapshot: () => [],
    togglePause: () => { paused = !paused; if (paused) loop.pause(); else loop.resume() },
  }
}

function getGhostAnimName(g: PacComponents['Ghost']): string {
  if (g.state === 'eaten') return 'ghost_eyes'
  if (g.frightenedTimer > 0 || g.state === 'frightened') {
    return g.frightenedTimer < 2000 ? 'ghost_frightened_end' : 'ghost_frightened'
  }
  const colorMap: Record<string, string> = { blinky: 'red', pink: 'pink', cyan: 'cyan', orange: 'orange' }
  return `ghost_${colorMap[g.type] ?? 'red'}`
}

function initLevel(registry: Registry<PacComponents>): void {
  const stateId = registry.createEntity()
  registry.addComponent(stateId, SCHEMA.GAME_STATE, {
    score: 0, lives: 3, level: 1, phase: 'playing',
    dotsEaten: 0, totalDots: 0, ghostModeTimer: 7000,
    ghostMode: 'scatter', combo: 0, message: '', messageTimer: 0,
  })

  const pacId = registry.createEntity()
  const pacStart = tileCenter(10, 14)
  registry.addComponent(pacId, SCHEMA.POSITION, { x: pacStart.x, y: pacStart.y })
  registry.addComponent(pacId, SCHEMA.DIRECTION, { current: 'left', next: '' })
  registry.addComponent(pacId, SCHEMA.PACMAN, {
    speed: 96, score: 0, lives: 3, powerTimer: 0,
    moveTimer: 0, mouthOpen: true, invincible: 1500,
  })

  const ghostDefs = [
    { type: 'blinky', col: 10, row: 9, scX: 20, scY: 0 },
    { type: 'pink', col: 9, row: 10, scX: 0, scY: 0 },
    { type: 'cyan', col: 11, row: 10, scX: 20, scY: 15 },
    { type: 'orange', col: 10, row: 11, scX: 0, scY: 15 },
  ]

  for (const gd of ghostDefs) {
    const gId = registry.createEntity()
    const gPos = tileCenter(gd.col, gd.row)
    registry.addComponent(gId, SCHEMA.POSITION, { x: gPos.x, y: gPos.y })
    registry.addComponent(gId, SCHEMA.DIRECTION, { current: 'up', next: '' })
    registry.addComponent(gId, SCHEMA.GHOST, {
      type: gd.type,
      state: gd.type === 'blinky' ? 'chase' : 'home',
      speed: 84, frightenedTimer: 0, moveTimer: 0,
      homeX: gd.col, homeY: gd.row,
      scatterX: gd.scX, scatterY: gd.scY,
      released: gd.type === 'blinky',
    })
  }

  for (let row = 0; row < MAZE_ROWS; row++) {
    for (let col = 0; col < MAZE_COLS; col++) {
      const tile = MAZE_TEMPLATE[row]![col]!
      if (tile === 2 || tile === 3) {
        const pId = registry.createEntity()
        const center = tileCenter(col, row)
        registry.addComponent(pId, SCHEMA.POSITION, { x: center.x, y: center.y })
        registry.addComponent(pId, SCHEMA.PELLET, {
          value: tile === 3 ? 50 : 10,
          isPowerUp: tile === 3,
        })
      }
    }
  }
}

function drawMaze(gfx: Graphics): void {
  for (let row = 0; row < MAZE_ROWS; row++) {
    for (let col = 0; col < MAZE_COLS; col++) {
      const tile = MAZE_TEMPLATE[row]![col]!
      const x = col * TILE_SIZE
      const y = row * TILE_SIZE

      if (tile === 1) {
        gfx.fill({ color: 0x2121de })
        gfx.rect(x, y, TILE_SIZE, TILE_SIZE)
        gfx.fill()
        gfx.setStrokeStyle({ width: 1, color: 0x1111aa })
        gfx.rect(x, y, TILE_SIZE, TILE_SIZE)
        gfx.stroke()
      } else if (tile === 4) {
        gfx.fill({ color: 0x111111 })
        gfx.rect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4)
        gfx.fill()
      } else if (tile === 5) {
        gfx.fill({ color: 0xff88cc })
        gfx.rect(x, y + TILE_SIZE / 2 - 2, TILE_SIZE, 4)
        gfx.fill()
      }
    }
  }
}

function drawPellets(gfx: Graphics, registry: Registry<PacComponents>): void {
  const pellets = registry.getEntitiesWith([SCHEMA.PELLET, SCHEMA.POSITION])
  for (const pellet of pellets) {
    const isPower = pellet.Pellet.isPowerUp
    const r = isPower ? 6 : 2.5
    gfx.fill({ color: isPower ? 0xffcc88 : 0xffaaaa })
    gfx.circle(pellet.Position.x, pellet.Position.y, r)
    gfx.fill()
  }
}
