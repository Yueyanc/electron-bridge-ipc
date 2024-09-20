import type { CancelablePromise } from './cancellation'
import { CancellationError, CancellationToken, createCancelablePromise } from './cancellation'
import { Emitter, Event, EventMultiplexer, Relay } from './event'
import type { IMessagePassingProtocol } from './protocol'
import { BufferReader, BufferWriter, type ELBuffer, deserialize, serialize } from './utils/buffer'
import { DisposableStore, type IDisposable, combinedDisposable, dispose, toDisposable } from './utils/Disposable'
import { isFunction } from './utils/types'

export interface IChannel {
  call: <T>(command: string, arg?: any, cancellationToken?: CancellationToken) => Promise<T>
  listen: <T>(event: string, arg?: any) => Event<T>
}

export interface IServerChannel<TContext = string> {
  call: <T>(ctx: TContext, command: string, arg?: any, cancellationToken?: CancellationToken) => Promise<T>
  listen: <T>(ctx: TContext, event: string, arg?: any) => Event<T>
}

enum State {
  Uninitialized,
  Idle,
}

interface IHandler {
  (response: IRawResponse): void
}

enum RequestType {
  Promise = 100,
  PromiseCancel = 101,
  EventListen = 102,
  EventDispose = 103,
}
interface IRawPromiseRequest { type: RequestType.Promise, id: number, channelName: string, name: string, arg: any }
interface IRawPromiseCancelRequest { type: RequestType.PromiseCancel, id: number }
interface IRawEventListenRequest { type: RequestType.EventListen, id: number, channelName: string, name: string, arg: any }
interface IRawEventDisposeRequest { type: RequestType.EventDispose, id: number }
type IRawRequest = IRawPromiseRequest | IRawPromiseCancelRequest | IRawEventListenRequest | IRawEventDisposeRequest
class ChannelClient implements IDisposable {
  private protocolListener: IDisposable | null
  private state: State = State.Uninitialized
  private activeRequests = new Set<IDisposable>()
  private lastRequestId: number = 0
  private handlers = new Map<number, IHandler>()
  private readonly _onDidInitialize = new Emitter<void>()
  private isDisposed: boolean = false
  readonly onDidInitialize = this._onDidInitialize.event
  constructor(private protocol: IMessagePassingProtocol) {
    this.protocolListener = this.protocol.onMessage(msg => this.onBuffer(msg))
  }

  getChannel<T extends IChannel>(channelName: string): T {
    const that = this

    return {
      call(command: string, arg?: any, cancellationToken?: CancellationToken) {
        if (that.isDisposed) {
          return Promise.reject(new CancellationError())
        }
        return that.requestPromise(channelName, command, arg, cancellationToken)
      },
      listen(event: string, arg: any) {
        if (that.isDisposed) {
          return Event.None
        }
        return that.requestEvent(channelName, event, arg)
      },
    } as T
  }

  private requestEvent(channelName: string, name: string, arg?: any): Event<any> {
    const id = this.lastRequestId++
    const type = RequestType.EventListen
    const request: IRawRequest = { id, type, channelName, name, arg }

    let uninitializedPromise: CancelablePromise<void> | null = null

    const emitter = new Emitter<any>({
      onWillAddFirstListener: () => {
        uninitializedPromise = createCancelablePromise(_ => this.whenInitialized())
        uninitializedPromise.then(() => {
          uninitializedPromise = null
          this.activeRequests.add(emitter)
          this.sendRequest(request)
        })
      },
      onDidRemoveLastListener: () => {
        if (uninitializedPromise) {
          uninitializedPromise.cancel()
          uninitializedPromise = null
        }
        else {
          this.activeRequests.delete(emitter)
          this.sendRequest({ id, type: RequestType.EventDispose })
        }
      },
    })

    const handler: IHandler = (res: IRawResponse) => emitter.fire((res as IRawEventFireResponse).data)
    this.handlers.set(id, handler)

    return emitter.event
  }

