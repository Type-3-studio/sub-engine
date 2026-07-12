import type { EntitySnapshot } from './DebugOverlay.js'

export interface InspectorConfig {
  getSnapshot: () => EntitySnapshot[]
  onInspect?: (entity: EntitySnapshot) => void
  onClose?: () => void
  panelWidth?: number
  panelHeight?: number
}

export interface Inspector {
  handleEntityClick(entityId: number): void
  show(): void
  hide(): void
  toggle(): void
  isVisible(): boolean
  update(): void
  destroy(): void
}

const STYLES = `
#sc-inspector {
  all: initial;
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  z-index: 9999;
  font-family: 'Courier New', monospace;
}
#sc-inspector.visible { display: block; }
#sc-inspector:not(.visible) { display: none; }
#sc-inspector .panel {
  position: absolute;
  top: 12px;
  left: 12px;
  pointer-events: auto;
  background: rgba(13, 13, 26, 0.94);
  border: 1px solid #444466;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
#sc-inspector .header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #333355;
  flex-shrink: 0;
}
#sc-inspector .header-title {
  color: #88ccff;
  font-size: 13px;
  font-weight: bold;
}
#sc-inspector .header-close {
  color: #ff6644;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
}
#sc-inspector .header-close:hover { background: rgba(255,102,68,0.2); }
#sc-inspector .list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
#sc-inspector .list-item {
  display: flex;
  align-items: center;
  padding: 3px 10px;
  cursor: pointer;
  font-size: 11px;
  color: #cccccc;
  border-bottom: 0.5px solid rgba(68,68,102,0.3);
}
#sc-inspector .list-item:hover { background: #222244; }
#sc-inspector .list-item.selected { background: #334466; }
#sc-inspector .detail {
  border-top: 1px solid #333355;
  padding: 8px 10px;
  font-size: 10px;
  color: #888888;
  overflow-y: auto;
  flex-shrink: 0;
  white-space: pre-wrap;
  line-height: 1.5;
}
#sc-inspector .detail .key { color: #888888; }
#sc-inspector .detail .val { color: #cccccc; }
#sc-inspector .detail .hdr { color: #88ccff; font-size: 11px; font-weight: bold; }
#sc-inspector .scroll-hint {
  padding: 2px 10px;
  font-size: 10px;
  color: #666688;
  font-style: italic;
  flex-shrink: 0;
}
`

