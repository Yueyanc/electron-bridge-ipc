import type { Event } from '../common/event'

interface IpcRendererEvent extends Event<any> {
  sender: IpcRenderer
}
export interface IpcRenderer {
  invoke: (channel: string, ...args: any[]) => Promise<any>
  send: (channel: string, ...args: any[]) => void
  removeListener: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => this
  on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => this
}

const bridge = globalThis?.__el_bridge
export const ipcRenderer: IpcRenderer = bridge?.ipcRenderer
