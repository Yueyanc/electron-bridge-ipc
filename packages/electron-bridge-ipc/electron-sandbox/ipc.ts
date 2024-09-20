import { IPCClient } from '../common/ipc'
import { Protocol } from '../common/protocol'
import { ELBuffer } from '../common/utils/buffer'
import type { IDisposable } from '../common/utils/Disposable'
import { Event } from '../common/event'
import { ipcRenderer } from './globals'

export class Client extends IPCClient implements IDisposable {
  private protocol: Protocol

  private static createProtocol(): Protocol {
    const onMessage = Event.fromNodeEventEmitter<ELBuffer>(ipcRenderer, '_ipc:message', (_, message) => ELBuffer.wrap(message))
    ipcRenderer.send('_ipc:hello')

    return new Protocol(ipcRenderer, onMessage)
  }

  constructor(id: string) {
    const protocol = Client.createProtocol()
    super(protocol, id)

    this.protocol = protocol
  }

  override dispose(): void {
    this.protocol.disconnect()
    super.dispose()
  }
}
