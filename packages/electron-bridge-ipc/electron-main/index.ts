import { BrowserWindow, ipcMain } from 'electron'
import { Server } from './ipc'

export function createServer() {
  ipcMain.handle('_ipc:get-context', ({ sender }) => {
    const windowId = BrowserWindow.fromId(sender.id)?.id
    return windowId
  })

  return new Server()
}
