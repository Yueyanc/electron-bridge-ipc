import { webContents, ipcMain } from 'electron'
import { Server } from './ipc'

export function createServer() {
  ipcMain.handle('_ipc:get-context', ({ sender }) => {
    const windowId = webContents.fromId(sender.id)?.id
    return windowId
  })

  return new Server()
}
