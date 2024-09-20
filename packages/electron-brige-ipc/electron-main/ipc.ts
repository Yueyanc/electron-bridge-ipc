import type { WebContents } from 'electron'
import { ipcMain } from 'electron'
import type { ClientConnectionEvent } from '../common/ipc'
import { IPCServer } from '../common/ipc'
import { type IDisposable, toDisposable } from '../common/utils/Disposable'
import { Emitter, Event } from '../common/event'
import { ELBuffer } from '../common/utils/buffer'
import { Protocol as ElectronProtocol } from '../common/protocol'

interface IIPCEvent {
  event: { sender: WebContents }
  message: ELBuffer | null
}
function createScopedOnMessageEvent(senderId: number, eventName: string): Event<ELBuffer | null> {
  const onMessage = Event.fromNodeEventEmitter<IIPCEvent>(ipcMain, eventName, (event, message) => ({ event, message }))
  const onMessageFromSender = Event.filter(onMessage, ({ event }) => event.sender.id === senderId)
  // TODO: fix this
  // @ts-ignore
  return Event.map(onMessageFromSender, ({ message }) => message ? ELBuffer.wrap(message) : message)
}

export class Server extends IPCServer {
  private static readonly Clients = new Map<number, IDisposable>()
  private static getOnDidClientConnect(): Event<ClientConnectionEvent> {
    const onHello = Event.fromNodeEventEmitter<WebContents>(ipcMain, '_ipc:hello', ({ sender }) => sender)

    return Event.map(onHello, (webContents) => {
      const id = webContents.id
      const client = Server.Clients.get(id)

      client?.dispose()

      const onDidClientReconnect = new Emitter<void>()
      Server.Clients.set(id, toDisposable(() => onDidClientReconnect.fire()))

      const onMessage = createScopedOnMessageEvent(id, '_ipc:message') as Event<ELBuffer>
      const onDidClientDisconnect = Event.any(Event.signal(createScopedOnMessageEvent(id, '_ipc:disconnect')), onDidClientReconnect.event)
      const protocol = new ElectronProtocol(webContents, onMessage)

      return { protocol, onDidClientDisconnect }
    })
  }

  constructor() {
    super(Server.getOnDidClientConnect())
  }
}
