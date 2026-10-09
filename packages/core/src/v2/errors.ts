// Sub-Engine v2 — schema validation errors.
//
// Every rejection names the full path (e.g. `Wallet.coins`) so an agent can fix
// the write without reading engine source. Article 4: every write is validated.

export function formatPath(path: readonly (string | number)[]): string {
  let out = ''
  for (const part of path) {
    if (typeof part === 'number') out += `[${part}]`
    else out += out === '' ? part : `.${part}`
  }
  return out
}

export class ValidationError extends Error {
  readonly path: string
  constructor(message: string, path: readonly (string | number)[]) {
    super(`${formatPath(path)}: ${message}`)
    this.name = 'ValidationError'
    this.path = formatPath(path)
  }
}

export class SchemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SchemaError'
  }
}
