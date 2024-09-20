import { Emitter, Event } from './event'
import type { IDisposable } from './utils/Disposable'

const shortcutEvent: Event<any> = Object.freeze((callback, context?): IDisposable => {
  const handle = setTimeout(callback.bind(context), 0)
  return {
    dispose() { clearTimeout(handle) },
  }
})

class MutableToken implements CancellationToken {
  private _isCancelled: boolean = false
  private _emitter: Emitter<any> | null = null

  public cancel() {
    if (!this._isCancelled) {
      this._isCancelled = true
      if (this._emitter) {
        this._emitter.fire(undefined)
        this.dispose()
      }
    }
  }

  get isCancellationRequested(): boolean {
    return this._isCancelled
  }

  get onCancellationRequested(): Event<any> {
    if (this._isCancelled) {
      return shortcutEvent
    }
    if (!this._emitter) {
      this._emitter = new Emitter<any>()
    }
    return this._emitter.event
  }

  public dispose(): void {
    if (this._emitter) {
      this._emitter.dispose()
      this._emitter = null
    }
  }
}

export interface CancellationToken {
  readonly isCancellationRequested: boolean
  readonly onCancellationRequested: (listener: (e: any) => any, thisArgs?: any, disposables?: IDisposable[]) => IDisposable
}

export interface CancelablePromise<T> extends Promise<T> {
  cancel: () => void
}

export class CancellationTokenSource {
  private _token?: CancellationToken = undefined
  private _parentListener?: IDisposable = undefined

  constructor(parent?: CancellationToken) {
    this._parentListener = parent && parent.onCancellationRequested(this.cancel, this)
  }

  get token(): CancellationToken {
    if (!this._token) {
      // be lazy and create the token only when
      // actually needed
      this._token = new MutableToken()
    }
    return this._token
  }

  cancel(): void {
    if (!this._token) {
      // save an object by returning the default
      // cancelled token when cancellation happens
      // before someone asks for the token
      this._token = CancellationToken.Cancelled
    }
    else if (this._token instanceof MutableToken) {
      // actually cancel
      this._token.cancel()
    }
  }

  dispose(cancel: boolean = false): void {
    if (cancel) {
      this.cancel()
    }
    this._parentListener?.dispose()
    if (!this._token) {
      // ensure to initialize with an empty token if we had none
      this._token = CancellationToken.None
    }
    else if (this._token instanceof MutableToken) {
      // actually dispose
      this._token.dispose()
    }
  }
}
export class CancellationError extends Error {
  constructor() {
    super('Canceled')
    this.name = this.message
  }
}
export function createCancelablePromise<T>(callback: (token: CancellationToken) => Promise<T>): CancelablePromise<T> {
  const source = new CancellationTokenSource()

  const thenable = callback(source.token)
  const promise = new Promise<T>((resolve, reject) => {
    const subscription = source.token.onCancellationRequested(() => {
      subscription.dispose()
      reject(new CancellationError())
    })
    Promise.resolve(thenable).then((value) => {
      subscription.dispose()
      source.dispose()
      resolve(value)
    }, (err) => {
      subscription.dispose()
      source.dispose()
      reject(err)
    })
  })

  return <CancelablePromise<T>> new class {
    cancel() {
      source.cancel()
      source.dispose()
    }

    then<TResult1 = T, TResult2 = never>(resolve?: ((value: T) => TResult1 | Promise<TResult1>) | undefined | null, reject?: ((reason: any) => TResult2 | Promise<TResult2>) | undefined | null): Promise<TResult1 | TResult2> {
      return promise.then(resolve, reject)
    }

    catch<TResult = never>(reject?: ((reason: any) => TResult | Promise<TResult>) | undefined | null): Promise<T | TResult> {
      return this.then(undefined, reject)
    }

    finally(onfinally?: (() => void) | undefined | null): Promise<T> {
      return promise.finally(onfinally)
    }
  }()
}
export namespace CancellationToken {

  export function isCancellationToken(thing: unknown): thing is CancellationToken {
    if (thing === CancellationToken.None || thing === CancellationToken.Cancelled) {
      return true
    }
    if (!thing || typeof thing !== 'object') {
      return false
    }
    return typeof (thing as CancellationToken).isCancellationRequested === 'boolean'
      && typeof (thing as CancellationToken).onCancellationRequested === 'function'
  }

  export const None = Object.freeze<CancellationToken>({
    isCancellationRequested: false,
    onCancellationRequested: Event.None,
  })

  export const Cancelled = Object.freeze<CancellationToken>({
    isCancellationRequested: true,
    onCancellationRequested: shortcutEvent,
  })
}
