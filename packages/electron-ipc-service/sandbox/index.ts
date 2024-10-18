import { Subject, tap } from 'rxjs'
import { Protocol } from '../common'
import { ipcRenderer } from './ipcRenderer'

class RendererProtocol extends Protocol {
  onMessage = new Subject<any>()
  constructor() {
    super()
    ipcRenderer.on('_ipc:message', (message) => {
      this.onMessage.next(message)
    })
  }
}

export class Client {
  constructor(private protocol: RendererProtocol) {
    this.protocol.send('_ipc:hello')
    this.protocol.onMessage.pipe(tap((value) => {
      this.onResponseMessage(value)
    })).subscribe()
  }

  onResponseMessage(message: any) {
    console.log(message)
  }
}
