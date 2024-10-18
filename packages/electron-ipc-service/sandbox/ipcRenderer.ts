interface IpcRendererEvent {
  sender: IpcRenderer
}

export interface IpcRenderer {
  invoke: (channel: string, ...args: any[]) => Promise<any>
  send: (channel: string, ...args: any[]) => void
  removeListener: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => this
  on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => this
}

const bridge = globalThis.ipcRenderer
export const ipcRenderer: IpcRenderer = bridge.ipcRenderer
