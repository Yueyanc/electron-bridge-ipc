import { Disposable, DisposableStore, type IDisposable, combinedDisposable, toDisposable } from './utils/Disposable'

class Stacktrace {
  static create() {
    const err = new Error()
    return new Stacktrace(err.stack ?? '')
  }

  private constructor(readonly value: string) { }
  print() {
    console.warn(this.value.split('\n').slice(2).join('\n'))
  }
}
type ListenerContainer<T> = UniqueContainer<(data: T) => void>
type ListenerOrListeners<T> = (ListenerContainer<T> | undefined)[] | ListenerContainer<T>

let id = 0
class UniqueContainer<T> {
  stack?: Stacktrace
  public id = id++
  constructor(public readonly value: T) { }
}
class EventDeliveryQueuePrivate {
  declare _isEventDeliveryQueue: true

  public i = -1

  public end = 0

  public current?: Emitter<any>

  public value?: unknown

  public enqueue<T>(emitter: Emitter<T>, value: T, end: number) {
    this.i = 0
    this.end = end
    this.current = emitter
    this.value = value
  }

  public reset() {
    this.i = this.end
    this.current = undefined
    this.value = undefined
  }
}

function addAndReturnDisposable<T extends IDisposable>(d: T, store: DisposableStore | IDisposable[] | undefined): T {
  if (Array.isArray(store)) {
    store.push(d)
  }
  else if (store) {
    store.add(d)
  }
  return d
}
export function createSingleCallFunction<T extends Function>(this: unknown, fn: T, fnDidRunCallback?: () => void): T {
  const _this = this
  let didCall = false
  let result: unknown

  return function () {
    if (didCall) {
      return result
    }

    didCall = true
    if (fnDidRunCallback) {
      try {
        result = fn.apply(_this, arguments)
      }
      finally {
        fnDidRunCallback()
      }
    }
    else {
      result = fn.apply(_this, arguments)
    }

    return result
  } as unknown as T
}

export interface Event<T> {
  (listener: (e: T) => any, thisArgs?: any, disposables?: IDisposable[] | DisposableStore): IDisposable
}

export interface EventDeliveryQueue {
  _isEventDeliveryQueue: true
}
export interface EmitterOptions {
  /**
   * Optional function that's called *before* the very first listener is added
   */
  onWillAddFirstListener?: Function
  /**
   * Optional function that's called *after* the very first listener is added
   */
  onDidAddFirstListener?: Function
  /**
   * Optional function that's called after a listener is added
   */
  onDidAddListener?: Function
  /**
   * Optional function that's called *after* remove the very last listener
   */
  onDidRemoveLastListener?: Function
  /**
   * Optional function that's called *before* a listener is removed
   */
  onWillRemoveListener?: Function
  /**
   * Optional function that's called when a listener throws an error. Defaults to
   * {@link onUnexpectedError}
   */
  onListenerError?: (e: any) => void
  /**
   * Number of listeners that are allowed before assuming a leak. Default to
   * a globally configured value
   *
   * @see setGlobalLeakWarningThreshold
   */
  leakWarningThreshold?: number
  /**
   * Pass in a delivery queue, which is useful for ensuring
   * in order event delivery across multiple emitters.
   */
  deliveryQueue?: EventDeliveryQueue

  /** ONLY enable this during development */
  _profName?: string
}

export class Emitter<T> {
  protected _listeners?: ListenerOrListeners<T>
  private _deliveryQueue?: EventDeliveryQueuePrivate
  private _disposed?: true
  private readonly _options?: EmitterOptions
  private _event?: Event<T>
  protected _size = 0
  constructor(options?: EmitterOptions) {
    this._options = options
    this._deliveryQueue = this._options?.deliveryQueue as EventDeliveryQueuePrivate | undefined
  }

  private _deliver(listener: undefined | UniqueContainer<(value: T) => void>, value: T) {
    if (!listener) {
      return
    }
    listener.value(value)
  }

  private _deliverQueue(dq: EventDeliveryQueuePrivate) {
    const listeners = dq.current!._listeners! as (ListenerContainer<T> | undefined)[]
    while (dq.i < dq.end) {
      // important: dq.i is incremented before calling deliver() because it might reenter deliverQueue()
      this._deliver(listeners[dq.i++], dq.value as T)
    }
    dq.reset()
  }