  get onDidInitializePromise(): Promise<void> {
    return Event.toPromise(this.onDidInitialize)
  }

  private whenInitialized(): Promise<void> {
    if (this.state === State.Idle) {
      return Promise.resolve()
    }
    else {
      return this.onDidInitializePromise
    }
  }

  private requestPromise(channelName: string, name: string, arg?: any, cancellationToken = CancellationToken.None): Promise<any> {
    const id = this.lastRequestId++
    const type = RequestType.Promise
    const request: IRawRequest = { id, type, channelName, name, arg }

    if (cancellationToken.isCancellationRequested) {
      return Promise.reject(new CancellationError())
    }

    let disposable: IDisposable

    const result = new Promise((c, e) => {
      if (cancellationToken.isCancellationRequested) {
        return e(new CancellationError())
      }

      const doRequest = () => {
        const handler: IHandler = (response) => {
          switch (response.type) {
            case ResponseType.PromiseSuccess:
              this.handlers.delete(id)
              c(response.data)
              break

            case ResponseType.PromiseError: {
              this.handlers.delete(id)
              const error = new Error(response.data.message);
              (<any>error).stack = Array.isArray(response.data.stack) ? response.data.stack.join('\n') : response.data.stack
              error.name = response.data.name
              e(error)
              break
            }
            case ResponseType.PromiseErrorObj:
              this.handlers.delete(id)
              e(response.data)
              break
          }
        }

        this.handlers.set(id, handler)
        this.sendRequest(request)
      }

      let uninitializedPromise: CancelablePromise<void> | null = null
      if (this.state === State.Idle) {
        doRequest()
      }
      else {
        uninitializedPromise = createCancelablePromise(_ => this.whenInitialized())
        uninitializedPromise.then(() => {
          uninitializedPromise = null
          doRequest()
        })
      }

      const cancel = () => {
        if (uninitializedPromise) {
          uninitializedPromise.cancel()
          uninitializedPromise = null
        }
        else {
          this.sendRequest({ id, type: RequestType.PromiseCancel })
        }

        e(new CancellationError())
      }

      const cancellationTokenListener = cancellationToken.onCancellationRequested(cancel)
      disposable = combinedDisposable(toDisposable(cancel), cancellationTokenListener)
      this.activeRequests.add(disposable)
    })

    return result.finally(() => {
      disposable.dispose()
      this.activeRequests.delete(disposable)
    })
  }

  private sendRequest(request: IRawRequest): void {
    switch (request.type) {
      case RequestType.Promise:
      case RequestType.EventListen: {
        this.send([request.type, request.id, request.channelName, request.name], request.arg)
        return
      }

      case RequestType.PromiseCancel:
      case RequestType.EventDispose: {
        this.send([request.type, request.id])
      }
    }
  }

  private send(header: any, body: any = undefined): number {
    const writer = new BufferWriter()
    serialize(writer, header)
    serialize(writer, body)
    return this.sendBuffer(writer.buffer)
  }

  private sendBuffer(message: ELBuffer): number {
    try {
      this.protocol.send(message)
      return message.byteLength
    }
    catch (err) {
      // noop
      return 0
    }
  }

  onBuffer(msg: ELBuffer) {
    const reader = new BufferReader(msg)
    const header = deserialize(reader)
    const body = deserialize(reader)
    const type: ResponseType = header[0]

    switch (type) {
      case ResponseType.Initialize:
        return this.onResponse({ type: header[0] })
      case ResponseType.PromiseSuccess:
      case ResponseType.PromiseError:
      case ResponseType.EventFire:
      case ResponseType.PromiseErrorObj:
        this.onResponse({ type: header[0], id: header[1], data: body })
    }
  }

  onResponse(response: IRawResponse) {
    if (response.type === ResponseType.Initialize) {
      this.state = State.Idle
      this._onDidInitialize.fire()
      return
    }

    const handler = this.handlers.get(response.id)

    handler?.(response)
  }

