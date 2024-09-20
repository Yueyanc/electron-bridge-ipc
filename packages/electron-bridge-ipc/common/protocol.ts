import type { ELBuffer } from './utils/buffer'
import type { Event } from './event'

export interface IMessagePassingProtocol {
  send: (buffer: ELBuffer) => void
  onMessage: Event<ELBuffer>
}
export interface Sender {
  send: (channel: string, msg: unknown) => void
}
export class Protocol implements IMessagePassingProtocol {
  constructor(private sender: Sender, readonly onMessage: Event<ELBuffer>) { }

  send(message: ELBuffer): void {
    try {
      this.sender.send('_ipc:message', message.buffer)
    }
    catch (e) {
      // systems are going down
    }
  }

  disconnect(): void {
    this.sender.send('_ipc:disconnect', null)
  }
}
