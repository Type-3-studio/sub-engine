import { Container, Graphics, Text, FederatedPointerEvent } from 'pixi.js'
import { MAP_W, MAP_H, PANEL_H, BUILDING_DEFS, RECRUIT_GOLD_COST } from '../game/config/castle.js'
import type { CastleState } from './gameScene.js'

const TAB_H = 36
const CONTENT_Y = MAP_H + TAB_H
const CONTENT_H = PANEL_H - TAB_H

interface GameHandle {
  getState(): CastleState | null
  upgradeType(type: string): boolean
  recruitSoldier(): boolean
  dismissSoldier(): boolean
  changeTaxRate(delta: number): void
  changeRations(level: number): void
  getBuildingLevel(type: string): number
}

export function createUI(container: Container, game: GameHandle, gameW: number, gameH: number) {
  const c = new Container()
  container.addChild(c)

  let currentState: CastleState | null = null
  let activeTab = 0

  function update(state: CastleState | null): void {
    currentState = state
    c.removeChildren()
    drawPanel()
    drawTabs()
    if (activeTab === 0) drawUpgradeTab()
    else if (activeTab === 1) drawHappinessTab()
    else if (activeTab === 2) drawRecruitTab()
  }

  function drawPanel(): void {
    const bg = new Graphics()
    bg.rect(0, MAP_H, MAP_W, TAB_H + CONTENT_H)
    bg.fill(0x111122)
    c.addChild(bg)
    const line = new Graphics()
    line.rect(0, MAP_H, MAP_W, 1)
    line.fill(0x444466)
    c.addChild(line)
  }

  function drawTabs(): void {
    const tabs = ['Upgrade', 'Happiness', 'Recruit']
    const tabW = MAP_W / 3
    for (let i = 0; i < 3; i++) {
      const isActive = i === activeTab
      const btn = new Graphics()
      btn.rect(i * tabW, MAP_H, tabW, TAB_H)
      btn.fill(isActive ? 0x222244 : 0x181830)
      if (isActive) {
        btn.rect(i * tabW, MAP_H, tabW, TAB_H)
        btn.stroke({ color: 0x6666AA, width: 1 })
      }
      c.addChild(btn)

      const t = new Text({
        text: tabs[i]!,
        style: { fill: isActive ? 0xFFFFFF : 0x888888, fontSize: 14, fontFamily: 'monospace', fontWeight: 'bold' },
      })
      t.anchor = { x: 0.5, y: 0.5 }
      t.x = i * tabW + tabW / 2
      t.y = MAP_H + TAB_H / 2
      c.addChild(t)

      btn.eventMode = 'static'
      btn.cursor = 'pointer'
      const idx = i
      btn.on('pointerdown', (e: FederatedPointerEvent) => {
        e.stopPropagation()
        activeTab = idx
        update(currentState)
      })
    }
  }

  function drawUpgradeTab(): void {
    const cols = 2
    const rows = Math.ceil(BUILDING_DEFS.length / cols)
    const cellW = MAP_W / cols
    const cellH = Math.floor(CONTENT_H / rows)

    for (let i = 0; i < BUILDING_DEFS.length; i++) {
      const def = BUILDING_DEFS[i]!
      const col = i % cols
      const row = Math.floor(i / cols)
      const bx = col * cellW
      const by = CONTENT_Y + row * cellH

      if (!currentState) continue

      const level = game.getBuildingLevel(def.type)
      const maxed = level >= 3
      const cost = def.upgradeCosts[level] ?? 0
      const canAfford = currentState.gold >= cost

      const bg = new Graphics()
      bg.rect(bx + 2, by + 2, cellW - 4, cellH - 4)
      bg.fill(0x1a1a33)
      bg.rect(bx + 2, by + 2, cellW - 4, cellH - 4)
      bg.stroke({ color: 0x333355, width: 1 })
      c.addChild(bg)

      const nameText = new Text({
        text: def.name,
        style: { fill: 0xCCCCFF, fontSize: 14, fontFamily: 'monospace', fontWeight: 'bold' },
      })
      nameText.x = bx + 12
      nameText.y = by + 10
      c.addChild(nameText)

      const lvText = new Text({
        text: maxed ? 'MAX' : `Lv ${level}`,
        style: { fill: maxed ? 0x44FF44 : 0xFFDD44, fontSize: 13, fontFamily: 'monospace' },
      })
      lvText.x = bx + 12
      lvText.y = by + 32
      c.addChild(lvText)

      const descText = new Text({
        text: def.desc,
        style: { fill: 0x777788, fontSize: 10, fontFamily: 'monospace' },
      })
      descText.x = bx + 12
      descText.y = by + 54
      c.addChild(descText)

      if (!maxed) {
        const btn = new Graphics()
        btn.rect(bx + cellW - 100, by + 14, 88, 32)
        btn.fill(canAfford ? 0x226622 : 0x333333)
        btn.rect(bx + cellW - 100, by + 14, 88, 32)
        btn.stroke({ color: canAfford ? 0x44AA44 : 0x555555, width: 1 })
        btn.eventMode = 'static'
        btn.cursor = 'pointer'
        c.addChild(btn)

        const btnText = new Text({
          text: `${cost}g`,
          style: { fill: canAfford ? 0xFFFFFF : 0x666666, fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold' },
        })
        btnText.anchor = { x: 0.5, y: 0.5 }
        btnText.x = bx + cellW - 56
        btnText.y = by + 30
        c.addChild(btnText)

        btn.on('pointerdown', (e: FederatedPointerEvent) => {
          e.stopPropagation()
          if (!canAfford) return
          game.upgradeType(def.type)
        })
      }
    }
  }

  function drawHappinessTab(): void {
    if (!currentState) return
    const s = currentState
    const yBase = CONTENT_Y

    const rowH = 38
    let ry = yBase + 6

    function drawRow(y: number, parts: Array<{ text: string; color?: number; bold?: boolean; w: number }>): void {
      let xOff = 14
      for (const p of parts) {
        const t = new Text({
          text: p.text,
          style: { fill: p.color || 0xCCCCCC, fontSize: 13, fontFamily: 'monospace', fontWeight: p.bold ? 'bold' : 'normal' },
        })
        t.x = xOff
        t.y = y
        c.addChild(t)
        xOff += p.w || 0
      }
    }

    const mood = s.happiness >= 70 ? ':)' : s.happiness >= 50 ? ':|' : ':('
    const moodColor = s.happiness >= 70 ? 0x44FF44 : s.happiness >= 50 ? 0xFFDD44 : 0xFF4444

    drawRow(ry, [
      { text: `Happiness: ${s.happiness}% ${mood}`, color: moodColor, bold: true, w: 350 },
    ])
    ry += rowH

    const popColor = s.population > s.maxPopulation ? 0xFF4444 : 0xCCCCCC
    drawRow(ry, [
      { text: `Pop: ${s.population}/${s.maxPopulation}`, color: popColor, w: 210 },
      { text: `Workers: ${s.workers}`, color: 0xCCCCCC, w: 190 },
      { text: `Soldiers: ${s.soldiers}`, color: 0xFF8888, w: 0 },
    ])
    ry += rowH

    const foodColor = s.starved ? 0xFF4444 : 0xCCCCCC
    drawRow(ry, [
      { text: `Food: ${s.food}`, color: foodColor, w: 160 },
      { text: `Net: ${(s.foodProduction - s.foodConsumption).toFixed(1)}/d`, color: s.foodProduction >= s.foodConsumption ? 0x44FF44 : 0xFF4444, w: 200 },
      { text: `Gold: ${s.gold}`, color: 0xFFDD44, w: 0 },
    ])
    ry += rowH

    const taxText = new Text({
      text: `Tax: ${s.taxRate}%  [+${s.taxGold}/d]`,
      style: { fill: 0xCCCCCC, fontSize: 13, fontFamily: 'monospace' },
    })
    taxText.x = 14
    taxText.y = ry
    c.addChild(taxText)
    const taxDecBtn = makeSmallBtn(180, ry - 1, '-5', () => game.changeTaxRate(-5))
    const taxIncBtn = makeSmallBtn(222, ry - 1, '+5', () => game.changeTaxRate(5))
    c.addChild(taxDecBtn)
    c.addChild(taxIncBtn)
    ry += rowH

    const rations = ['Low', 'Norm', 'High']
    const ratLabel = new Text({
      text: 'Rations:',
      style: { fill: 0xCCCCCC, fontSize: 13, fontFamily: 'monospace' },
    })
    ratLabel.x = 14
    ratLabel.y = ry
    c.addChild(ratLabel)
    for (let i = 0; i < 3; i++) {
      const isActive = s.foodRations === i
      const rBtn = new Graphics()
      rBtn.rect(90 + i * 60, ry, 54, 24)
      rBtn.fill(isActive ? 0x2266AA : 0x333355)
      rBtn.rect(90 + i * 60, ry, 54, 24)
      rBtn.stroke({ color: isActive ? 0x88CCFF : 0x555577, width: 1 })
      rBtn.eventMode = 'static'
      rBtn.cursor = 'pointer'
      c.addChild(rBtn)
      const rTxt = new Text({
        text: rations[i]!,
        style: { fill: isActive ? 0xFFFFFF : 0x999999, fontSize: 10, fontFamily: 'monospace', fontWeight: isActive ? 'bold' : 'normal' },
      })
      rTxt.anchor = { x: 0.5, y: 0.5 }
      rTxt.x = 90 + i * 60 + 27
      rTxt.y = ry + 12
      c.addChild(rTxt)
      const idx = i
      rBtn.on('pointerdown', (e: FederatedPointerEvent) => {
        e.stopPropagation()
        game.changeRations(idx)
      })
    }
  }

  function drawRecruitTab(): void {
    if (!currentState) return
    const s = currentState
    const yBase = CONTENT_Y

    let ry = yBase + 16

    const soldText = new Text({
      text: `Soldiers: ${s.soldiers} / ${s.maxSoldiers}`,
      style: { fill: 0xFF8888, fontSize: 14, fontFamily: 'monospace', fontWeight: 'bold' },
    })
    soldText.x = 20
    soldText.y = ry
    c.addChild(soldText)

    const barMax = s.maxSoldiers || 1
    const barW = 260
    const barFillW = (s.soldiers / barMax) * barW
    const barBg = new Graphics()
    barBg.rect(280, ry + 2, barW, 18)
    barBg.fill(0x222222)
    c.addChild(barBg)
    const barFill = new Graphics()
    barFill.rect(280, ry + 2, barFillW, 18)
    barFill.fill(0xCC4444)
    c.addChild(barFill)

    ry += 44

    const availPop = s.population - s.soldiers
    const infoText = new Text({
      text: `Pop available: ${availPop}  |  Cost: ${RECRUIT_GOLD_COST}g  |  Gold: ${s.gold}`,
      style: { fill: 0xCCCCCC, fontSize: 12, fontFamily: 'monospace' },
    })
    infoText.x = 20
    infoText.y = ry
    c.addChild(infoText)

    ry += 50

    const canRecruit = s.soldiers < s.maxSoldiers && availPop > 0 && s.gold >= RECRUIT_GOLD_COST
    const recruitBtn = makeBtn(100, ry, 140, 38, 'RECRUIT', 0x226622, 0x44AA44, canRecruit, () => game.recruitSoldier())
    c.addChild(recruitBtn)

    const canDismiss = s.soldiers > 0
    const dismissBtn = makeBtn(280, ry, 140, 38, 'DISMISS', 0x662222, 0xAA4444, canDismiss, () => game.dismissSoldier())
    c.addChild(dismissBtn)
  }

  function makeBtn(
    x: number, y: number, w: number, h: number, label: string,
    fillColor: number, strokeColor: number, enabled: boolean, onClick: () => void
  ): Container {
    const btn = new Container()
    const bg = new Graphics()
    bg.rect(0, 0, w, h)
    bg.fill(enabled ? fillColor : 0x333333)
    bg.rect(0, 0, w, h)
    bg.stroke({ color: enabled ? strokeColor : 0x555555, width: 1 })
    btn.addChild(bg)
    const t = new Text({
      text: label,
      style: { fill: enabled ? 0xFFFFFF : 0x666666, fontSize: 13, fontFamily: 'monospace', fontWeight: 'bold' },
    })
    t.anchor = { x: 0.5, y: 0.5 }
    t.x = w / 2
    t.y = h / 2
    btn.addChild(t)
    btn.x = x
    btn.y = y
    bg.eventMode = 'static'
    if (enabled) {
      bg.cursor = 'pointer'
      bg.on('pointerdown', (e: FederatedPointerEvent) => {
        e.stopPropagation()
        onClick()
      })
    }
    return btn
  }

  function makeSmallBtn(x: number, y: number, label: string, callback: () => void): Container {
    const btn = new Container()
    const bg = new Graphics()
    bg.rect(0, 0, 38, 22)
    bg.fill(0x333366)
    bg.rect(0, 0, 38, 22)
    bg.stroke({ color: 0x5555AA, width: 1 })
    btn.addChild(bg)
    const t = new Text({
      text: label,
      style: { fill: 0xCCCCFF, fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' },
    })
    t.anchor = { x: 0.5, y: 0.5 }
    t.x = 19
    t.y = 11
    btn.addChild(t)
    bg.eventMode = 'static'
    bg.cursor = 'pointer'
    bg.on('pointerdown', (e: FederatedPointerEvent) => {
      e.stopPropagation()
      callback()
    })
    btn.x = x
    btn.y = y
    return btn
  }

  return { update }
}