  fire(event: T): void {
    if (this._deliveryQueue?.current) {
      this._deliverQueue(this._deliveryQueue)
    }
    if (!this._listeners) {
      // no-op
    }
    else if (this._listeners instanceof UniqueContainer) {
      this._deliver(this._listeners, event)
    }
    else {
      const dq = this._deliveryQueue!
      dq.enqueue(this, event, this._listeners.length)
      this._deliverQueue(dq)
    }
  }

  get event(): Event<T> {
    this._event = (callback: (e: T) => any, thisArgs?: any, disposables?: IDisposable[] | DisposableStore) => {
      if (this._disposed) {
        return Disposable.None
      }
      if (thisArgs) {
        callback = callback.bind(thisArgs)
      }
      const contained = new UniqueContainer(callback)
      if (!this._listeners) {
        this._options?.onWillAddFirstListener?.(this)
        this._listeners = contained
        this._options?.onDidAddFirstListener?.(this)
      }
      else if (this._listeners instanceof UniqueContainer) {
        this._deliveryQueue ??= new EventDeliveryQueuePrivate()
        this._listeners = [this._listeners, contained]
      }
      else {
        this._listeners.push(contained)
      }
      this._size++
      const result = toDisposable(() => {
        this._removeListener(contained)
      })

      if (disposables instanceof DisposableStore) {
        disposables.add(result)
      }
      else if (Array.isArray(disposables)) {
        disposables.push(result)
      }
      return result
    }
    return this._event
  }

  private _removeListener(listener: ListenerContainer<T>) {
    this._options?.onWillRemoveListener?.(this)
    if (!this._listeners) {
      return // expected if a listener gets disposed
    }
    if (this._size === 1) {
      this._listeners = undefined
      this._options?.onDidRemoveLastListener?.(this)
      this._size = 0
      return
    }
    const listeners = this._listeners as (ListenerContainer<T> | undefined)[]

    const index = listeners.indexOf(listener)
    if (index === -1) {
      console.log('disposed?', this._disposed)
      console.log('size?', this._size)
      console.log('arr?', JSON.stringify(this._listeners))
      throw new Error('Attempted to dispose unknown listener')
    }
    this._size--
    listeners[index] = undefined
    const adjustDeliveryQueue = this._deliveryQueue!.current === this
    let n = 0
    for (let i = 0; i < listeners.length; i++) {
      if (listeners[i]) {
        listeners[n++] = listeners[i]
      }
      else if (adjustDeliveryQueue) {
        this._deliveryQueue!.end--
        if (n < this._deliveryQueue!.i) {
          this._deliveryQueue!.i--
        }
      }
    }
    listeners.length = n
  }

  dispose() {
    if (!this._disposed) {
      this._disposed = true
      if (this._deliveryQueue?.current === this) {
        this._deliveryQueue.reset()
      }
      if (this._listeners) {
        this._listeners = undefined
        this._size = 0
      }
      this._options?.onDidRemoveLastListener?.()
    }
  }
}

export interface NodeEventEmitter {
  on: (event: string, listener: any) => unknown
  removeListener: (event: string, listener: any) => unknown
}
export class Relay<T> implements IDisposable {
  private listening = false
  private inputEvent: Event<T> = Event.None
  private inputEventListener: IDisposable = Disposable.None

  private readonly emitter = new Emitter<T>({
    onDidAddFirstListener: () => {
      this.listening = true
      this.inputEventListener = this.inputEvent(this.emitter.fire, this.emitter)
    },
    onDidRemoveLastListener: () => {
      this.listening = false
      this.inputEventListener.dispose()
    },
  })

  readonly event: Event<T> = this.emitter.event

  set input(event: Event<T>) {
    this.inputEvent = event

    if (this.listening) {
      this.inputEventListener.dispose()
      this.inputEventListener = event(this.emitter.fire, this.emitter)
    }
  }

  dispose() {
    this.inputEventListener.dispose()
    this.emitter.dispose()
  }
}
export class EventMultiplexer<T> implements IDisposable {
  private readonly emitter: Emitter<T>
  private hasListeners = false
  private events: { event: Event<T>, listener: IDisposable | null }[] = []

  constructor() {
    this.emitter = new Emitter<T>({
      onWillAddFirstListener: () => this.onFirstListenerAdd(),
      onDidRemoveLastListener: () => this.onLastListenerRemove(),
    })
  }

  get event(): Event<T> {
    return this.emitter.event
  }

  add(event: Event<T>): IDisposable {
    const e = { event, listener: null }
    this.events.push(e)

    if (this.hasListeners) {
      this.hook(e)
    }

    const dispose = () => {
      if (this.hasListeners) {
        this.unhook(e)
      }

      const idx = this.events.indexOf(e)
      this.events.splice(idx, 1)
    }

    return toDisposable(createSingleCallFunction(dispose))
  }

