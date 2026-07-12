import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import { BomberGame } from '../game/game.js'
import { SCHEMA } from '../game/contract.js'
import {
  MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, HUD_HEIGHT,
  TileType, COLORS, EXPLOSION_DURATION,
} from '../game/config.js'

export class Renderer {
  private gameLayer = new Container()
  private hudLayer = new Container()
  private overlayLayer = new Container()
  private tileGfx = new Graphics()
  private entityGfx = new Graphics()
  private hudGfx = new Graphics()
  private overlayGfx = new Graphics()

  private stageText: Text
  private infoText: Text
  private overlayText: Text
  private canvasW: number
  private canvasH: number

  constructor(parent: Container, canvasW: number, canvasH: number) {
    this.canvasW = canvasW
    this.canvasH = canvasH

    parent.addChild(this.gameLayer)
    parent.addChild(this.hudLayer)
    parent.addChild(this.overlayLayer)

    this.gameLayer.addChild(this.tileGfx)
    this.gameLayer.addChild(this.entityGfx)
    this.hudLayer.addChild(this.hudGfx)
    this.overlayLayer.addChild(this.overlayGfx)

    const style = new TextStyle({ fontFamily: 'monospace', fontSize: 16, fill: 0xffffff })
    const bigStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 32, fill: 0xffffff, fontWeight: 'bold' })

    this.stageText = new Text({ text: '', style })
    this.stageText.x = 8
    this.stageText.y = 8
    this.hudLayer.addChild(this.stageText)

    this.infoText = new Text({ text: '', style })
    this.infoText.x = canvasW - 8
    this.infoText.y = 8
    this.infoText.anchor.set(1, 0)
    this.hudLayer.addChild(this.infoText)

    this.overlayText = new Text({ text: '', style: bigStyle })
    this.overlayText.anchor.set(0.5)
    this.overlayText.x = canvasW / 2
    this.overlayText.y = canvasH / 2
    this.overlayLayer.addChild(this.overlayText)
  }

  render(game: BomberGame): void {
    this.entityGfx.clear()

    this.drawTiles(game)
    this.drawEntities(game)
    this.drawHUD(game)

    if (game.phase === 'won') {
      this.overlayText.text = `Stage ${game.stage} Complete!\nPress Enter`
      this.overlayText.visible = true
    } else if (game.phase === 'gameover') {
      this.overlayText.text = 'GAME OVER\nPress R to Restart'
      this.overlayText.style.fill = COLORS.gameOver
      this.overlayText.visible = true
    } else {
      this.overlayText.visible = false
    }
  }

  private drawTiles(game: BomberGame): void {
    this.tileGfx.clear()

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const px = x * TILE_SIZE
        const py = y * TILE_SIZE + HUD_HEIGHT
        const tile = game.map[y]![x]

        switch (tile) {
          case TileType.FLOOR:
          case TileType.DOOR:
            this.tileGfx.rect(px, py, TILE_SIZE, TILE_SIZE)
            this.tileGfx.fill({ color: COLORS.floor })
            break
          case TileType.CONCRETE:
            this.tileGfx.rect(px, py, TILE_SIZE, TILE_SIZE)
            this.tileGfx.fill({ color: COLORS.concrete })
            this.tileGfx.rect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4)
            this.tileGfx.fill({ color: COLORS.concreteBorder })
            break
          case TileType.BRICK:
            this.tileGfx.rect(px, py, TILE_SIZE, TILE_SIZE)
            this.tileGfx.fill({ color: COLORS.brick })
            this.tileGfx.rect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4)
            this.tileGfx.fill({ color: COLORS.brickBorder })
            break
        }
      }
    }
  }

  private drawEntities(game: BomberGame): void {
    const px = (gp: { x: number; y: number }) => gp.x * TILE_SIZE
    const py = (gp: { x: number; y: number }) => gp.y * TILE_SIZE + HUD_HEIGHT
    const half = TILE_SIZE / 2

    const door = game.registry.getComponent(game.doorId, SCHEMA.DOOR)
    const doorGp = game.registry.getComponent(game.doorId, SCHEMA.GRID_POSITION)
    if (door && door.open && doorGp) {
      const dx = px(doorGp) + 4
      const dy = py(doorGp) + 4
      this.entityGfx.rect(dx, dy, TILE_SIZE - 8, TILE_SIZE - 8)
      this.entityGfx.fill({ color: COLORS.door })
      this.entityGfx.rect(dx + 2, dy + 2, TILE_SIZE - 12, TILE_SIZE - 12)
      this.entityGfx.fill({ color: COLORS.doorGlow })
    }

    const powerups = game.registry.getEntitiesWith([SCHEMA.GRID_POSITION, SCHEMA.POWERUP])
    for (const p of powerups) {
      const color = p.Powerup.type === 'bombUp' ? COLORS.powerupBomb
        : p.Powerup.type === 'fireUp' ? COLORS.powerupFire
        : COLORS.powerupSpeed
      const cx = px(p.GridPosition) + half
      const cy = py(p.GridPosition) + half
      this.entityGfx.circle(cx, cy, 6)
      this.entityGfx.fill({ color })
    }

    const bombs = game.registry.getEntitiesWith([SCHEMA.GRID_POSITION, SCHEMA.BOMB])
    for (const b of bombs) {
      const cx = px(b.GridPosition) + half
      const cy = py(b.GridPosition) + half
      const r = TILE_SIZE * 0.35
      this.entityGfx.circle(cx, cy, r)
      this.entityGfx.fill({ color: COLORS.bomb })
      const fuseProgress = b.Bomb.timer / 2500
      const flash = fuseProgress < 0.3 ? (Math.sin(Date.now() * 0.02) > 0 ? 1 : 0) : 0
      if (flash) {
        this.entityGfx.circle(cx, cy, r * 0.6)
        this.entityGfx.fill({ color: COLORS.bombFuse })
      }
    }

    const explosions = game.registry.getEntitiesWith([SCHEMA.GRID_POSITION, SCHEMA.EXPLOSION])
    for (const e of explosions) {
      const ex = px(e.GridPosition)
      const ey = py(e.GridPosition)
      const fade = e.Explosion.timer / EXPLOSION_DURATION
      const inner = fade > 0.5 ? COLORS.explosionInner : COLORS.explosionOuter
      this.entityGfx.rect(ex + 4, ey + 4, TILE_SIZE - 8, TILE_SIZE - 8)
      this.entityGfx.fill({ color: inner, alpha: fade })
      this.entityGfx.rect(ex, ey, TILE_SIZE, TILE_SIZE)
      this.entityGfx.fill({ color: COLORS.explosionOuter, alpha: fade * 0.4 })
    }

    const playerComp = game.registry.getComponent(game.playerId, SCHEMA.PLAYER)
    const playerGp = game.registry.getComponent(game.playerId, SCHEMA.GRID_POSITION)
    if (playerComp && playerComp.alive && playerGp) {
      const px2 = px(playerGp) + 4
      const py2 = py(playerGp) + 4
      const alpha = playerComp.invulnTimer > 0 ? (Math.sin(Date.now() * 0.01) > 0 ? 0.5 : 1) : 1
      this.entityGfx.rect(px2, py2, TILE_SIZE - 8, TILE_SIZE - 8)
      this.entityGfx.fill({ color: COLORS.player, alpha })
      this.entityGfx.rect(px2 + 2, py2 + 2, TILE_SIZE - 12, TILE_SIZE - 12)
      this.entityGfx.fill({ color: COLORS.playerOutline, alpha })
    }

    const enemies = game.registry.getEntitiesWith([SCHEMA.GRID_POSITION, SCHEMA.ENEMY])
    for (const e of enemies) {
      if (!e.Enemy.alive) continue
      const ex = px(e.GridPosition) + 4
      const ey = py(e.GridPosition) + 4
      this.entityGfx.rect(ex, ey, TILE_SIZE - 8, TILE_SIZE - 8)
      this.entityGfx.fill({ color: COLORS.enemy })
      this.entityGfx.rect(ex + 2, ey + 2, TILE_SIZE - 12, TILE_SIZE - 12)
      this.entityGfx.fill({ color: COLORS.enemyOutline })
    }
  }

  private drawHUD(game: BomberGame): void {
    this.hudGfx.clear()
    this.hudGfx.rect(0, 0, this.canvasW, HUD_HEIGHT)
    this.hudGfx.fill({ color: COLORS.hudBg })

    const playerComp = game.registry.getComponent(game.playerId, SCHEMA.PLAYER)
    const lives = playerComp?.lives ?? 0
    const bombs = playerComp?.bombCount ?? 0
    const radius = playerComp?.bombRadius ?? 0

    this.stageText.text = `Stage ${game.stage}`
    this.infoText.text = `♥${lives}  💣${bombs}  🔥${radius}  Score:${game.score}`
  }

  destroy(): void {
    for (const child of this.gameLayer.removeChildren()) child.destroy()
    for (const child of this.hudLayer.removeChildren()) child.destroy()
    for (const child of this.overlayLayer.removeChildren()) child.destroy()
  }
}
