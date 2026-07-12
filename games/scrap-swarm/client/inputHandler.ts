export interface InputHandler {
  isDown(key: string): boolean
  destroy(): void
}

export function createInputHandler(): InputHandler {
  const state = new Map<string, boolean>()

  function onKeyDown(e: KeyboardEvent): void {
    state.set(e.key, true)
  }

  function onKeyUp(e: KeyboardEvent): void {
    state.set(e.key, false)
  }

  function onBlur(): void {
    state.clear()
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)

  function isDown(key: string): boolean {
    return state.get(key) ?? false
  }

  function destroy(): void {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', onBlur)
    state.clear()
  }

  return { isDown, destroy }
}