  private onFirstListenerAdd(): void {
    this.hasListeners = true
    this.events.forEach(e => this.hook(e))
  }

  private onLastListenerRemove(): void {
    this.hasListeners = false
    this.events.forEach(e => this.unhook(e))
  }

  private hook(e: { event: Event<T>, listener: IDisposable | null }): void {
    e.listener = e.event(r => this.emitter.fire(r))
  }

  private unhook(e: { event: Event<T>, listener: IDisposable | null }): void {
    e.listener?.dispose()
    e.listener = null
  }

  dispose(): void {
    this.emitter.dispose()

    for (const e of this.events) {
      e.listener?.dispose()
    }
    this.events = []
  }
}

export namespace Event {
  export function buffer<T>(event: Event<T>, flushAfterTimeout = false, _buffer: T[] = [], disposable?: DisposableStore): Event<T> {
    let buffer: T[] | null = _buffer.slice()

    let listener: IDisposable | null = event((e) => {
      if (buffer) {
        buffer.push(e)
      }
      else {
        emitter.fire(e)
      }
    })

    if (disposable) {
      disposable.add(listener)
    }

    const flush = () => {
      buffer?.forEach(e => emitter.fire(e))
      buffer = null
    }

    const emitter = new Emitter<T>({
      onWillAddFirstListener() {
        if (!listener) {
          listener = event(e => emitter.fire(e))
          if (disposable) {
            disposable.add(listener)
          }
        }
      },

      onDidAddFirstListener() {
        if (buffer) {
          if (flushAfterTimeout) {
            setTimeout(flush)
          }
          else {
            flush()
          }
        }
      },

      onDidRemoveLastListener() {
        if (listener) {
          listener.dispose()
        }
        listener = null
      },
    })

    if (disposable) {
      disposable.add(emitter)
    }

    return emitter.event
  }

  export const None: Event<any> = () => Disposable.None

  function snapshot<T>(event: Event<T>, disposable: DisposableStore | undefined): Event<T> {
    let listener: IDisposable | undefined

    const options: EmitterOptions | undefined = {
      onWillAddFirstListener() {
        listener = event(emitter.fire, emitter)
      },
      onDidRemoveLastListener() {
        listener?.dispose()
      },
    }

    const emitter = new Emitter<T>(options)

    disposable?.add(emitter)

    return emitter.event
  }

  export function signal<T>(event: Event<T>): Event<void> {
    return event as Event<any> as Event<void>
  }
  export function filter<T>(event: Event<T>, filter: (e: T) => boolean, disposable?: DisposableStore): Event<T> {
    return snapshot((listener, thisArgs = null, disposables?) => event(e => filter(e) && listener.call(thisArgs, e), null, disposables), disposable)
  }
  export function any<T>(...events: Event<T>[]): Event<T> {
    return (listener, thisArgs = null, disposables?) => {
      const disposable = combinedDisposable(...events.map(event => event(e => listener.call(thisArgs, e))))
      return addAndReturnDisposable(disposable, disposables)
    }
  }

  export function map<I, O>(event: Event<I>, map: (i: I) => O, disposable?: DisposableStore): Event<O> {
    return snapshot((listener, thisArgs = null, disposables?) => event(i => listener.call(thisArgs, map(i)), null, disposables), disposable)
  }
  export function once<T>(event: Event<T>): Event<T> {
    return (listener, thisArgs = null, disposables?) => {
      // we need this, in case the event fires during the listener call
      let didFire = false
      const result = event((e) => {
        if (didFire) {
          return
        }
        else if (result) {
          result.dispose()
        }
        else {
          didFire = true
        }

        return listener.call(thisArgs, e)
      }, null, disposables)

      if (didFire) {
        result.dispose()
      }

      return result
    }
  }
  export function toPromise<T>(event: Event<T>): Promise<T> {
    return new Promise(resolve => once(event)(resolve))
  }
  export function fromNodeEventEmitter<T>(emitter: NodeEventEmitter, eventName: string, map: (...args: any[]) => T = id => id): Event<T> {
    const fn = (...args: any[]) => result.fire(map(...args))
    const onFirstListenerAdd = () => emitter.on(eventName, fn)
    const onLastListenerRemove = () => emitter.removeListener(eventName, fn)
    const result = new Emitter<T>({ onWillAddFirstListener: onFirstListenerAdd, onDidRemoveLastListener: onLastListenerRemove })

    return result.event
  }

}