  dispose(): void {
    this.isDisposed = true
    if (this.protocolListener) {
      this.protocolListener.dispose()
      this.protocolListener = null
    }
    dispose(this.activeRequests.values())
    this.activeRequests.clear()
  }
}
export function getRandomElement<T>(arr: T[]): T | undefined {
  return arr[Math.floor(Math.random() * arr.length)]
}
enum ResponseType {
  Initialize = 200,
  PromiseSuccess = 201,
  PromiseError = 202,
  PromiseErrorObj = 203,
  EventFire = 204,
}
interface IRawInitializeResponse { type: ResponseType.Initialize }
interface IRawPromiseSuccessResponse { type: ResponseType.PromiseSuccess, id: number, data: any }
interface IRawPromiseErrorResponse { type: ResponseType.PromiseError, id: number, data: { message: string, name: string, stack: string[] | undefined } }
interface IRawPromiseErrorObjResponse { type: ResponseType.PromiseErrorObj, id: number, data: any }
interface IRawEventFireResponse { type: ResponseType.EventFire, id: number, data: any }
type IRawResponse = IRawInitializeResponse | IRawPromiseSuccessResponse | IRawPromiseErrorResponse | IRawPromiseErrorObjResponse | IRawEventFireResponse
export interface IChannelServer<TContext = string> {
  registerChannel: (channelName: string, channel: IServerChannel<TContext>) => void
}

class ChannelServer<TContext = string> implements IChannelServer<TContext>, IDisposable {
  channels = new Map<string, IServerChannel<TContext>>()
  private protocolListener: IDisposable | null
  private activeRequests = new Map<number, IDisposable>()
  constructor(private protocol: IMessagePassingProtocol, private ctx: any) {
    this.protocolListener = this.protocol.onMessage(msg => this.onRawMessage(msg))
    this.sendResponse({ type: ResponseType.Initialize })
  }

  onRawMessage(msg: ELBuffer) {
    const reader = new BufferReader(msg)

    const header = deserialize(reader)
    const body = deserialize(reader)
    const type = header[0] as RequestType

    switch (type as RequestType) {
      case RequestType.Promise:
        return this.onPromise({ type: RequestType.Promise, id: header[1], channelName: header[2], name: header[3], arg: body })
    }
  }

  private onPromise(request: IRawPromiseRequest): void {
    const channel = this.channels.get(request.channelName)
    if (!channel) {
      return
    }
    let promise: Promise<any>
    try {
      promise = channel.call(this.ctx, request.name, request.arg)
    }
    catch (e) {
      promise = Promise.reject(e)
    }
    const id = request.id

    promise.then((data) => {
      this.sendResponse({ id, data, type: ResponseType.PromiseSuccess })
    }, (err) => {
      if (err instanceof Error) {
        this.sendResponse({
          id,
          data: {
            message: err.message,
            name: err.name,
            stack: err.stack ? err.stack.split('\n') : undefined,
          },
          type: ResponseType.PromiseError,
        })
      }
      else {
        this.sendResponse({ id, data: err, type: ResponseType.PromiseErrorObj })
      }
    }).finally(() => {
      this.activeRequests.delete(request.id)
    })
    const disposable = toDisposable(() => {})
    this.activeRequests.set(request.id, disposable)
  }

  private sendResponse(response: IRawResponse): void {
    switch (response.type) {
      case ResponseType.Initialize: {
        const msgLength = this.send([response.type])
        return
      }

      case ResponseType.PromiseSuccess:
      case ResponseType.PromiseError:
      case ResponseType.EventFire:
      case ResponseType.PromiseErrorObj: {
        const msgLength = this.send([response.type, response.id], response.data)
      }
    }
  }

  private send(header: any, body: any = undefined): number {
    const writer = new BufferWriter()
    serialize(writer, header)
    serialize(writer, body)
    return this.sendBuffer(writer.buffer)
  }

  private sendBuffer(message: ELBuffer): number {
    try {
      this.protocol.send(message)
      return message.byteLength
    }
    catch (err) {
      // noop
      return 0
    }
  }

  registerChannel(channelName: string, channel: IServerChannel<TContext>) {
    this.channels.set(channelName, channel)
  }

