import { GRID_W, GRID_H, HUD_H } from '../game/config.js'
import type { EconomyState } from '../game/systems/EconomySystem.js'

const APP_W = GRID_W
const STYLES = `
#sc-hud {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  z-index: 50;
  font-family: 'Courier New', monospace;
}
#sc-hud .hud-bg {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: ${HUD_H}px;
  background: #0d0d1a;
  border-bottom: 1px solid #222244;
  pointer-events: none;
}
#sc-hud .hud-content {
  position: absolute;
  top: 0; left: 0; right: 0; height: ${HUD_H}px;
  display: flex; align-items: center;
  padding: 0 12px;
  pointer-events: auto;
  gap: 8px;
}
#sc-hud .resource { font-size: 13px; font-weight: bold; }
#sc-hud .resource.si { color: #8888cc; }
#sc-hud .resource.fe { color: #cc8844; }
#sc-hud .resource.cu { color: #cc6633; }
#sc-hud .sep { color: #444466; font-size: 13px; margin: 0 4px; }
#sc-hud .status { font-size: 12px; color: #888888; }
#sc-hud .status.active { color: #ff6644; font-weight: bold; }
#sc-hud .status.cooldown { color: #44aaff; }
#sc-hud .btn {
  pointer-events: auto;
  padding: 6px 14px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  font-weight: bold;
  border: 1px solid #555555;
  border-radius: 3px;
  cursor: pointer;
  background: #333344;
  color: #666666;
}
#sc-hud .btn.active {
  background: #448844;
  border-color: #66cc66;
  color: #ffffff;
}
#sc-hud .btn.active:hover { background: #559955; }
#sc-hud .btn.danger.active { background: #884444; border-color: #cc6666; }
#sc-hud .btn.danger.active:hover { background: #995555; }
#sc-hud .bottom-bar {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: ${HUD_H}px;
  background: #0d0d1a;
  border-top: 1px solid #222244;
  pointer-events: none;
  display: flex; align-items: center;
  padding: 0 12px;
  z-index: 51;
}
#sc-hud .bottom-bar > * { pointer-events: auto; }
#sc-hud .hint { font-size: 10px; color: #555577; }
`

interface GameHandle {
  startWave: () => void
  buildCrawler: () => void
}

export function createUI(game: GameHandle) {
  if (!document.getElementById('sc-hud-style')) {
    const style = document.createElement('style')
    style.id = 'sc-hud-style'
    style.textContent = STYLES
    document.head.appendChild(style)
  }

  let hudEl = document.getElementById('sc-hud')
  if (hudEl) hudEl.remove()

  hudEl = document.createElement('div')
  hudEl.id = 'sc-hud'

  hudEl.innerHTML = `
    <div class="hud-bg"></div>
    <div class="hud-content">
      <span class="resource si">Si: 0</span>
      <span class="sep">|</span>
      <span class="resource fe">Fe: 20</span>
      <span class="sep">|</span>
      <span class="resource cu">Cu: 0</span>
      <span class="sep">|</span>
      <span class="status">IDLE</span>
      <div style="flex:1"></div>
      <button class="btn" id="sc-btn-crawler" title="Build a crawler (30 Si + 20 Fe + 10 Cu)">BUILD CRAWLER</button>
      <button class="btn danger" id="sc-btn-wave">DEPLOY WAVE</button>
    </div>
    <div class="bottom-bar">
      <span class="hint">[Space] Deploy wave &nbsp;&nbsp; [B] Build crawler &nbsp;&nbsp; [Ctrl+I] Inspect &nbsp;&nbsp; [F12] Debug</span>
    </div>
  `

  const gameArea = document.querySelector('#app > div') || document.querySelector('#app')
  if (gameArea) {
    gameArea.appendChild(hudEl)
  } else {
    document.body.appendChild(hudEl)
  }

  const siEl = hudEl.querySelector('.resource.si') as HTMLElement
  const feEl = hudEl.querySelector('.resource.fe') as HTMLElement
  const cuEl = hudEl.querySelector('.resource.cu') as HTMLElement
  const statusEl = hudEl.querySelector('.status') as HTMLElement
  const waveBtn = hudEl.querySelector('#sc-btn-wave') as HTMLButtonElement
  const crawlerBtn = hudEl.querySelector('#sc-btn-crawler') as HTMLButtonElement

  let lastSi = -1, lastFe = -1, lastCu = -1
  let lastPhase = ''

  waveBtn.addEventListener('click', () => game.startWave())
  crawlerBtn.addEventListener('click', () => game.buildCrawler())

  function update(economy: EconomyState | null, waveInfo: { wave: number; phase: string }): void {
    const eco = economy ?? { silicon: 0, iron: 0, copper: 0 }
    const si = Math.round(eco.silicon)
    const fe = Math.round(eco.iron)
    const cu = Math.round(eco.copper)

    if (si !== lastSi || fe !== lastFe || cu !== lastCu || waveInfo.phase !== lastPhase) {
      siEl.textContent = `Si: ${si}`
      feEl.textContent = `Fe: ${fe}`
      cuEl.textContent = `Cu: ${cu}`
      lastSi = si; lastFe = fe; lastCu = cu; lastPhase = waveInfo.phase

      const phase = waveInfo.phase
      const isIdle = phase === 'idle'
      statusEl.textContent = phase.toUpperCase()
      statusEl.className = 'status' + (phase === 'active' ? ' active' : phase === 'cooldown' ? ' cooldown' : '')

      waveBtn.textContent = isIdle ? 'DEPLOY WAVE' : 'WAITING...'
      waveBtn.className = 'btn danger' + (isIdle ? ' active' : '')

      const canBuild = si >= 30 && fe >= 20 && cu >= 10
      crawlerBtn.className = 'btn' + (canBuild ? ' active' : '')
    }
  }

  function destroy(): void {
    hudEl?.remove()
  }

  return { update, destroy }
}
