import { CharCode } from './utils/charCode'
import type { DisposableStore, IDisposable } from './utils/Disposable'
import { Event as EventType } from './event'
import type { IChannel, IServerChannel } from './ipc'
import { ELBuffer } from './utils/buffer'

function isUpperAsciiLetter(code: number): boolean {
  return code >= CharCode.A && code <= CharCode.Z
}
interface Event<T> {
  (listener: (e: T) => any, thisArgs?: any, disposables?: IDisposable[] | DisposableStore): IDisposable
}
enum MarshalledId {
  Uri = 1,
  Regexp,
  ScmResource,
  ScmResourceGroup,
  ScmProvider,
  CommentController,
  CommentThread,
  CommentThreadInstance,
  CommentThreadReply,
  CommentNode,
  CommentThreadNode,
  TimelineActionContext,
  NotebookCellActionContext,
  NotebookActionContext,
  TerminalContext,
  TestItemContext,
  Date,
  TestMessageMenuArgs,
}
interface UriComponents {
  scheme: string
  authority?: string
  path?: string
  query?: string
  fragment?: string
}
interface MarshalledObject {
  $mid: MarshalledId
}
type Deserialize<T> = T extends UriComponents ? any
  : T extends ELBuffer ? ELBuffer
    : T extends object
      ? Revived<T>
      : T

export type Revived<T> = { [K in keyof T]: Deserialize<T[K]> }
export function revive<T = any>(obj: any, depth = 0): Revived<T> {
  if (!obj || depth > 200) {
    return obj
  }

  if (typeof obj === 'object') {
    switch ((<MarshalledObject>obj).$mid) {
      case MarshalledId.Regexp: return <any> new RegExp(obj.source, obj.flags)
      case MarshalledId.Date: return <any> new Date(obj.source)
    }

    if (
      obj instanceof ELBuffer
      || obj instanceof Uint8Array
    ) {
      return <any>obj
    }

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; ++i) {
        obj[i] = revive(obj[i], depth + 1)
      }
    }
    else {
      // walk object
      for (const key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) {
          obj[key] = revive(obj[key], depth + 1)
        }
      }
    }
  }

  return obj
}
export interface ICreateProxyServiceOptions {
  properties?: Map<string, unknown>
}
export namespace ProxyChannel {
  export interface IProxyOptions {
    disableMarshalling?: boolean
  }
  export interface ICreateServiceChannelOptions extends IProxyOptions { }
  function propertyIsDynamicEvent(name: string): boolean {
    // Assume a property is a dynamic event (a method that returns an event) if it has a form of "onDynamicSomething"
    return name.startsWith('onDynamic') && isUpperAsciiLetter(name.charCodeAt(9))
  }
  function propertyIsEvent(name: string): boolean {
    // Assume a property is an event if it has a form of "onSomething"
    return name[0] === 'o' && name[1] === 'n' && isUpperAsciiLetter(name.charCodeAt(2))
  }
  export function fromService<TContext>(service: unknown, disposables: DisposableStore, options?: ICreateServiceChannelOptions): IServerChannel<TContext> {
    const handler = service as { [key: string]: unknown }
    const disableMarshalling = options && options.disableMarshalling

    // Buffer any event that should be supported by
    // iterating over all property keys and finding them
    // However, this will not work for services that
    // are lazy and use a Proxy within. For that we
    // still need to check later (see below).
    const mapEventNameToEvent = new Map<string, Event<unknown>>()
    for (const key in handler) {
      if (propertyIsEvent(key)) {
        mapEventNameToEvent.set(key, EventType.buffer(handler[key] as Event<unknown>, true, undefined, disposables))
      }
    }

    return new class implements IServerChannel {
      listen<T>(_: unknown, event: string, arg: any): Event<T> {
        const eventImpl = mapEventNameToEvent.get(event)
        if (eventImpl) {
          return eventImpl as Event<T>
        }

        const target = handler[event]
        if (typeof target === 'function') {
          if (propertyIsDynamicEvent(event)) {
            return target.call(handler, arg)
          }

          if (propertyIsEvent(event)) {
            mapEventNameToEvent.set(event, EventType.buffer(handler[event] as Event<unknown>, true, undefined, disposables))

            return mapEventNameToEvent.get(event) as Event<T>
          }
        }

        throw new Error(`Event not found: ${event}`)
      }

      call(_: unknown, command: string, args?: any[]): Promise<any> {
        const target = handler[command]
        if (typeof target === 'function') {
          // Revive unless marshalling disabled
          if (!disableMarshalling && Array.isArray(args)) {
            for (let i = 0; i < args.length; i++) {
              args[i] = revive(args[i])
            }
          }

          let res = target.apply(handler, args)
          if (!(res instanceof Promise)) {
            res = Promise.resolve(res)
          }
          return res
        }

        throw new Error(`Method not found: ${command}`)
      }
    }()
  }
  export function toService<T extends object>(channel: IChannel, options?: ICreateProxyServiceOptions): T {
    return new Proxy({}, {
      get(_target: T, propKey: PropertyKey) {
        if (typeof propKey === 'string') {
          if (options?.properties?.has(propKey)) {
            return options.properties.get(propKey)
          }
          return async function (...args: any[]) {
            const result = await channel.call(propKey, args)
            return result
          }
        }
        throw new Error(`Property not found: ${String(propKey)}`)
      },
    }) as T
  }
}