  public dispose(): void {
    if (this.protocolListener) {
      this.protocolListener.dispose()
      this.protocolListener = null
    }
    dispose(this.activeRequests.values())
    this.activeRequests.clear()
  }
}
class Connection<TContext = string> {
  channelServer: ChannelServer<TContext>
  channelClient: ChannelClient
  readonly ctx: TContext
}
export class IPCClient<TContext = string> implements IDisposable {
  private channelClient: ChannelClient
  private channelServer: ChannelServer
  constructor(protocol: IMessagePassingProtocol, ctx: TContext) {
    const writer = new BufferWriter()
    serialize(writer, ctx)
    protocol.send(writer.buffer)

    this.channelClient = new ChannelClient(protocol)
    this.channelServer = new ChannelServer(protocol, ctx)
  }

  getChannels() {

  }

  getChannel<T extends IChannel>(channelName: string): T {
    return this.channelClient.getChannel(channelName) as T
  }

  registerChannel(channelName: string, channel: IServerChannel<string>): void {
    this.channelServer.registerChannel(channelName, channel)
  }

  dispose(): void {
    this.channelClient.dispose()
    this.channelServer.dispose()
  }
}

export interface ClientConnectionEvent {
  protocol: IMessagePassingProtocol
  onDidClientDisconnect: Event<void>
}
export interface Client<TContext> {
  readonly ctx: TContext
}
export interface IConnectionHub<TContext> {
  readonly connections: Connection<TContext>[]
  readonly onDidAddConnection: Event<Connection<TContext>>
  readonly onDidRemoveConnection: Event<Connection<TContext>>
}
export interface IClientRouter<TContext = string> {
  routeCall: (hub: IConnectionHub<TContext>, command: string, arg?: any, cancellationToken?: CancellationToken) => Promise<Client<TContext>>
  routeEvent: (hub: IConnectionHub<TContext>, event: string, arg?: any) => Promise<Client<TContext>>
}
export function getDelayedChannel<T extends IChannel>(promise: Promise<T>): T {
  return {
    call(command: string, arg?: any, cancellationToken?: CancellationToken): Promise<T> {
      return promise.then(c => c.call<T>(command, arg, cancellationToken))
    },

    listen<T>(event: string, arg?: any): Event<T> {
      const relay = new Relay<any>()
      promise.then(c => relay.input = c.listen(event, arg))
      return relay.event
    },
  } as T
}

export class IPCServer<TContext extends string = string> {
  private channels = new Map<string, IServerChannel<TContext>>()
  private _connections = new Set<Connection<TContext>>()

  private readonly _onDidAddConnection = new Emitter<Connection<TContext>>()
  readonly onDidAddConnection: Event<Connection<TContext>> = this._onDidAddConnection.event

  private readonly _onDidRemoveConnection = new Emitter<Connection<TContext>>()
  readonly onDidRemoveConnection: Event<Connection<TContext>> = this._onDidRemoveConnection.event

  private readonly disposables = new DisposableStore()

  get connections(): Connection<TContext>[] {
    const result: Connection<TContext>[] = []
    this._connections.forEach(ctx => result.push(ctx))
    return result
  }

  constructor(onDidClientConnect: Event<ClientConnectionEvent>) {
    this.disposables.add(onDidClientConnect(({ protocol, onDidClientDisconnect }) => {
      const onFirstMessage = Event.once(protocol.onMessage)

      this.disposables.add(onFirstMessage((msg) => {
        const reader = new BufferReader(msg)
        const ctx = deserialize(reader) as TContext

        const channelServer = new ChannelServer<TContext>(protocol, ctx)
        const channelClient = new ChannelClient(protocol)

        this.channels.forEach((channel, name) => channelServer.registerChannel(name, channel))

        const connection: Connection<TContext> = { channelServer, channelClient, ctx }
        this._connections.add(connection)
        this._onDidAddConnection.fire(connection)

        this.disposables.add(onDidClientDisconnect(() => {
          channelServer.dispose()
          channelClient.dispose()
          this._connections.delete(connection)
          this._onDidRemoveConnection.fire(connection)
        }))
      }))
    }))
  }

