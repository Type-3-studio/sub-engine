import { Container, Text, Graphics, Application, FederatedPointerEvent } from 'pixi.js'

export interface EntitySnapshot {
  id: number
  [component: string]: any
}

type SnapshotProvider = () => EntitySnapshot[]

const LIST_TOP = 40
const BOTTOM_MARGIN = 40

export class DebugOverlay {
  private container: Container
  private visible = false
  private statsText: Text
  private entityTexts: Text[] = []
  private app: Application
  private getSnapshot: SnapshotProvider
  private inspectMode = false
  private inspectedEntity: EntitySnapshot | null = null
  private inspectText: Text | null = null
  private paused = false
  private onTogglePause?: () => void
  private pauseBtn: Container
  private scrollY = 0
  private listContainer: Container
  private listMask: Graphics

  constructor(app: Application, getSnapshot: SnapshotProvider, onTogglePause?: () => void) {
    this.app = app
    this.getSnapshot = getSnapshot
    this.onTogglePause = onTogglePause
    this.container = new Container()
    this.container.visible = false
    app.stage.addChild(this.container)

    this.statsText = new Text({
      text: '',
      style: { fill: 0x00ff00, fontSize: 13, fontFamily: 'monospace', fontWeight: 'bold' },
    })
    this.statsText.x = 10
    this.statsText.y = 10
    this.container.addChild(this.statsText)

    this.pauseBtn = new Container()
    this.pauseBtn.eventMode = 'static'
    this.pauseBtn.cursor = 'pointer'
    this.pauseBtn.on('pointerdown', () => {
      this.paused = !this.paused
      this.onTogglePause?.()
    })
    this.container.addChild(this.pauseBtn)

    this.listContainer = new Container()
    this.container.addChild(this.listContainer)

    this.listMask = new Graphics()
    this.container.addChild(this.listMask)
    this.listContainer.mask = this.listMask

    this.listContainer.eventMode = 'static'
    this.listContainer.on('wheel', (e: any) => {
      const maxScroll = Math.max(0, this.getTotalListHeight() - this.getListHeight())
      this.scrollY = Math.max(0, Math.min(maxScroll, this.scrollY + e.deltaY))
      e.stopPropagation()
    })

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'F12' || e.key === '`' || e.key === '~') {
        e.preventDefault()
        this.toggle()
      }
      if (e.key === 'i' && !e.ctrlKey && !e.metaKey && this.visible) {
        this.inspectMode = !this.inspectMode
        if (!this.inspectMode) this.clearInspect()
      }
      if (e.key === 'i' && (e.ctrlKey || e.metaKey) && this.visible) {
        e.preventDefault()
        this.paused = !this.paused
        this.onTogglePause?.()
      }
    })

    app.stage.eventMode = 'static'
    app.stage.on('pointerdown', (e: FederatedPointerEvent) => {
      if (!this.visible || !this.inspectMode) return
      const local = e.getLocalPosition(this.listContainer)
      for (const entity of this.getSnapshot()) {
        const textObj = this.entityTexts.find(t => t.text?.includes(`#${entity.id}`))
        if (!textObj) continue
        const ty = textObj.y - this.scrollY
        if (local.x >= textObj.x && local.x <= textObj.x + textObj.width &&
            local.y >= ty - 4 && local.y <= ty + textObj.height + 4) {
          this.showInspect(entity)
          return
        }
      }
    })
  }

  private getListHeight(): number {
    return this.app.screen.height - LIST_TOP - BOTTOM_MARGIN
  }

  private getTotalListHeight(): number {
    return this.entityTexts.reduce((s, t) => s + t.height + 6, 0)
  }

  private findLabel(entity: EntitySnapshot): string {
    const label = entity['Label'] as { value?: string } | undefined
    if (label && typeof label.value === 'string') {
      return label.value
    }
    return ''
  }

  private showInspect(entity: EntitySnapshot): void {
    this.inspectedEntity = entity
    if (this.inspectText) {
      this.container.removeChild(this.inspectText)
      this.inspectText.destroy()
    }
    const lines: string[] = [`Entity #${entity.id} ${this.findLabel(entity)}`]
    for (const key of Object.keys(entity)) {
      if (key === 'id') continue
      const val = entity[key]
      if (val && typeof val === 'object') {
        lines.push(`  ${key}: ${JSON.stringify(val)}`)
      }
    }
    this.inspectText = new Text({
      text: lines.join('\n'),
      style: { fill: 0xffff00, fontSize: 12, fontFamily: 'monospace' },
    })
    this.inspectText.x = this.app.screen.width / 2
    this.inspectText.y = 150
    this.container.addChild(this.inspectText)
  }

  private clearInspect(): void {
    this.inspectedEntity = null
    if (this.inspectText) {
      this.container.removeChild(this.inspectText)
      this.inspectText.destroy()
      this.inspectText = null
    }
  }

  toggle(): void {
    this.visible = !this.visible
    this.container.visible = this.visible
    if (!this.visible) {
      this.inspectMode = false
      this.clearInspect()
    }
  }

  setPaused(p: boolean): void {
    this.paused = p
  }

  update(): void {
    if (!this.visible) return

    const old = this.listContainer.removeChildren()
    for (const child of old) child.destroy()
    this.entityTexts = []

    const snapshots = this.getSnapshot()
    const fps = Math.round(this.app.ticker.FPS)
    const modeText = this.inspectMode ? ' [I: ON] Click entity to inspect' : ' [I: OFF]'
    const pauseText = this.paused ? '  PAUSED' : ''
    this.statsText.text = `FPS: ${String(fps).padStart(3)}  Entities: ${snapshots.length}  [F12/\u0060] Toggle${modeText}${pauseText}`
    this.statsText.style = { fill: this.paused ? 0xff8800 : 0x00ff00, fontSize: 13, fontFamily: 'monospace', fontWeight: 'bold' }

    this.pauseBtn.removeChildren()
    const btnBg = new Graphics()
    btnBg.roundRect(0, 0, 60, 22, 4).fill(this.paused ? 0xffaa00 : 0x00ff00)
    this.pauseBtn.addChild(btnBg)
    const btnIcon = new Text({
      text: this.paused ? 'PLAY' : 'PAUSE',
      style: { fill: 0x000000, fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' },
    })
    btnIcon.x = 8
    btnIcon.y = 3
    this.pauseBtn.addChild(btnIcon)
    this.pauseBtn.x = this.app.screen.width - 80
    this.pauseBtn.y = 8

    this.listMask.clear()
    this.listMask.rect(0, 0, this.app.screen.width, this.getListHeight()).fill({ color: 0x000000, alpha: 0.01 })
    this.listMask.y = LIST_TOP

    let y = LIST_TOP - this.scrollY
    for (const entity of snapshots) {
      const label = this.findLabel(entity)
      const lines: string[] = [`#${entity.id} ${label}`]
      for (const key of Object.keys(entity)) {
        if (key === 'id') continue
        const val = entity[key]
        if (val && typeof val === 'object') {
          lines.push(`  ${key}: ${JSON.stringify(val)}`)
        }
      }
      const t = new Text({
        text: lines.join('\n'),
        style: { fill: 0xcccccc, fontSize: 11, fontFamily: 'monospace' },
      })
      t.x = 10
      t.y = y
      this.listContainer.addChild(t)
      this.entityTexts.push(t)
      y += t.height + 6
    }

    if (this.scrollY > 0) {
      const hint = new Text({
        text: 'scroll up',
        style: { fill: 0x666666, fontSize: 10, fontFamily: 'monospace' },
      })
      hint.x = 10
      hint.y = LIST_TOP + this.getListHeight() - 14
      this.listContainer.addChild(hint)
    }
  }
}
