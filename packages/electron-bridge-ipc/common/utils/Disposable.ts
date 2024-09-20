export interface IDisposable {
  dispose: () => void
}

export class DisposableStore implements IDisposable {
  private _isDisposed = false
  private readonly _toDispose = new Set<IDisposable>()
  public dispose(): void {
    if (this._isDisposed) {
      return
    }
    this._isDisposed = true
    this.clear()
  }

  public clear(): void {
    if (this._toDispose.size === 0) {
      return
    }

    try {
      dispose(this._toDispose)
    }
    finally {
      this._toDispose.clear()
    }
  }

  public add<T extends IDisposable>(o: T): T {
    if (!o) {
      return o
    }
    if ((o as unknown as DisposableStore) === this) {
      throw new Error('Cannot register a disposable on itself!')
    }
    if (this._isDisposed) {
      console.warn(new Error('Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!').stack)
    }
    else {
      this._toDispose.add(o)
    }
    return o
  }
}

export class Disposable implements IDisposable {
  protected readonly _store = new DisposableStore()
  static readonly None = Object.freeze<IDisposable>({ dispose() { } })
  public dispose(): void {
    this._store.dispose()
  }

  protected _register<T extends IDisposable>(o: T): T {
    if ((o as unknown as Disposable) === this) {
      throw new Error('Cannot register a disposable on itself!')
    }
    return this._store.add(o)
  }
}
export function dispose<T extends IDisposable>(arg: T | Iterable<T> | undefined): any {
  if (arg && Symbol.iterator in arg) {
    const errors: any[] = []

    for (const d of arg) {
      if (d) {
        try {
          d.dispose()
        }
        catch (e) {
          errors.push(e)
        }
      }
    }

    if (errors.length === 1) {
      throw errors[0]
    }
    else if (errors.length > 1) {
      throw new Error('Encountered errors while disposing of store')
    }

    return Array.isArray(arg) ? [] : arg
  }
  else if (arg && 'dispose' in arg) {
    arg.dispose()
    return arg
  }
}

export function combinedDisposable(...disposables: IDisposable[]): IDisposable {
  const parent = toDisposable(() => dispose(disposables))
  return parent
}

export function toDisposable(fn: () => void): IDisposable {
  return {
    dispose: fn,
  }
}