export function createInspector(config: InspectorConfig): Inspector {
  const {
    getSnapshot,
    onInspect,
    onClose,
    panelWidth = 320,
    panelHeight = 420,
  } = config

  let visible = false
  let selectedEntityId: number | null = null
  const itemEls = new Map<number, HTMLElement>()

  if (!document.getElementById('sc-inspector-style')) {
    const style = document.createElement('style')
    style.id = 'sc-inspector-style'
    style.textContent = STYLES
    document.head.appendChild(style)
  }

  const overlay = document.createElement('div')
  overlay.id = 'sc-inspector'

  const panel = document.createElement('div')
  panel.className = 'panel'
  panel.style.width = panelWidth + 'px'
  panel.style.height = panelHeight + 'px'
  overlay.appendChild(panel)

  const header = document.createElement('div')
  header.className = 'header'
  header.innerHTML = '<span class="header-title">INSPECTOR — Ctrl+I</span><span class="header-close">✕</span>'
  header.querySelector('.header-close')!.addEventListener('click', () => hide())
  panel.appendChild(header)

  const listEl = document.createElement('div')
  listEl.className = 'list'
  panel.appendChild(listEl)

  const scrollHint = document.createElement('div')
  scrollHint.className = 'scroll-hint'
  panel.appendChild(scrollHint)

  const detailEl = document.createElement('div')
  detailEl.className = 'detail'
  panel.appendChild(detailEl)

  document.body.appendChild(overlay)

  function renderList(): void {
    const snapshots = getSnapshot()
    const activeIds = new Set<number>()

    for (const entity of snapshots) {
      activeIds.add(entity.id)

      let el = itemEls.get(entity.id)
      const label = (entity.Label as { value?: string } | undefined)?.value ?? ''
      const display = `#${entity.id}  ${label.toUpperCase()}`
      const isSelected = entity.id === selectedEntityId

      if (!el) {
        el = document.createElement('div')
        el.className = 'list-item'
        el.addEventListener('click', () => selectEntity(entity.id))
        listEl.appendChild(el)
        itemEls.set(entity.id, el)
      }

      el.textContent = display
      el.className = 'list-item' + (isSelected ? ' selected' : '')
    }

    for (const [id, el] of itemEls) {
      if (!activeIds.has(id)) {
        el.remove()
        itemEls.delete(id)
      }
    }

    const total = snapshots.length
    const visibleCount = listEl.children.length
    scrollHint.textContent = total > visibleCount ? `${visibleCount}/${total} — scroll ▼` : `${total} entities`
  }

  function renderDetail(): void {
    if (selectedEntityId === null) {
      detailEl.innerHTML = '<span style="color:#666688;font-style:italic;">Click an entity in the list or in the game to inspect</span>'
      return
    }

    const snapshots = getSnapshot()
    const entity = snapshots.find(e => e.id === selectedEntityId)
    if (!entity) {
      selectedEntityId = null
      renderDetail()
      renderList()
      return
    }

    onInspect?.(entity)

    const label = (entity.Label as { value?: string } | undefined)?.value ?? ''
    let html = `<span class="hdr">Entity #${selectedEntityId}  ${label.toUpperCase()}</span>\n`

    const keys = Object.keys(entity).filter(k => k !== 'id')
    for (const key of keys) {
      const val = entity[key]
      if (val === null || val === undefined) {
        html += `<span class="key">  ${key}:</span> <span class="val">null</span>\n`
      } else if (typeof val === 'object') {
        html += `<span class="key">  ${key}:</span>\n`
        html += formatObjectHTML(val, 2)
      } else {
        html += `<span class="key">  ${key}:</span> <span class="val">${escapeHTML(String(val))}</span>\n`
      }
    }

    detailEl.innerHTML = html
  }

  function formatObjectHTML(obj: Record<string, any>, indent: number): string {
    const pad = '  '.repeat(indent)
    let html = ''
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'object' && v !== null) {
        html += `${pad}<span class="key">${k}:</span> <span class="val">${escapeHTML(JSON.stringify(v))}</span>\n`
      } else {
        html += `${pad}<span class="key">${k}:</span> <span class="val">${escapeHTML(String(v))}</span>\n`
      }
    }
    return html
  }

  function escapeHTML(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  function selectEntity(entityId: number): void {
    selectedEntityId = entityId
    renderList()
    renderDetail()
  }

  function handleEntityClick(entityId: number): void {
    if (!visible) return
    selectEntity(entityId)
  }

  function show(): void {
    visible = true
    selectedEntityId = null
    overlay.classList.add('visible')
    renderList()
    renderDetail()
  }

  function hide(): void {
    visible = false
    overlay.classList.remove('visible')
    onClose?.()
  }

  function toggle(): void {
    if (visible) hide()
    else show()
  }

  function isVisible(): boolean {
    return visible
  }

  function update(): void {
    if (!visible) return
    renderList()
    if (selectedEntityId !== null) renderDetail()
  }

  function destroy(): void {
    overlay.remove()
    itemEls.clear()
  }

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.ctrlKey && (e.key === 'i' || e.key === 'I')) {
      e.preventDefault()
      toggle()
    }
    if (e.key === 'Escape' && visible) {
      hide()
    }
  })

  panel.addEventListener('wheel', (e: WheelEvent) => {
    const list = panel.querySelector('.list')!
    list.scrollTop += e.deltaY
  })

  return { handleEntityClick, show, hide, toggle, isVisible, update, destroy }
}
