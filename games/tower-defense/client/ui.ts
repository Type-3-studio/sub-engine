import { Container, Graphics, Text } from 'pixi.js'
import { TOWERS, TILE_SIZE, MAP_COLS, MAP_ROWS } from '../game/config/towerDefense.js'
import type { TdComponents } from '../game/contract.js'

const HUD_H = 50
const MENU_H = 80
const APP_W = MAP_COLS * TILE_SIZE
const MAP_H = MAP_ROWS * TILE_SIZE

interface GameHandle {
  selectTower: (tw: (typeof TOWERS)[number]) => void
  clearSelection: () => void
  startWave: () => void
  getState: () => TdComponents['GameState'] | null
  setUI: (ui: { update: (state: TdComponents['GameState'] | null) => void }) => void
}

export function createUI(container: Container, game: GameHandle, gameW: number, gameH: number) {
  const c = new Container()
  container.addChild(c)
  let currentState: TdComponents['GameState'] | null = null
  let selectedId: string | null = null

  function update(state: TdComponents['GameState'] | null): void {
    currentState = state
    c.removeChildren()
    drawHUD()
    drawMenu()
  }

  function drawHUD(): void {
    const bg = new Graphics()
    bg.rect(0, 0, APP_W, HUD_H)
    bg.fill(0x1a1a2e)
    c.addChild(bg)

    const lives = new Text({
      text: `♥ ${currentState?.lives ?? 0}`,
      style: { fill: 0xff4444, fontSize: 18, fontFamily: 'monospace', fontWeight: 'bold' },
    })
    lives.x = 16; lives.y = 14
    c.addChild(lives)

    const money = new Text({
      text: `💰 ${currentState?.money ?? 0}`,
      style: { fill: 0xffdd44, fontSize: 18, fontFamily: 'monospace', fontWeight: 'bold' },
    })
    money.x = 140; money.y = 14
    c.addChild(money)

    const wave = new Text({
      text: `Wave ${(currentState?.wave ?? 0) + 1}`,
      style: { fill: 0xcccccc, fontSize: 18, fontFamily: 'monospace', fontWeight: 'bold' },
    })
    wave.x = APP_W - 220; wave.y = 14
    c.addChild(wave)

    const isBuilding = currentState?.phase === 'building'
    const isComplete = currentState ? currentState.wave >= 5 : false
    const btn = new Graphics()
    btn.rect(APP_W - 110, 8, 100, 34)
    btn.fill(isComplete ? 0x444444 : isBuilding ? 0x44aa44 : 0x555555)
    btn.eventMode = 'static'
    btn.cursor = isBuilding && !isComplete ? 'pointer' : 'default'
    c.addChild(btn)

    const bt = new Text({
      text: isComplete ? 'Done!' : isBuilding ? 'Start Wave' : 'Incoming...',
      style: { fill: 0xffffff, fontSize: 13, fontFamily: 'monospace', fontWeight: 'bold' },
    })
    bt.x = APP_W - 105; bt.y = 15
    c.addChild(bt)

    if (isBuilding && !isComplete) {
      btn.on('pointerdown', () => game.startWave())
    }
  }

  function drawMenu(): void {
    const bg = new Graphics()
    bg.rect(0, HUD_H + MAP_H, APP_W, MENU_H)
    bg.fill(0x1a1a2e)
    c.addChild(bg)

    const title = new Text({
      text: 'Build:',
      style: { fill: 0x888888, fontSize: 14, fontFamily: 'monospace' },
    })
    title.x = 10
    title.y = HUD_H + MAP_H + 10
    c.addChild(title)

    TOWERS.forEach((tw, i) => {
      const bx = 80 + i * 140
      const by = HUD_H + MAP_H + 6
      const bw = 130
      const bh = 68
      const canAfford = currentState && currentState.money >= tw.cost
      const isSel = selectedId === tw.id
      const bgColor = isSel ? 0x446688 : canAfford ? 0x2a2a3e : 0x1a1a2a

      const btn = new Graphics()
      btn.rect(bx, by, bw, bh)
      btn.fill(bgColor)
      btn.rect(bx, by, bw, bh)
      btn.stroke({ color: isSel ? 0x88ccff : 0x333355, width: isSel ? 2 : 1 })
      btn.eventMode = 'static'
      btn.cursor = 'pointer'
      c.addChild(btn)

      const icon = new Graphics()
      icon.rect(bx + 8, by + 8, 20, 20)
      icon.fill(canAfford ? tw.color : 0x444444)
      c.addChild(icon)

      const nm = new Text({ text: tw.name, style: { fill: canAfford ? 0xffffff : 0x666666, fontSize: 11, fontFamily: 'monospace' } })
      nm.x = bx + 36; nm.y = by + 8
      c.addChild(nm)

      const cs = new Text({ text: `💰 ${tw.cost}`, style: { fill: canAfford ? 0xffdd44 : 0x666644, fontSize: 11, fontFamily: 'monospace' } })
      cs.x = bx + 36; cs.y = by + 24
      c.addChild(cs)

      const ds = new Text({ text: `⚔${tw.damage} 📡${tw.range}`, style: { fill: 0x888888, fontSize: 10, fontFamily: 'monospace' } })
      ds.x = bx + 36; ds.y = by + 42
      c.addChild(ds)

      btn.on('pointerdown', () => {
        if (!canAfford) return
        if (isSel) {
          selectedId = null
          game.clearSelection()
        } else {
          selectedId = tw.id
          game.selectTower(tw)
        }
        update(currentState)
      })
    })
  }

  return { update }
}
