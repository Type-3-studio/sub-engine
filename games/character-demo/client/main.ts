import { Application, Graphics, Text, Container, AnimatedSprite } from 'pixi.js'
import { createRegistry, movementSystem } from '@sub-engine/core'
import { createResponsiveContainer } from '@sub-engine/pixi'
import { createPlaceholderAnimManager } from '@sub-engine/pixi'
import type { PlaceholderSpriteManager } from '@sub-engine/pixi'
import { animationSystem } from '../game/systems/AnimationSystem.js'
import { SCHEMA } from '../game/contract.js'
import { ANIM_SEQUENCES, TILE_SIZE, MOVE_SPEED, getAnimName } from '../game/config/character.js'
import type { CharacterComponents } from '../game/contract.js'
import type { Direction, AnimType } from '../game/systems/AnimationSystem.js'

const COLS = 20
const ROWS = 15
const GAME_W = COLS * TILE_SIZE
const GAME_H = ROWS * TILE_SIZE

const FRAME_SIZE = 480
const keys: Record<string, boolean> = {}
let attackPressed = false
let interactPressed = false

export async function init(): Promise<void> {
  const app = new Application()
  await app.init({ resizeTo: window, backgroundColor: 0x1a1a2e, antialias: true })
  const appContainer = document.getElementById('app')
  if (!appContainer) throw new Error('#app element not found')
  appContainer.appendChild(app.canvas as HTMLCanvasElement)

  const container = createResponsiveContainer(app, GAME_W, GAME_H)

  const registry = createRegistry<CharacterComponents>()
  const player = registry.createEntity()
  registry.addComponent(player, SCHEMA.POSITION, { x: 5 * TILE_SIZE, y: 7 * TILE_SIZE })
  registry.addComponent(player, SCHEMA.VELOCITY, { x: 0, y: 0 })
  registry.addComponent(player, SCHEMA.LABEL, { value: 'Player' })
  registry.addComponent(player, SCHEMA.ANIM_STATE, {
    anim: 'idle',
    dir: 'front',
    frameRate: 6,
    playing: true,
    loop: true,
  })
  registry.addComponent(player, SCHEMA.INPUT_STATE, {
    up: false,
    down: false,
    left: false,
    right: false,
    attack: false,
    walk: false,
    interact: false,
  })

  const spriteManager: PlaceholderSpriteManager = await createPlaceholderAnimManager(ANIM_SEQUENCES, {
    frameWidth: FRAME_SIZE,
    frameHeight: FRAME_SIZE,
  })

  const bgLayer = new Graphics()
  container.addChild(bgLayer)

  const entityLayer = new Container()
  container.addChild(entityLayer)

  const infoText = new Text({
    text: '',
    style: { fill: 0xcccccc, fontSize: 13, fontFamily: 'monospace' },
  })
  infoText.y = 4
  container.addChild(infoText)

  const controlsText = new Text({
    text: 'WASD/Arrows: Move  Shift: Walk  Space: Attack  E: Interact',
    style: { fill: 0x888888, fontSize: 11, fontFamily: 'monospace' },
  })
  controlsText.y = GAME_H - 16
  container.addChild(controlsText)

  function drawBackground(): void {
    bgLayer.clear()
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const shade = (x + y) % 2 === 0 ? 0x1e1e36 : 0x222244
        bgLayer.fill(shade)
        bgLayer.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        bgLayer.fill()
      }
    }
  }
  drawBackground()

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    keys[e.key] = true
    if (e.key === ' ' || e.key === 'Space') {
      e.preventDefault()
      attackPressed = true
    }
    if (e.key === 'e' || e.key === 'E') {
      interactPressed = true
    }
  })

  window.addEventListener('keyup', (e: KeyboardEvent) => {
    keys[e.key] = false
  })

  function updateInput(): void {
    const input = registry.getComponent(player, SCHEMA.INPUT_STATE)
    if (!input) return

    const walk = !!keys['Shift']
    registry.addComponent(player, SCHEMA.INPUT_STATE, {
      up: !!keys['ArrowUp'] || !!keys['w'] || !!keys['W'],
      down: !!keys['ArrowDown'] || !!keys['s'] || !!keys['S'],
      left: !!keys['ArrowLeft'] || !!keys['a'] || !!keys['A'],
      right: !!keys['ArrowRight'] || !!keys['d'] || !!keys['D'],
      attack: attackPressed,
      walk,
      interact: interactPressed,
    })
    attackPressed = false
    interactPressed = false

    const dx = (keys['ArrowRight'] || keys['d'] || keys['D'] ? 1 : 0)
      - (keys['ArrowLeft'] || keys['a'] || keys['A'] ? 1 : 0)
    const dy = (keys['ArrowDown'] || keys['s'] || keys['S'] ? 1 : 0)
      - (keys['ArrowUp'] || keys['w'] || keys['W'] ? 1 : 0)
    const speed = MOVE_SPEED * (walk ? 0.4 : 1)

    registry.addComponent(player, SCHEMA.VELOCITY, {
      x: dx * speed,
      y: dy * speed,
    })
  }

  let playerSprite: AnimatedSprite | null = null
  let currentAnimName: string | null = null

  function setupSprite(sprite: AnimatedSprite): void {
    const scale = TILE_SIZE / FRAME_SIZE
    sprite.scale.set(scale * 2)
    sprite.anchor.set(0.5, 1)
    sprite.onComplete = () => {
      const a = registry.getComponent(player, SCHEMA.ANIM_STATE)
      if (a) {
        registry.addComponent(player, SCHEMA.ANIM_STATE, { ...a, playing: false })
      }
    }
  }

  function syncSprite(): void {
    const pos = registry.getComponent(player, SCHEMA.POSITION)
    const anim = registry.getComponent(player, SCHEMA.ANIM_STATE)
    if (!pos || !anim) return

    const animName = getAnimName(anim.anim as AnimType, anim.dir as Direction)

    if (!playerSprite) {
      playerSprite = spriteManager.createSprite(animName)
      setupSprite(playerSprite)
      entityLayer.addChild(playerSprite)
      currentAnimName = animName
    } else if (animName !== currentAnimName) {
      const textures = spriteManager.textures.get(animName)
      const def = spriteManager.anims.get(animName)
      if (textures && def) {
        playerSprite.textures = textures
        playerSprite.animationSpeed = def.frameRate / 60
        playerSprite.loop = def.loop
        playerSprite.play()
      }
      currentAnimName = animName
    }

    playerSprite.x = pos.x
    playerSprite.y = pos.y
  }

  function render(): void {
    const anim = registry.getComponent(player, SCHEMA.ANIM_STATE)
    if (!anim) return
    infoText.text = `Anim: ${anim.anim}  Dir: ${anim.dir}  Pos: ${Math.round(playerSprite?.x ?? 0)},${Math.round(playerSprite?.y ?? 0)}`
  }

  function gameLoop(): void {
    updateInput()
    animationSystem(registry)
    movementSystem(registry, 16)
    syncSprite()
    render()
    requestAnimationFrame(gameLoop)
  }

  requestAnimationFrame(gameLoop)
}
