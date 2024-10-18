import type { IpcRenderer } from './ipcRenderer'

declare global {
  interface Window {
    ipcRenderer: IpcRenderer
  }
}
