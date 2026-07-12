import { Application, Container, Graphics, Text } from 'pixi.js'
import { createResponsiveContainer } from '@sub-engine/pixi'
import { createGameScene } from './gameScene.js'
import { createUI } from './ui.js'

const GAME_W = 640
const GAME_H = 642

function showStartScreen(app: Application, container: Container): Promise<void> {
  return new Promise((resolve) => {
    const bg = new Graphics()
    bg.rect(0, 0, GAME_W, GAME_H)
    bg.fill(0x0a0a1a)
    container.addChild(bg)

    const title = new Text({
      text: 'TOWER DEFENSE',
      style: { fill: 0xffcc44, fontSize: 42, fontFamily: 'monospace', fontWeight: 'bold' },
    })
    title.anchor = { x: 0.5, y: 0.5 }
    title.x = GAME_W / 2
    title.y = GAME_H / 2 - 80
    container.addChild(title)

    const sub = new Text({
      text: 'Defend your base. Place towers and bombs.',
      style: { fill: 0xaaaaaa, fontSize: 14, fontFamily: 'monospace' },
    })
    sub.anchor = { x: 0.5, y: 0.5 }
    sub.x = GAME_W / 2
    sub.y = GAME_H / 2 - 30
    container.addChild(sub)

    const btn = new Graphics()
    btn.rect(GAME_W / 2 - 100, GAME_H / 2 + 20, 200, 50)
    btn.fill(0x44aa44)
    btn.eventMode = 'static'
    btn.cursor = 'pointer'
    container.addChild(btn)

    const btnText = new Text({
      text: 'START GAME',
      style: { fill: 0xffffff, fontSize: 22, fontFamily: 'monospace', fontWeight: 'bold' },
    })
    btnText.anchor = { x: 0.5, y: 0.5 }
    btnText.x = GAME_W / 2
    btnText.y = GAME_H / 2 + 45
    container.addChild(btnText)

    const help = new Text({
      text: 'Select a tower from the bottom menu, then click the map to place it.\nPress Start Wave to begin each wave.\nBomb traps block enemies. Bomber enemies drop timed bombs.',
      style: { fill: 0x666666, fontSize: 11, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: 400 },
    })
    help.anchor = { x: 0.5, y: 0.5 }
    help.x = GAME_W / 2
    help.y = GAME_H / 2 + 110
    container.addChild(help)

    btn.on('pointerdown', () => {
      container.removeChildren()
      resolve()
    })
  })
}

export async function init(): Promise<void> {
  const app = new Application()
  await app.init({
    resizeTo: window,
    backgroundColor: 0x000000,
    antialias: true,
  })

  const appContainer = document.getElementById('app')
  if (!appContainer) throw new Error('#app element not found')
  appContainer.appendChild(app.canvas as HTMLCanvasElement)

  const gameContainer = createResponsiveContainer(app, GAME_W, GAME_H)

  await showStartScreen(app, gameContainer)

  const game = createGameScene(gameContainer, app, GAME_W, GAME_H)
  const ui = createUI(gameContainer, game, GAME_W, GAME_H)
  game.setUI(ui)
  ui.update(game.getState())
}