  getChannel<T extends IChannel>(channelName: string, routerOrClientFilter: IClientRouter<TContext> | ((client: Client<TContext>) => boolean)): T {
    const that = this

    return {
      call(command: string, arg?: any, cancellationToken?: CancellationToken): Promise<T> {
        let connectionPromise: Promise<Client<TContext>>

        if (isFunction(routerOrClientFilter)) {
          // when no router is provided, we go random client picking
          const connection = getRandomElement(that.connections.filter(routerOrClientFilter))

          connectionPromise = connection
          // if we found a client, let's call on it
            ? Promise.resolve(connection)
          // else, let's wait for a client to come along
            : Event.toPromise(Event.filter(that.onDidAddConnection, routerOrClientFilter))
        }
        else {
          connectionPromise = routerOrClientFilter.routeCall(that, command, arg)
        }

        const channelPromise = connectionPromise
          .then(connection => (connection as Connection<TContext>).channelClient.getChannel(channelName))

        return getDelayedChannel(channelPromise)
          .call(command, arg, cancellationToken)
      },
      listen(event: string, arg: any): Event<T> {
        if (isFunction(routerOrClientFilter)) {
          return that.getMulticastEvent(channelName, routerOrClientFilter, event, arg)
        }

        const channelPromise = routerOrClientFilter.routeEvent(that, event, arg)
          .then(connection => (connection as Connection<TContext>).channelClient.getChannel(channelName))

        return getDelayedChannel(channelPromise)
          .listen(event, arg)
      },
    } as T
  }

  private getMulticastEvent<T extends IChannel>(channelName: string, clientFilter: (client: Client<TContext>) => boolean, eventName: string, arg: any): Event<T> {
    const that = this
    let disposables: DisposableStore | undefined

    // Create an emitter which hooks up to all clients
    // as soon as first listener is added. It also
    // disconnects from all clients as soon as the last listener
    // is removed.
    const emitter = new Emitter<T>({
      onWillAddFirstListener: () => {
        disposables = new DisposableStore()

        // The event multiplexer is useful since the active
        // client list is dynamic. We need to hook up and disconnection
        // to/from clients as they come and go.
        const eventMultiplexer = new EventMultiplexer<T>()
        const map = new Map<Connection<TContext>, IDisposable>()

        const onDidAddConnection = (connection: Connection<TContext>) => {
          const channel = connection.channelClient.getChannel(channelName)
          const event = channel.listen<T>(eventName, arg)
          const disposable = eventMultiplexer.add(event)

          map.set(connection, disposable)
        }

        const onDidRemoveConnection = (connection: Connection<TContext>) => {
          const disposable = map.get(connection)

          if (!disposable) {
            return
          }

          disposable.dispose()
          map.delete(connection)
        }

        that.connections.filter(clientFilter).forEach(onDidAddConnection)
        Event.filter(that.onDidAddConnection, clientFilter)(onDidAddConnection, undefined, disposables)
        that.onDidRemoveConnection(onDidRemoveConnection, undefined, disposables)
        eventMultiplexer.event(emitter.fire, emitter, disposables)

        disposables.add(eventMultiplexer)
      },
      onDidRemoveLastListener: () => {
        disposables?.dispose()
        disposables = undefined
      },
    })

    return emitter.event
  }

  registerChannel(channelName: string, channel: IServerChannel<TContext>): void {
    this.channels.set(channelName, channel)

    for (const connection of this._connections) {
      connection.channelServer.registerChannel(channelName, channel)
    }
  }

  dispose(): void {
    this.disposables.dispose()

    for (const connection of this._connections) {
      connection.channelClient.dispose()
      connection.channelServer.dispose()
    }

    this._connections.clear()
    this.channels.clear()
    this._onDidAddConnection.dispose()
    this._onDidRemoveConnection.dispose()
  }
}
