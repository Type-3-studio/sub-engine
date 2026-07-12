import { Container, Graphics, Text } from 'pixi.js'
import { GAME_W, HUD_H, MAP_H } from '../game/config.js'
import type { UIHandle, UnitInfo } from './gameScene.js'

export function createUI(container: Container, getSelected: () => UnitInfo | null): UIHandle {
  const c = new Container()
  container.addChild(c)

  const bg = new Graphics()
  bg.rect(0, 0, GAME_W, HUD_H)
  bg.fill(0x1a1a2e)
  c.addChild(bg)

  const scrapText = new Text({ text: 'Scrap: 0', style: { fill: 0x88aaff, fontSize: 13, fontFamily: 'monospace' } })
  scrapText.x = 12; scrapText.y = 6
  c.addChild(scrapText)

  const crystalText = new Text({ text: 'Crystal: 0', style: { fill: 0xcc44ff, fontSize: 13, fontFamily: 'monospace' } })
  crystalText.x = 12; crystalText.y = 26
  c.addChild(crystalText)

  const fuelText = new Text({ text: 'Fuel: 0', style: { fill: 0xff8844, fontSize: 13, fontFamily: 'monospace' } })
  fuelText.x = 170; fuelText.y = 6
  c.addChild(fuelText)

  const workerText = new Text({ text: 'W:0', style: { fill: 0x44ff88, fontSize: 13, fontFamily: 'monospace' } })
  workerText.x = 170; workerText.y = 26
  c.addChild(workerText)

  const fighterText = new Text({ text: 'F:0', style: { fill: 0xff4444, fontSize: 13, fontFamily: 'monospace' } })
  fighterText.x = 240; fighterText.y = 26
  c.addChild(fighterText)

  const enemyText = new Text({ text: 'E:0', style: { fill: 0xff8844, fontSize: 13, fontFamily: 'monospace' } })
  enemyText.x = 300; enemyText.y = 26
  c.addChild(enemyText)

  const waveText = new Text({ text: 'Wave: 0', style: { fill: 0xffffff, fontSize: 13, fontFamily: 'monospace' } })
  waveText.x = 370; waveText.y = 14
  c.addChild(waveText)

  const infoBg = new Graphics()
  infoBg.rect(0, HUD_H, 220, 120)
  infoBg.fill({ color: 0x0a0a1a, alpha: 0.85 })
  c.addChild(infoBg)

  const infoText = new Text({ text: '', style: { fill: 0xcccccc, fontSize: 11, fontFamily: 'monospace' } })
  infoText.x = 8; infoText.y = HUD_H + 8
  c.addChild(infoText)

  function update(state: { balances: Record<string, number> } | null, info: {
    workers: number; fighters: number; enemies: number; wave: number; phase: string; selectedId: number | null
  }): void {
    const b = state?.balances ?? {}
    scrapText.text = `Scrap: ${b.scrap ?? 0}`
    crystalText.text = `Crystal: ${b.crystal ?? 0}`
    fuelText.text = `Fuel: ${b.fuel ?? 0}`
    workerText.text = `W:${info.workers}`
    fighterText.text = `F:${info.fighters}`
    enemyText.text = `E:${info.enemies}`
    const phaseLabel = info.phase === 'victory' ? 'Victory!' : info.phase === 'wave' ? 'Wave' : 'Preparing...'
    waveText.text = `${phaseLabel} ${info.phase === 'victory' ? '' : info.wave}`

    if (info.selectedId !== null) {
      const sel = getSelected()
      if (sel) {
        const lines = [
          `[${sel.label.toUpperCase()}] #${sel.id}`,
          sel.hp ? `HP: ${sel.hp.current}/${sel.hp.max}` : '',
          sel.state ? `State: ${sel.state}` : '',
          sel.cargo !== null ? `Cargo: ${sel.cargo}` : '',
          `Pos: (${Math.round(sel.position.x)}, ${Math.round(sel.position.y)})`,
        ]
        infoText.text = lines.filter(l => l).join('\n')
      }
    } else {
      infoText.text = ''
    }
  }

  return { update }
}
